importScripts("rules.js");

const {
  STORAGE_KEYS,
  DEFAULT_SETTINGS,
  todayKey,
  findMatchingSite,
  getDecision
} = SlapTabRules;

const OFFSCREEN_DOCUMENT_PATH = "src/offscreen.html";
let creatingOffscreenDocument = null;

async function getState() {
  const data = await chrome.storage.local.get(Object.values(STORAGE_KEYS));
  const settings = data[STORAGE_KEYS.settings] || DEFAULT_SETTINGS;
  return {
    settings,
    usage: data[STORAGE_KEYS.usage] || {},
    unlocks: data[STORAGE_KEYS.unlocks] || {}
  };
}

async function ensureOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH);
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [offscreenUrl]
  });

  if (contexts.length > 0) return;
  if (!creatingOffscreenDocument) {
    creatingOffscreenDocument = chrome.offscreen.createDocument({
      url: OFFSCREEN_DOCUMENT_PATH,
      reasons: ["AUDIO_PLAYBACK"],
      justification: "Play the SlapTab blocked-page slap sound."
    });
  }
  await creatingOffscreenDocument;
  creatingOffscreenDocument = null;
}

async function playSlapSound() {
  await ensureOffscreenDocument();
  await chrome.runtime.sendMessage({
    target: "offscreen",
    type: "PLAY_SLAP"
  });
}

async function savePartial(partial) {
  await chrome.storage.local.set(partial);
}

async function recordActiveSeconds(siteId, seconds) {
  const data = await chrome.storage.local.get(STORAGE_KEYS.usage);
  const usage = data[STORAGE_KEYS.usage] || {};
  const date = todayKey();
  usage[date] = usage[date] || {};
  usage[date][siteId] = (usage[date][siteId] || 0) + Math.max(0, Number(seconds) || 0);
  await savePartial({ [STORAGE_KEYS.usage]: usage });
  return usage[date][siteId];
}

async function canCountActiveTick(sender) {
  if (!sender?.tab?.id) return false;

  const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!activeTab || activeTab.id !== sender.tab.id) return false;

  if (chrome.idle?.queryState) {
    const state = await chrome.idle.queryState(15);
    return state === "active";
  }

  return true;
}

async function isSenderActiveTab(sender) {
  if (!sender?.tab?.id) return false;

  const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return Boolean(activeTab && activeTab.id === sender.tab.id);
}

chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(STORAGE_KEYS.settings);
  if (!data[STORAGE_KEYS.settings]) {
    await savePartial({ [STORAGE_KEYS.settings]: DEFAULT_SETTINGS });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return false;

  (async () => {
    if (message.type === "GET_DECISION") {
      const state = await getState();
      sendResponse(getDecision(state, message.hostname));
      return;
    }

    if (message.type === "ACTIVE_TICK") {
      const canCount = await canCountActiveTick(sender);
      if (!canCount) {
        sendResponse({ blocked: false, tracked: false });
        return;
      }

      const state = await getState();
      const decision = getDecision(state, message.hostname);
      if (!decision.tracked || decision.blocked || !decision.site) {
        sendResponse(decision);
        return;
      }
      const usageSeconds = await recordActiveSeconds(decision.site.id, message.seconds);
      const refreshedState = await getState();
      sendResponse({
        ...getDecision(refreshedState, message.hostname),
        usageSeconds
      });
      return;
    }

    if (message.type === "UNLOCK_SITE") {
      const state = await getState();
      const site = findMatchingSite(state.settings, message.hostname);
      if (!site) {
        sendResponse({ ok: false });
        return;
      }
      const minutes = Number(state.settings.unlockMinutes || 15);
      const until = Date.now() + minutes * 60 * 1000;
      const unlocks = { ...state.unlocks, [site.id]: until };
      await savePartial({ [STORAGE_KEYS.unlocks]: unlocks });
      sendResponse({ ok: true, until });
      return;
    }

    if (message.type === "REQUEST_SLAP") {
      if (!(await isSenderActiveTab(sender))) {
        sendResponse({ ok: false });
        return;
      }

      await playSlapSound();
      sendResponse({ ok: true });
      return;
    }

    sendResponse({ ok: false });
  })();

  return true;
});
