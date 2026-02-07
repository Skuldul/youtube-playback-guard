import { MESSAGE_FETCH_REMOTE_BLOCKLIST } from "../../common/messages.js";

if (typeof browser === "undefined") {
  globalThis.browser = chrome;
}

const DEFAULT_REMOTE = {
  enabled: false,
  url: "",
  lastFetchedAt: null,
  lastError: null
};

const DEFAULT_BLOCKLIST = {
  keywords: [],
  channels: [],
  updatedAt: null
};

const keywordsNode    = document.getElementById("keywords");
const channelsNode    = document.getElementById("channels");
const saveNode        = document.getElementById("save");
const exportNode      = document.getElementById("export");
const importFileNode  = document.getElementById("importFile");
const importNode      = document.getElementById("import");
const useRemoteNode   = document.getElementById("useRemote");
const remoteUrlNode   = document.getElementById("remoteUrl");
const fetchNowNode    = document.getElementById("fetchNow");
const lastFetchedNode = document.getElementById("lastFetched");

loadOptions();

keywordsNode.addEventListener("input", handleStateUpdate);
channelsNode.addEventListener("input", handleStateUpdate);
saveNode.addEventListener("click", saveOptions);
useRemoteNode.addEventListener("click", handleStateUpdate);
remoteUrlNode.addEventListener("input", handleStateUpdate);
fetchNowNode.addEventListener("click", updateBlocklistFromRemote);

async function loadOptions() {
  const { remote, blocklist } = await browser.storage.local.get(["remote", "blocklist"]);
  
  loadRemoteOptions(remote);
  loadBlocklistOptions(blocklist);

  updateNodeStates(remote, blocklist);
}

function loadRemoteOptions(remote) {
  useRemoteNode.checked = remote?.enabled ?? DEFAULT_REMOTE.enabled;
  remoteUrlNode.value = remote?.url ?? DEFAULT_REMOTE.url;
  lastFetchedNode.value = remote?.lastFetchedAt ?? DEFAULT_REMOTE.lastFetchedAt;
}

function loadBlocklistOptions(blocklist) {
  keywordsNode.value = (blocklist?.keywords ?? DEFAULT_BLOCKLIST.keywords).join("\n").toLowerCase();
  channelsNode.value = (blocklist?.channels ?? DEFAULT_BLOCKLIST.channels).join("\n").toLowerCase();
}

function updateNodeStates(remote, blocklist) {
  keywordsNode.disabled  = remote.enabled;
  channelsNode.disabled  = remote.enabled;
  exportNode.disabled    = blocklist.keywords.length === 0 && blocklist.channels.length === 0;
  importNode.disabled    = remote.enabled;
  remoteUrlNode.disabled = !remote.enabled;
  remoteUrlNode.disabled = !remote.enabled;
  fetchNowNode.disabled  = !remote.enabled || !isUrl(remoteUrlNode.value);
}

function isUrl(value) {
  try {
    const url = new URL(value);
    const hasWebProtocol = ["http:", "https:"].includes(url.protocol);

    if (!hasWebProtocol) {
      return false;
    }

    const host = url.hostname;
    const hasDot = (
      host.includes(".") &&
      host.lastIndexOf(".") !== 0 &&
      host.lastIndexOf(".") !== host.length - 1
    );

    return hasDot;
  } catch {
    return false;
  }
}

async function saveOptions() {
  const nodeRemote = getNodeRemoteOptions();
  const nodeBlocklist = getNodeBlocklistOptions();

  if (nodeRemote.enabled) {
    const granted = await requestOriginPermissions(nodeRemote.url);

    if (!granted) {
      return;
    }
  }

  let { remote, blocklist } = await browser.storage.local.get(["remote", "blocklist"]);

  if (remote === null || remote === undefined) {
    remote = {};
  }

  if (blocklist === null || blocklist === undefined) {
    blocklist = {};
  }

  await browser.storage.local.set({
    remote: {
      ...remote,
      url: nodeRemote.url,
      enabled: nodeRemote.enabled,
    },
    blocklist: {
      ...blocklist,
      keywords: nodeBlocklist.keywords,
      channels: nodeBlocklist.channels,
      updatedAt: Date.now()
    }
  });
}

function getNodeBlocklistOptions() {
  return {
    keywords: keywordsNode.value.split("\n").filter(x => x.length > 0),
    channels: channelsNode.value.split("\n").filter(x => x.length > 0)
  };
}

function getNodeRemoteOptions() {
  return {
    enabled: useRemoteNode.checked ?? false,
    url: remoteUrlNode.value.trim()
  };
}

async function requestOriginPermissions(url) {
  if (!isUrl(url)) {
    return false;
  }

  const origin = new URL(url).origin + "/*";
  return browser.permissions.request({ origins: [origin] });
}

function handleStateUpdate() {
  const nodeRemote = getNodeRemoteOptions();
  const nodeBlocklist = getNodeBlocklistOptions();

  updateNodeStates(nodeRemote, nodeBlocklist);
}

async function updateBlocklistFromRemote() {
  const nodeRemote = getNodeRemoteOptions();

  if (!nodeRemote.enabled) {
    return;
  }

  const granted = await requestOriginPermissions(nodeRemote.url);

  if (!granted) {
    return;
  }

  const remote = {
    enabled: nodeRemote.enabled,
    url: nodeRemote.url
  };

  const response = await browser.runtime.sendMessage({
    type: MESSAGE_FETCH_REMOTE_BLOCKLIST,
    payload: {
      remote: remote
    }
  });

  if (response.error !== null && response.error !== undefined) {
    // TODO: Set error on remote and maybe delete the url and permissions.
    return;
  }

  loadBlocklistOptions(response.blocklist);
  lastFetchedNode.value = response.remote.lastFetchedAt;
}
