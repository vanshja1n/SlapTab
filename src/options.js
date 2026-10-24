const { STORAGE_KEYS } = SlapTabRules;
const SETTINGS_KEY = STORAGE_KEYS.settings;
const USAGE_KEY = STORAGE_KEYS.usage;
const DEFAULT_SITE = { pattern: "", enabled: true, dailyLimitMinutes: 60 };

let settings = {
  unlockMinutes: 15,
  sites: []
};
let usage = {};

function hasChromeStorage() {
  return Boolean(globalThis.chrome?.storage?.local);
}

function storageGet(keys) {
  return new Promise((resolve) => {
    if (hasChromeStorage()) {
      chrome.storage.local.get(keys, (data) => resolve(data || {}));
      return;
    }

    const requested = Array.isArray(keys) ? keys : [keys];
    const data = {};
    requested.forEach((key) => {
      const value = localStorage.getItem(key);
      if (value) data[key] = JSON.parse(value);
    });
    resolve(data);
  });
}

function storageSet(value) {
  return new Promise((resolve) => {
    if (hasChromeStorage()) {
      chrome.storage.local.set(value, resolve);
      return;
    }

    Object.entries(value).forEach(([key, storedValue]) => {
      localStorage.setItem(key, JSON.stringify(storedValue));
    });
    resolve();
  });
}

function makeId() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `site-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function todayKey() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");
}

function formatUsage(seconds) {
  const minutes = Math.floor((seconds || 0) / 60);
  const remainingSeconds = Math.floor((seconds || 0) % 60);
  if (minutes <= 0) return `${remainingSeconds}s`;
  return `${minutes}m ${String(remainingSeconds).padStart(2, "0")}s`;
}

function createSite() {
  return {
    ...DEFAULT_SITE,
    id: makeId()
  };
}

function normalizeHost(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];
}

function faviconUrl(pattern) {
  const host = normalizeHost(pattern);
  if (!host) return "";
  if (!globalThis.chrome?.runtime?.getURL) {
    return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(`https://${host}`)}&sz=64`;
  }
  const url = new URL(chrome.runtime.getURL("/_favicon/"));
  url.searchParams.set("pageUrl", `https://${host}`);
  url.searchParams.set("size", "32");
  return url.toString();
}

function summaryTitle(site) {
  return normalizeHost(site.pattern) || "New site";
}

async function load() {
  const data = await storageGet([SETTINGS_KEY, USAGE_KEY]);
  settings = data[SETTINGS_KEY] || settings;
  usage = data[USAGE_KEY] || {};
  if (!Array.isArray(settings.sites)) settings.sites = [];
  render();
}

async function save() {
  readForm();
  await storageSet({ [SETTINGS_KEY]: settings });
  setStatus("Settings saved.");
  render();
}

function setStatus(message) {
  const status = document.getElementById("status");
  if (!status) return;
  status.textContent = message;
  if (message) {
    window.clearTimeout(setStatus.timer);
    setStatus.timer = window.setTimeout(() => {
      status.textContent = "";
    }, 3200);
  }
}

function readForm() {
  settings.unlockMinutes = Number(document.getElementById("unlock-minutes").value || 15);
  settings.sites = [...document.querySelectorAll(".site-card")].map((card) => {
    const id = card.dataset.id || makeId();
    return {
      id,
      pattern: card.querySelector('[data-field="pattern"]').value.trim(),
      enabled: card.querySelector('[data-field="enabled"]').checked,
      dailyLimitMinutes: Number(card.querySelector('[data-field="dailyLimitMinutes"]').value || 0)
    };
  });
}

function render() {
  document.getElementById("unlock-minutes").value = settings.unlockMinutes || 15;
  const root = document.getElementById("sites");
  const template = document.getElementById("site-template");
  const count = document.getElementById("site-count");
  const emptyState = document.getElementById("empty-state");
  root.textContent = "";
  count.textContent = `${settings.sites.length} ${settings.sites.length === 1 ? "site" : "sites"}`;
  emptyState.hidden = settings.sites.length > 0;

  settings.sites.forEach((site) => {
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector(".site-card");
    card.dataset.id = site.id || makeId();
    if (!site.pattern) card.open = true;

    const statusDot = card.querySelector(".status-dot");

    updateCardSummary(card, site);

    statusDot.classList.toggle("enabled", site.enabled !== false);
    statusDot.classList.toggle("disabled", site.enabled === false);
    statusDot.title = site.enabled !== false ? "Enabled" : "Paused";

    card.querySelector('[data-field="enabled"]').checked = site.enabled !== false;
    card.querySelector('[data-field="pattern"]').value = site.pattern || "";
    card.querySelector('[data-field="dailyLimitMinutes"]').value = site.dailyLimitMinutes || 0;
    const seconds = usage[todayKey()]?.[card.dataset.id] || 0;
    card.querySelector(".usage").textContent = formatUsage(seconds);
    root.appendChild(fragment);
  });
}

