(function attachRules(root) {
  const STORAGE_KEYS = {
    settings: "slapTabSettings",
    usage: "slapTabUsage",
    unlocks: "slapTabUnlocks"
  };

  const DEFAULT_SETTINGS = {
    unlockMinutes: 15,
    sites: [
      {
        id: "example",
        pattern: "example.com",
        enabled: true,
        dailyLimitMinutes: 60
      }
    ]
  };

  function todayKey(now = new Date()) {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function normalizeHost(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0];
  }

  function matchesPattern(hostname, pattern) {
    const host = normalizeHost(hostname);
    const normalizedPattern = normalizeHost(pattern).replace(/^\*\./, "");
    if (!host || !normalizedPattern) return false;
    return host === normalizedPattern || host.endsWith(`.${normalizedPattern}`);
  }

  function getUsageSeconds(usage, siteId, now = new Date()) {
    return usage[todayKey(now)]?.[siteId] || 0;
  }

  function findMatchingSite(settings, hostname) {
    return (settings.sites || []).find((site) => {
      return site.enabled !== false && matchesPattern(hostname, site.pattern);
    });
  }

  function getDecision(state, hostname, now = new Date()) {
    const site = findMatchingSite(state.settings, hostname);
    if (!site) {
      return { blocked: false, tracked: false };
    }

    const unlock = state.unlocks[site.id];
    if (unlock && unlock > now.getTime()) {
      return {
        blocked: false,
        tracked: true,
        site,
        usageSeconds: getUsageSeconds(state.usage, site.id, now),
        unlockedUntil: unlock
      };
    }

    const usageSeconds = getUsageSeconds(state.usage, site.id, now);
    const limitSeconds = Number(site.dailyLimitMinutes || 0) * 60;
    const hasLimit = limitSeconds > 0;
    const withinLimit = !hasLimit || usageSeconds < limitSeconds;

    return {
      blocked: !withinLimit,
      reason: "time_limit",
      tracked: true,
      site,
      usageSeconds,
      limitSeconds
    };
  }

  const api = {
    STORAGE_KEYS,
    DEFAULT_SETTINGS,
    todayKey,
    normalizeHost,
    matchesPattern,
    getUsageSeconds,
    findMatchingSite,
    getDecision
  };

  root.SlapTabRules = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : self);
