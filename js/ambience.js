/**
 * The background that quietly refuses to sit still.
 *
 * Three jobs:
 *  - pick a time-of-day palette (auto from the clock, or forced by the user)
 *  - scatter the decorative layers: dust motes, stars, night fireflies
 *  - publish session progress as a CSS variable so the scene can react to it
 *    (the sun climbs, the sunbeam tilts, the paw marker slides)
 */

import { motionAllowed } from "./fx.js";

const THEME_MODES = ["auto", "day", "night"];

const MODE_GLYPH = { auto: "◐", day: "☀", night: "☾" };
const MODE_LABEL = { auto: "Time of day: automatic", day: "Time of day: daylight", night: "Time of day: night" };

const THEME_META_COLOR = {
  dawn: "#f7e8de",
  day: "#f3ead7",
  dusk: "#ecdcd8",
  night: "#221d2b"
};

/** 5–8 dawn, 8–17 day, 17–20 dusk, otherwise night. */
export function themeForHour(hour) {
  if (hour >= 5 && hour < 8) return "dawn";
  if (hour >= 8 && hour < 17) return "day";
  if (hour >= 17 && hour < 20) return "dusk";
  return "night";
}

export class Ambience {
  constructor({ onThemeChange } = {}) {
    this.mode = "auto";
    this.theme = "day";
    this.onThemeChange = onThemeChange;
    this.fireflies = [];
  }

  init(mode = "auto") {
    this.mode = THEME_MODES.includes(mode) ? mode : "auto";
    this.buildDust();
    this.buildStars();
    this.apply();
    // Auto mode should notice the sun going down mid-session.
    setInterval(() => { if (this.mode === "auto") this.apply(); }, 5 * 60 * 1000);
    return this.mode;
  }

  /** Cycle auto → day → night and return the new mode for persisting. */
  cycleMode() {
    const next = (THEME_MODES.indexOf(this.mode) + 1) % THEME_MODES.length;
    this.mode = THEME_MODES[next];
    this.apply();
    return this.mode;
  }

  get glyph() { return MODE_GLYPH[this.mode]; }
  get label() { return MODE_LABEL[this.mode]; }
  get isNight() { return this.theme === "night"; }

  apply() {
    const theme = this.mode === "auto" ? themeForHour(new Date().getHours()) : this.mode;
    const changed = theme !== this.theme;
    this.theme = theme;
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", THEME_META_COLOR[theme]);
    this.syncFireflies();
    if (changed) this.onThemeChange?.(theme);
  }

  /** Progress drives the sun's height, the beam angle and the paw marker. */
  setProgress(progress) {
    document.documentElement.style.setProperty("--progress", progress.toFixed(4));
  }

  buildDust(count = 16) {
    const host = document.getElementById("dustField");
    if (!host || !motionAllowed()) return;
    host.innerHTML = "";
    for (let i = 0; i < count; i += 1) {
      const mote = document.createElement("span");
      mote.style.left = `${Math.random() * 100}%`;
      mote.style.bottom = `${-10 - Math.random() * 20}%`;
      mote.style.animationDuration = `${26 + Math.random() * 34}s`;
      mote.style.animationDelay = `${-Math.random() * 40}s`;
      mote.style.transform = `scale(${0.5 + Math.random()})`;
      host.appendChild(mote);
    }
  }

  buildStars(count = 60) {
    const host = document.getElementById("starField");
    if (!host) return;
    host.innerHTML = "";
    for (let i = 0; i < count; i += 1) {
      const star = document.createElement("span");
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 70}%`;
      star.style.animationDuration = `${1.6 + Math.random() * 3}s`;
      star.style.animationDelay = `${-Math.random() * 4}s`;
      host.appendChild(star);
    }
  }

  syncFireflies() {
    const host = document.querySelector(".ambience");
    const wanted = host && this.isNight && motionAllowed() ? 5 : 0;
    while (this.fireflies.length > wanted) this.fireflies.pop().remove();
    while (this.fireflies.length < wanted) {
      const fly = document.createElement("span");
      fly.className = "firefly";
      fly.style.left = `${10 + Math.random() * 80}%`;
      fly.style.top = `${45 + Math.random() * 45}%`;
      fly.style.animationDuration = `${22 + Math.random() * 18}s, ${1.8 + Math.random() * 2}s`;
      fly.style.animationDelay = `${-Math.random() * 20}s, ${-Math.random() * 3}s`;
      host.appendChild(fly);
      this.fireflies.push(fly);
    }
  }
}
