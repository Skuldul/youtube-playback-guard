import { MESSAGE_FETCH_REMOTE_BLOCKLIST, MESSAGE_ERROR_REMOTE_NOT_SET } from "./messages.js";

if (typeof browser === "undefined") {
  globalThis.browser = chrome;
}

const UPDATE_CHECKER_ALARM_NAME = "updateCheckerAlarm";

browser.alarms.onAlarm.addListener(handleAlarm);

browser.alarms.create(UPDATE_CHECKER_ALARM_NAME, {
  periodInMinutes: 4 * 60
});

browser.runtime.onMessage.addListener(handleMessage);

updateBlocklistFromRemote();

function handleAlarm(alarmInfo) {
  switch (alarmInfo.name) {
    case UPDATE_CHECKER_ALARM_NAME:
      updateBlocklistFromRemote();
      break;
    default:
      console.error("YPG: No alarm handler found");
  }
}

async function handleMessage(message) {
  switch (message.type) {
    case MESSAGE_FETCH_REMOTE_BLOCKLIST: {
      const remote = message.payload?.remote ?? null;

      if (shouldUseRemote(remote)) {
        return fetchRemoteBlocklist(remote);
      } else {
        return { error: MESSAGE_ERROR_REMOTE_NOT_SET };
      }
    }
  }
}

async function updateBlocklistFromRemote() {
  const remote = await browser.storage.local.get("remote");

  if (!shouldUseRemote(remote)) {
    return;
  }

  const result = await fetchRemoteBlocklist(remote);

  if (result.error !== null && result.error !== undefined) {
    await browser.storage.local.set({
      remote: {
        ...remote,
        lastFetchedAt: result.fetchedAt,
        lastError: result.error
      }
    });
  }

  await browser.storage.local.set(result);
}

function shouldUseRemote(remote) {
  return (
    remote !== null &&
    remote !== undefined &&
    remote.url !== null &&
    remote.url !== undefined &&
    remote.url.length > 0 &&
    remote.enabled
  );
}

async function fetchRemoteBlocklist(remote) {
  const now = Date.now();

  try {
    const response = await fetch(remote.url, { cache: "no-store" });

    if (!response.ok) {
      return { error: "Unable to fetch json from the remote URL", fetchedAt: now };
    }

    const data = await response.json();

    if (data === null || data === undefined || !Array.isArray(data.keywords) || !Array.isArray(data.channels)) {
      return { error: "Unable to parse JSON the response is null or misconfigured", fetchedAt: now };
    }

    return {
      blocklist: {
        keywords: data.keywords.map(x => x.toLowerCase()),
        channels: data.channels.map(x => x.toLowerCase()),
        updatedAt: now
      },
      remote: {
        ...remote,
        lastFetchedAt: now,
        lastError: null
      }
    };
  } catch (error) {
    return { error: error?.message || error, fetchedAt: now };
  }
}
