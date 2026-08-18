/**
 * The desk scene: where the cat lives.
 *
 * Beyond positioning, the stage keeps the cat *idling* — random blinks, eyes
 * that follow the pointer, a tail that speeds up while you focus, and a
 * visible tell in the last stretch of a session so the danger reads instantly.
 */

import { motionAllowed } from "./fx.js";

const CREEP_START = 72;   // item position, % from the left of the desk
const CREEP_END = 92;
const TENSE_FROM = 0.82;  // progress at which the cat commits to the plan

export class DeskStage {
  constructor(card, cat, item) {
    this.card = card;
    this.cat = cat;
    this.item = item;
    this.clicks = [];
    this.onFrenzy = null;
    this.blinkTimer = null;
    this.startIdle();
  }

  render(state) {
    const breaking = state.mode === "short";
    const tense = state.mode === "work" && state.running && state.progress >= TENSE_FROM;

    this.card.classList.toggle("break", breaking);
    this.card.classList.toggle("paused", !state.running && state.left < state.total);
    this.card.classList.toggle("running", state.running);
    this.card.classList.toggle("tense", tense);

    const position = CREEP_START + (CREEP_END - CREEP_START) * state.progress;
    this.item.style.left = `${position}%`;
    this.cat.style.left = `${Math.max(38, position - 29)}%`;
  }

  /** Random blinks + pointer-following eyes. Cheap, and it reads as alive. */
  startIdle() {
    if (!motionAllowed()) return;

    const blink = () => {
      this.cat.classList.add("blink");
      setTimeout(() => this.cat.classList.remove("blink"), 140);
      this.blinkTimer = setTimeout(blink, 2600 + Math.random() * 5200);
    };
    this.blinkTimer = setTimeout(blink, 2000);

    // Pointer events fire far faster than the screen refreshes, and reading a
    // rect forces layout. Coalesce to one read + one write per frame.
    let pointer = null;
    let queued = false;
    const clamp = value => Math.max(-1, Math.min(1, value * 3));

    const trackPointer = () => {
      queued = false;
      const box = this.cat.getBoundingClientRect();
      if (!box.width) return;
      const x = (pointer.x - (box.left + box.width / 2)) / innerWidth;
      const y = (pointer.y - (box.top + box.height / 2)) / innerHeight;
      this.cat.style.setProperty("--pointer-x", clamp(x).toFixed(2));
      this.cat.style.setProperty("--pointer-y", clamp(y).toFixed(2));
    };

    document.addEventListener("pointermove", event => {
      pointer = { x: event.clientX, y: event.clientY };
      if (queued) return;
      queued = true;
      requestAnimationFrame(trackPointer);
    }, { passive: true });
  }

  poke(sound) {
    this.cat.classList.remove("poked");
    void this.cat.offsetWidth;
    this.cat.classList.add("poked");
    setTimeout(() => this.cat.classList.remove("poked"), 500);
    sound.meow();
    navigator.vibrate?.(18);

    const now = Date.now();
    this.clicks = this.clicks.filter(stamp => now - stamp < 2000);
    this.clicks.push(now);

    if (this.clicks.length >= 7) {
      this.clicks = [];
      this.onFrenzy?.();
      return this.clicks.length;
    }
    if (this.clicks.length >= 4) {
      this.cat.classList.add("stare");
      setTimeout(() => this.cat.classList.remove("stare"), 1800);
    }
    return this.clicks.length;
  }

  zoomies() {
    this.cat.classList.remove("zoomies");
    void this.cat.offsetWidth;
    this.cat.classList.add("zoomies");
    setTimeout(() => this.cat.classList.remove("zoomies"), 1600);
  }

  dizzy(duration = 3000) {
    this.cat.classList.add("dizzy");
    setTimeout(() => this.cat.classList.remove("dizzy"), duration);
  }

  celebrate() {
    this.card.classList.add("celebrate");
    this.item.classList.add("saved");
    setTimeout(() => {
      this.card.classList.remove("celebrate");
      this.item.classList.remove("saved");
    }, 950);
  }

  crash() {
    this.card.classList.add("crash");
    setTimeout(() => this.card.classList.remove("crash"), 900);
  }
}
