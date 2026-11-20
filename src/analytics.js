/**
 * SlapTab Analytics — GA4 Measurement Protocol
 *
 * Privacy: This module sends only anonymous, product-level events
 * (e.g. "extension opened", "focus started"). It NEVER collects:
 *   - Browsing history or visited URLs
 *   - Website names/domains configured by the user
 *   - Page titles, page contents, or search queries
 *   - Email addresses, usernames, passwords, or personal identifiers
 *   - IP addresses (GA4 Measurement Protocol does not log IP by default)
 *
 * An anonymous client_id (random UUID) is generated once and stored locally.
 * No data leaves the device except the event name and generic parameters
 * (extension version, session id, engagement time).
 *
 * Security note: The API secret below is a write-only Measurement Protocol
 * key. It can only send events to this GA4 property — it cannot read
 * analytics data or access any Google account. It is intentionally included
 * in the extension source. If you need to rotate it, update the value here.
 */

(function (root) {
  "use strict";

  // ── Configuration ──────────────────────────────────────────────────
  const GA4_MEASUREMENT_ID = "G-ST456RZMWD";
  const GA4_API_SECRET = "KArM_CKeSiy6BK6msXHuag";
  const GA4_ENDPOINT = "https://www.google-analytics.com/mp/collect";
  const STORAGE_KEY_CLIENT_ID = "slapTabAnalyticsClientId";
  const STORAGE_KEY_SESSION = "slapTabAnalyticsSession";
  const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

  // ── State ──────────────────────────────────────────────────────────
  let clientId = null;
  let sessionId = null;
  let sessionStart = 0;

  // ── Helpers ────────────────────────────────────────────────────────

  function generateUUID() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for environments without crypto.randomUUID
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  function getExtensionVersion() {
    try {
      return chrome.runtime.getManifest().version;
    } catch {
      return "unknown";
    }
  }

  // ── Client ID (persistent, anonymous) ──────────────────────────────

  async function getClientId() {
    if (clientId) return clientId;
    try {
      const data = await chrome.storage.local.get(STORAGE_KEY_CLIENT_ID);
      if (data[STORAGE_KEY_CLIENT_ID]) {
        clientId = data[STORAGE_KEY_CLIENT_ID];
      } else {
        clientId = generateUUID();
        await chrome.storage.local.set({ [STORAGE_KEY_CLIENT_ID]: clientId });
      }
    } catch {
      clientId = generateUUID();
    }
    return clientId;
  }

  // ── Session ID (rotates after 30 min inactivity) ───────────────────

  async function getSessionId() {
    const now = Date.now();
    try {
      const data = await chrome.storage.local.get(STORAGE_KEY_SESSION);
      const stored = data[STORAGE_KEY_SESSION];
      if (stored && stored.id && (now - stored.lastActive) < SESSION_TIMEOUT_MS) {
        sessionId = stored.id;
        sessionStart = stored.start;
        // Update last active time
        await chrome.storage.local.set({
          [STORAGE_KEY_SESSION]: { id: sessionId, start: sessionStart, lastActive: now }
        });
        return sessionId;
      }
    } catch {
      // Fall through to create new session
    }

    // New session
    sessionId = String(now);
    sessionStart = now;
    try {
      await chrome.storage.local.set({
        [STORAGE_KEY_SESSION]: { id: sessionId, start: sessionStart, lastActive: now }
      });
    } catch {
      // Non-critical
    }
    return sessionId;
  }

  // ── Send event ─────────────────────────────────────────────────────

  /**
   * Send a GA4 Measurement Protocol event.
   *
   * @param {string} name  - Event name (e.g. "extension_opened")
   * @param {Object} [params] - Optional event parameters (no PII)
   * @returns {Promise<void>} Resolves silently; never throws.
   */
  async function sendEvent(name, params) {
    try {
      const cid = await getClientId();
      const sid = await getSessionId();

      const url = `${GA4_ENDPOINT}?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${GA4_API_SECRET}`;

      const body = {
        client_id: cid,
        events: [
          {
            name: name,
            params: {
              session_id: sid,
              engagement_time_msec: "100",
              extension_version: getExtensionVersion(),
              ...(params || {})
            }
          }
        ]
      };

      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
    } catch {
      // Analytics must never break the extension. Fail silently.
    }
  }

  // ── Public API ─────────────────────────────────────────────────────

  const api = { sendEvent };

  root.SlapTabAnalytics = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : self);

