// YouTube Safe Redirect - content script (Manifest V3)

const BLOCKED_KEYWORDS = [
  "elon",
  "elon musk",
  "heal you",
  "holy spirit", 
  "archangel michael",
  "you have been selected",
  "god says",
  "god message",
  "god's",
  "demon",
  "chosen one",
  "divine message",
  "god told me",
  "angels told me",
  "prophecy",
  "revelation",
  "urgent",
  "claim now",
  "cheque",
  "check",
].map(s => s.toLowerCase());

const BLOCKED_CHANNEL_HANDLES = [
  "GodsMessageNow",
  "ArchangelMichaelSay",
].map(s => s.toLowerCase());

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

function tryRemoveBlocker(video) {
  if (video !== previousVideo) {
    return;
  }

  // TODO: Maybe add an overlay that explains the content is blocked.
  if (isBlockedVideo()) {
    return;
  }

  video.removeEventListener("play", pauseVideo, true);
  video.removeEventListener("playing", pauseVideo, true);
  video.muted = false;
}

function isBlockedVideo() {
  const videoTitle = getCurrentVideoTitle();
  const isTitleBad = BLOCKED_KEYWORDS.some(x => videoTitle.includes(x));

  if (isTitleBad) {
    console.log("youtubeRedirect: title is bad: " + videoTitle);

    return true;
  }

  const channelHandle = getChannelHandle();
  const isChannelBad = channelHandle !== null && BLOCKED_CHANNEL_HANDLES.some(x => x === channelHandle);

  if (isChannelBad) {
    console.log("youtubeRedirect: Channel is bad: " + channelHandle);

    return true;
  }


  console.log("youtubeRedirect: Okay");
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

