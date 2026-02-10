import { MESSAGE_SEND_COMMAND_TO_MOVIE_PLAYER } from "./common/messages.js"

if (typeof browser === "undefined") {
  globalThis.browser = chrome;
}

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
  pauseAndMuteVideo.call(video);

  video.addEventListener("play", pauseAndMuteVideo, true);
  video.addEventListener("playing", pauseAndMuteVideo, true);
}

function pauseAndMuteVideo() {
  this.pause();
  sendCommandToMoviePlayer("mute").catch(() => debugLog("Unable to mute"));
}

async function sendCommandToMoviePlayer(command) {
  const result = await browser.runtime.sendMessage({
    type: MESSAGE_SEND_COMMAND_TO_MOVIE_PLAYER,
    payload: {
      command: command
    }
  });

  return result;
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

  video.removeEventListener("play", pauseAndMuteVideo, true);
  video.removeEventListener("playing", pauseAndMuteVideo, true);

  playAndUnmuteVideo();
}

async function isBlockedVideo() {
  const { blocklist } = await browser.storage.local.get(["blocklist"]);

  if (blocklist === null || blocklist === undefined) {
    debugLog({ isBlocked: false, reason: "No blocklist has been found" });

    return false;
  }

  if (Array.isArray(blocklist.keywords)) {
    const videoTitle = getCurrentVideoTitle();
    const isTitleBad = blocklist.keywords.some(x => videoTitle.includes(x));

    debugLog({ isBlocked: isTitleBad, reason: videoTitle });

    if (isTitleBad) {
      return true;
    }
  }

  if (Array.isArray(blocklist.channels)) {
    const channelHandle = getChannelIdentifier();
    const isChannelBad = channelHandle !== null && blocklist.channels.some(x => x === channelHandle);

    debugLog({ isBlocked: isChannelBad, reason: channelHandle });

    if (isChannelBad) {
      return true;
    }
  }

  return false;
}

async function debugLog(value) {
  const { isDebugMode } = await browser.storage.local.get("isDebugMode");

  if (isDebugMode) {
    console.debug("YPG: ", value);
  }
}

function getChannelIdentifier() {
  const link = document.querySelector('ytd-channel-name a[href]');

  if (link !== null && link !== undefined) {
    const href = link.getAttribute("href") || "";
    const match = href.match(/^\/@([^/?#]+)/);

    if (match !== null && match !== undefined) {
      return match[1].toLowerCase();
    }
  }

  const nameEl = document.querySelector("ytd-channel-name yt-formatted-string");

  return nameEl?.textContent?.trim().toLowerCase() || null;
}

function getCurrentVideoTitle() {
  const title = getTitleNode();

  return title?.textContent.toLowerCase() || "";
}

function playAndUnmuteVideo() {
  sendCommandToMoviePlayer("unMute").catch(() => debugLog("Unable to unmute"));
  sendCommandToMoviePlayer("playVideo").catch(() => debugLog("Unable to play"));
}
