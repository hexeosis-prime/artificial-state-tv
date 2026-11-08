/* THE ARTIFICIAL STATE TV — player core.
   double-buffered: the standby screen loads the next clip while the live
   screen plays. a channel must never show a black gap. */

(() => {
"use strict";

const v0 = document.getElementById("v0");
const v1 = document.getElementById("v1");
const screens = [v0, v1];
let live = 0;                       // index of the visible screen

const $ = (id) => document.getElementById(id);
const el = {
  num: $("ch-num"), name: $("ch-name"), pos: $("ch-pos"),
  strip: $("channel-strip"), title: $("clip-title"),
  prev: $("ctl-prev"), play: $("ctl-play"), next: $("ctl-next"), mute: $("ctl-mute"),
  standby: $("standby"), interference: $("interference"),
};

let manifest = null;
let ch = 0;                          // current channel index
let clip = 0;                        // current clip index within channel
let swapping = false;                // guard against double-swaps
let idleTimer = null;

/* ---------- manifest ---------- */
async function loadManifest() {
  const r = await fetch("manifest.json", { cache: "no-store" });
  if (!r.ok) throw new Error("manifest " + r.status);
  manifest = await r.json();
}

/* ---------- helpers ---------- */
const chan = () => manifest.channels[ch];
const clips = () => (chan().clips || []);
const hasClips = () => clips().length > 0;

function srcOf(c) { return c.src; }

/* ---------- double-buffer swap ---------- */
function screenEl() { return screens[live]; }
function backEl()   { return screens[1 - live]; }

function showStandby(on) {
  el.standby.classList.toggle("hidden", !on);
}

function flashInterference() {
  el.interference.classList.remove("flip");
  void el.interference.offsetWidth;   // restart the animation
  el.interference.classList.add("flip");
}

/* play a clip on the BACK screen, then swap it live. no black gap. */
function roll(clipIdx, onReady) {
  if (swapping || !hasClips()) { showStandby(true); return; }
  showStandby(false);
  swapping = true;
  clip = (clipIdx + clips().length) % clips().length;
  const c = clips()[clip];
  const back = backEl();

  const done = () => {
    back.removeEventListener("loadeddata", done);
    // swap visibility
    back.classList.add("live");
    screenEl().classList.remove("live");
    live = 1 - live;
    swapping = false;
    paintChrome();
    if (onReady) onReady();
    back.play().catch(() => {});
  };
  back.addEventListener("loadeddata", done, { once: true });
  back.src = srcOf(c);
  back.load();
}

/* ---------- chrome ---------- */
function paintChrome() {
  const c = hasClips() ? clips()[clip] : null;
  el.num.textContent  = "CH " + String(ch + 1).padStart(2, "0");
  el.name.textContent = chan().name || "";
  el.pos.textContent  = hasClips()
    ? String(clip + 1).padStart(2, "0") + " / " + String(clips().length).padStart(2, "0")
    : "OFF AIR";
  el.title.textContent = c ? (c.title || "—") : "NO SIGNAL";
  if (c && c.permalink) { el.title.href = c.permalink; el.title.style.display = ""; }
  else { el.title.removeAttribute("href"); }
  [...el.strip.children].forEach((a, i) =>
    a.classList.toggle("here", i === ch));
  const playing = !screenEl().paused;
  el.play.textContent = playing ? "⏸" : "▶";
}

function buildStrip() {
  el.strip.innerHTML = "";
  manifest.channels.forEach((c, i) => {
    const a = document.createElement("a");
    a.textContent = String(i + 1).padStart(2, "0") + " " + c.name;
    a.href = "#";
    if (c.locked) a.classList.add("locked");
    a.addEventListener("click", (e) => { e.preventDefault(); switchChannel(i); });
    el.strip.appendChild(a);
  });
}

/* ---------- navigation ---------- */
function nextClip(d) { roll(clip + d); }

function switchChannel(i) {
  if (i === ch && hasClips()) { roll(0); return; }
  ch = (i + manifest.channels.length) % manifest.channels.length;
  clip = 0;
  flashInterference();
  if (!hasClips()) { showStandby(true); paintChrome(); return; }
  showStandby(false);
  roll(0);
}

function togglePlay() {
  const s = screenEl();
  if (s.paused) s.play().catch(() => {});
  else s.pause();
  paintChrome();
}

function toggleMute() {
  const s = screenEl();
  s.muted = !s.muted;
  el.mute.textContent = s.muted ? "🔇" : "🔊";
}

/* auto-advance: when the live clip ends, roll the next.
   preload hint: the back screen already holds the next clip after each swap —
   we keep it simple: on 'ended', roll forward (back screen fetches fresh). */
function wireAutoAdvance() {
  screens.forEach((s) => s.addEventListener("ended", () => {
    if (s === screenEl() && !swapping) roll(clip + 1);
  }));
}

/* ---------- idle chrome ---------- */
function wake() {
  document.body.classList.remove("idle");
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => document.body.classList.add("idle"), 3200);
}
["mousemove", "mousedown", "touchstart", "keydown"].forEach((e) =>
  document.addEventListener(e, wake, { passive: true }));

/* ---------- input ---------- */
el.prev.addEventListener("click", () => nextClip(-1));
el.next.addEventListener("click", () => nextClip(1));
el.play.addEventListener("click", togglePlay);
el.mute.addEventListener("click", toggleMute);

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") nextClip(1);
  else if (e.key === "ArrowLeft") nextClip(-1);
  else if (e.key === " ") { e.preventDefault(); togglePlay(); }
  else if (/^[1-8]$/.test(e.key)) switchChannel(parseInt(e.key, 10) - 1);
  else if (e.key.toLowerCase() === "m") toggleMute();
  else if (e.key.toLowerCase() === "c")
    el.strip.classList.toggle("hidden");
});

/* show the channel strip briefly on hover near the top edge */
document.addEventListener("mousemove", (e) => {
  el.strip.classList.toggle("hidden", e.clientY > 72);
});

/* ---------- boot ---------- */
(async () => {
  try {
    await loadManifest();
  } catch (err) {
    el.num.textContent = "CH --";
    el.name.textContent = "manifest unreachable";
    el.standby.querySelector(".standby-line").textContent = "NO CARRIER";
    showStandby(true);
    return;
  }
  buildStrip();
  wireAutoAdvance();
  // begin muted: autoplay compliance. one click on 🔇 brings the sound.
  if (hasClips()) {
    roll(0);
  } else {
    showStandby(true);
    paintChrome();
  }
})();
})();
