let previousVideo = null;
let previousTitle = null;
let previousTimer = null;

const videoObserver = new MutationObserver(() => {
  const video = document.querySelector("video");

  if (video === null || video === undefined) {
    return;
  }

  const title = getTitleNode();

  if (title === null || title === undefined) {
    return;
  }

  if (previousTitle === null || previousTitle !== title.textContent || previousVideo !== video) {
    previousTitle = title.textContent;
    previousVideo = video;

    blockVideo(video);

    clearTimeout(previousTimer);
    previousTimer = setTimeout(() => tryRemoveBlocker(video), 250);
  }
});

videoObserver.observe(document.documentElement, { childList: true, subtree: true });

function blockVideo(video) {
  pauseVideo.call(video);

  video.addEventListener("play", pauseVideo, true);
  video.addEventListener("playing", pauseVideo, true);
}

function pauseVideo() {
  this.pause();
  this.muted = true;
}

function getTitleNode() {
  return document.querySelector("ytd-watch-metadata #title h1 yt-formatted-string");
}

async function tryRemoveBlocker(video) {
  if (video !== previousVideo) {
    return;
  }

  if (await isBlockedVideo()) {
    return;
  }

  video.removeEventListener("play", pauseVideo, true);
  video.removeEventListener("playing", pauseVideo, true);
  video.muted = false;
}

async function isBlockedVideo() {
  const { blocklist } = await browser.storage.local.get("blocklist");

  if (blocklist === null || blocklist === undefined) {
    return false;
  }

  if (Array.isArray(blocklist.keywords)) {
    const videoTitle = getCurrentVideoTitle();
    const isTitleBad = blocklist.keywords.some(x => videoTitle.includes(x));

    if (isTitleBad) {
      return true;
    }
  }

  if (Array.isArray(blocklist.channels)) {
    const channelHandle = getChannelHandle();
    const isChannelBad = channelHandle !== null && blocklist.channels.some(x => x === channelHandle);

    if (isChannelBad) {
      return true;
    }
  }

  return false;
}

function getChannelHandle() {
  const channelLink = document.querySelector('ytd-channel-name a[href^="/@"]');

  if (channelLink !== null && channelLink !== undefined) {
    const href = channelLink.getAttribute("href") || "";
    const m = href.match(/\/@([^\/\?]+)/);
    return m ? m[1].toLowerCase() : null;
  }

  const url = location.href;
  const match = url.match(/\/@([^\/\?]+)/);
  return match ? match[1].toLowerCase() : null;
}

function getCurrentVideoTitle() {
  const title = getTitleNode();

  return title?.textContent.toLowerCase() || "";
}