function updateUsageDisplays() {
  document.querySelectorAll(".site-card").forEach((card) => {
    const seconds = usage[todayKey()]?.[card.dataset.id] || 0;
    const target = card.querySelector(".usage");
    if (target) target.textContent = formatUsage(seconds);
  });
}

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function validateImportedSettings(value) {
  const imported = value?.settings || value;
  if (!imported || !Array.isArray(imported.sites)) {
    throw new Error("Invalid SlapTab settings file.");
  }

  return {
    unlockMinutes: Number(imported.unlockMinutes || 15),
    sites: imported.sites.map((site) => ({
      id: site.id || makeId(),
      pattern: String(site.pattern || ""),
      enabled: site.enabled !== false,
      dailyLimitMinutes: Number(site.dailyLimitMinutes || 0)
    }))
  };
}

function updateCardSummary(card, site) {
  const host = normalizeHost(site.pattern);
  const icon = card.querySelector(".site-favicon");
  const fallback = card.querySelector(".favicon-fallback");
  const title = host || "New site";

  fallback.textContent = title.slice(0, 1).toUpperCase();
  fallback.style.display = "grid";
  icon.style.display = "none";
  icon.removeAttribute("src");

  if (host) {
    icon.src = faviconUrl(host);
    icon.addEventListener(
      "load",
      () => {
        fallback.style.display = "none";
        icon.style.display = "block";
      },
      { once: true }
    );
    icon.addEventListener(
      "error",
      () => {
        fallback.style.display = "grid";
        icon.style.display = "none";
      },
      { once: true }
    );
  }

  card.querySelector(".summary-title").textContent = title;
}

async function exportSettings() {
  readForm();
  const data = await storageGet([USAGE_KEY]);
  downloadJson("slaptab-settings.json", {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    usage: data[USAGE_KEY] || {}
  });
  alert("Settings exported.");
}

async function importSettings(file) {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    settings = validateImportedSettings(parsed);
    await storageSet({ [SETTINGS_KEY]: settings });
    render();
    alert("Settings imported.");
  } catch (error) {
    alert(error.message || "Could not import settings.");
  }
}

function addSite() {
  readForm();
  settings.sites.push(createSite());
  render();
  setStatus("Site added. Fill in the domain and save.");
}

function bindEvents() {
  document.getElementById("add-site").addEventListener("click", addSite);
  document.getElementById("empty-add-site").addEventListener("click", addSite);
  document.getElementById("save").addEventListener("click", save);
  document.getElementById("export-settings").addEventListener("click", exportSettings);
  document.getElementById("import-settings").addEventListener("click", () => {
    document.getElementById("import-file").click();
  });
  document.getElementById("import-file").addEventListener("change", (event) => {
    const [file] = event.target.files;
    if (file) importSettings(file);
    event.target.value = "";
  });
  document.getElementById("sites").addEventListener("click", (event) => {
    if (event.target.matches('[data-action="remove"]')) {
      event.preventDefault();
      event.stopPropagation();
      const card = event.target.closest(".site-card");
      const domain = card.querySelector('[data-field="pattern"]').value.trim() || "this site";
      if (!confirm(`Remove ${domain} from SlapTab?`)) return;
      readForm();
      settings.sites = settings.sites.filter((site) => site.id !== card.dataset.id);
      render();
      setStatus("Site removed.");
    }
  });

  document.addEventListener("change", (event) => {
    if (event.target.closest?.("#sites") || event.target.id === "unlock-minutes") {
      readForm();
    }
  });

  document.getElementById("sites").addEventListener("input", (event) => {
    if (!event.target.matches('[data-field="pattern"]')) return;
    const card = event.target.closest(".site-card");
    updateCardSummary(card, { pattern: event.target.value });
  });

  if (globalThis.chrome?.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local" || !changes[USAGE_KEY]) return;
      usage = changes[USAGE_KEY].newValue || {};
      updateUsageDisplays();
    });
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    bindEvents();
    await load();
  } catch (error) {
    setStatus(error.message || "Could not initialize SlapTab settings.");
  }
});
