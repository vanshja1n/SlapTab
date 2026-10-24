const SLAP_VOLUME = 0.08;
let audioContext = null;
let slapBufferPromise = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

async function getSlapBuffer() {
  if (!slapBufferPromise) {
    slapBufferPromise = fetch(chrome.runtime.getURL("assets/slapped.mp3"))
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => getAudioContext().decodeAudioData(arrayBuffer));
  }
  return slapBufferPromise;
}

async function playSlap() {
  const context = getAudioContext();
  const buffer = await getSlapBuffer();
  const source = context.createBufferSource();
  const gain = context.createGain();

  gain.gain.value = SLAP_VOLUME;
  source.buffer = buffer;
  source.connect(gain);
  gain.connect(context.destination);
  source.start();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.target !== "offscreen" || message.type !== "PLAY_SLAP") return false;

  playSlap()
    .then(() => sendResponse({ ok: true }))
    .catch(() => sendResponse({ ok: false }));
  return true;
});
