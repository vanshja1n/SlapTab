let blocked = false;
let tickTimer = null;
let refreshTimer = null;
let quizAnswer = null;
let lastTickAt = Date.now();
let pendingSeconds = 0;
let tickInFlight = false;
let slapSoundPlayed = false;

function formatMinutes(seconds) {
  const minutes = Math.floor((seconds || 0) / 60);
  const remainingSeconds = Math.floor((seconds || 0) % 60);
  return `${minutes}m ${String(remainingSeconds).padStart(2, "0")}s`;
}

function sendMessage(message) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          resolve(null);
          return;
        }
        resolve(response);
      });
    } catch {
      resolve(null);
    }
  });
}

function isVisible() {
  return document.visibilityState === "visible";
}

function buildQuiz() {
  const a = Math.floor(Math.random() * 18) + 7;
  const b = Math.floor(Math.random() * 12) + 4;
  const c = Math.floor(Math.random() * 9) + 3;
  quizAnswer = a * b + c;
  return `${a} x ${b} + ${c}`;
}

function playSlapSoundIfViewing() {
  if (!isVisible() || !document.hasFocus()) return false;
  sendMessage({ type: "REQUEST_SLAP" });
  return true;
}

function ensureOverlay(decision) {
  let overlay = document.getElementById("time-gate-overlay");
  if (overlay) return overlay;

  overlay = document.createElement("div");
  overlay.id = "time-gate-overlay";
  overlay.innerHTML = `
    <section class="time-gate-panel" role="dialog" aria-modal="true" aria-labelledby="time-gate-title">
      <img class="time-gate-slap" src="${chrome.runtime.getURL("assets/app/app-icon.png")}" alt="" aria-hidden="true" />
      <p class="time-gate-kicker">SlapTab</p>
      <h1 id="time-gate-title">You’ve been slapped.</h1>
      <p id="time-gate-reason"></p>
      <dl class="time-gate-stats">
        <div>
          <dt>Site</dt>
          <dd id="time-gate-site"></dd>
        </div>
        <div>
          <dt>Active time today</dt>
          <dd id="time-gate-usage"></dd>
        </div>
      </dl>
      <form id="time-gate-form">
        <label for="time-gate-answer">Solve to earn access back</label>
        <div class="time-gate-quiz">
          <span id="time-gate-question"></span>
          <input id="time-gate-answer" inputmode="numeric" autocomplete="off" />
          <button type="submit">Unlock</button>
        </div>
        <p id="time-gate-error" aria-live="polite"></p>
      </form>
    </section>
  `;

  const attach = () => {
    if (document.documentElement) {
      document.documentElement.appendChild(overlay);
      wireOverlay(decision);
    }
  };

  if (document.documentElement) {
    attach();
  } else {
    document.addEventListener("DOMContentLoaded", attach, { once: true });
  }

  if (!slapSoundPlayed) {
    slapSoundPlayed = playSlapSoundIfViewing();
  }

  return overlay;
}

function wireOverlay(decision) {
  const form = document.getElementById("time-gate-form");
  if (!form || form.dataset.ready) return;
  form.dataset.ready = "true";
  document.getElementById("time-gate-question").textContent = buildQuiz();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = document.getElementById("time-gate-answer");
    const error = document.getElementById("time-gate-error");
    if (Number(input.value) !== quizAnswer) {
      error.textContent = "Wrong answer. Try again.";
      document.getElementById("time-gate-question").textContent = buildQuiz();
      input.value = "";
      input.focus();
      return;
    }

    const response = await sendMessage({
      type: "UNLOCK_SITE",
      hostname: location.hostname
    });

    if (response?.ok) {
      removeOverlay();
      blocked = false;
      await refreshDecision();
    } else {
      error.textContent = "Could not unlock this site.";
    }
  });
}

function updateOverlay(decision) {
  const overlay = ensureOverlay(decision);
  const site = decision.site || {};
  overlay.querySelector("#time-gate-reason").textContent = "That site has had enough of you today. Solve the quiz if you want back in.";
  overlay.querySelector("#time-gate-site").textContent = site.pattern || location.hostname;
  overlay.querySelector("#time-gate-usage").textContent = formatMinutes(decision.usageSeconds || 0);
}

function removeOverlay() {
  document.getElementById("time-gate-overlay")?.remove();
}

async function refreshDecision() {
  const decision = await sendMessage({
    type: "GET_DECISION",
    hostname: location.hostname
  });
  if (!decision) return;

  blocked = Boolean(decision?.blocked);
  if (blocked) {
    updateOverlay(decision);
  } else {
    removeOverlay();
  }
}

async function flushActiveSeconds() {
  if (tickInFlight) return;
  const seconds = Math.floor(pendingSeconds);
  if (seconds < 1) return;

  pendingSeconds -= seconds;
  tickInFlight = true;
  const decision = await sendMessage({
    type: "ACTIVE_TICK",
    hostname: location.hostname,
    seconds
  });
  tickInFlight = false;

  if (decision?.tracked) {
    blocked = Boolean(decision.blocked);
    if (blocked) updateOverlay(decision);
  }
}

async function collectActiveTime() {
  const now = Date.now();
  const deltaSeconds = Math.min(10, Math.max(0, (now - lastTickAt) / 1000));
  lastTickAt = now;

  if (!blocked && isVisible()) {
    pendingSeconds += deltaSeconds;
  }

  await flushActiveSeconds();
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    collectActiveTime();
  } else {
    lastTickAt = Date.now();
    if (blocked && !slapSoundPlayed) {
      slapSoundPlayed = playSlapSoundIfViewing();
    }
  }
});

refreshDecision();
tickTimer = setInterval(() => collectActiveTime(false), 2000);
refreshTimer = setInterval(refreshDecision, 30000);

window.addEventListener("pagehide", () => {
  collectActiveTime();
  clearInterval(tickTimer);
  clearInterval(refreshTimer);
});
