/**
 * Throwaway visual effects: confetti, floating emoji, coins flying to the
 * wallet, click rings and number roll-ups.
 *
 * Every particle removes itself when its animation ends, so nothing here
 * accumulates in the DOM. All of it silently no-ops when the visitor asks for
 * reduced motion.
 */

const CONFETTI_COLORS = ["#bd6049", "#e5b95c", "#6c7c62", "#fffaf0", "#d59a8c"];

const reducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)");

function motionAllowed() {
  return !reducedMotion?.matches;
}

function layer() {
  return document.getElementById("fxLayer");
}

function place(node, x, y) {
  node.style.left = `${x}px`;
  node.style.top = `${y}px`;
}

function spawn(node, lifetime) {
  const host = layer();
  if (!host) return;
  host.appendChild(node);
  setTimeout(() => node.remove(), lifetime);
}

export function centerOf(element) {
  const box = element?.getBoundingClientRect();
  if (!box) return { x: innerWidth / 2, y: innerHeight / 2 };
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

/** A pixel-confetti pop. Squares, not circles — it has to match the art. */
export function burst(x, y, { count = 26, colors = CONFETTI_COLORS, power = 190 } = {}) {
  if (!motionAllowed()) return;
  for (let i = 0; i < count; i += 1) {
    const bit = document.createElement("span");
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const distance = power * (0.45 + Math.random() * 0.75);
    const duration = 900 + Math.random() * 700;
    bit.className = "fx-bit";
    bit.style.background = colors[i % colors.length];
    bit.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    bit.style.setProperty("--dy", `${Math.sin(angle) * distance + 120}px`);
    bit.style.setProperty("--rot", `${Math.random() * 720 - 360}deg`);
    bit.style.setProperty("--dur", `${duration}ms`);
    place(bit, x, y);
    spawn(bit, duration + 60);
  }
}

/** Emoji that float upward and fade — hearts, leaves, sparkles. */
export function emojiBurst(x, y, glyphs, { count = 7, spread = 120, rise = 170 } = {}) {
  if (!motionAllowed()) return;
  for (let i = 0; i < count; i += 1) {
    const bit = document.createElement("span");
    const duration = 1200 + Math.random() * 900;
    bit.className = "fx-emoji";
    bit.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
    bit.style.setProperty("--dx", `${(Math.random() - 0.5) * spread * 2}px`);
    bit.style.setProperty("--dy", `${-rise - Math.random() * 90}px`);
    bit.style.setProperty("--dur", `${duration}ms`);
    place(bit, x + (Math.random() - 0.5) * 40, y);
    spawn(bit, duration + 60);
  }
}

/** Coins arc from the desk into the wallet pill so the reward has a source. */
export function coinFly(fromElement, toElement, { count = 5, label = "C" } = {}) {
  if (!motionAllowed()) return;
  const from = centerOf(fromElement);
  const to = centerOf(toElement);
  for (let i = 0; i < count; i += 1) {
    const coin = document.createElement("span");
    const duration = 750 + i * 90;
    coin.className = "fx-coin";
    coin.textContent = label;
    coin.style.setProperty("--dx", `${to.x - from.x}px`);
    coin.style.setProperty("--dy", `${to.y - from.y}px`);
    coin.style.setProperty("--dur", `${duration}ms`);
    place(coin, from.x, from.y);
    spawn(coin, duration + 60);
  }
}

/** Expanding ring — the cheapest way to make a click feel physical. */
export function ring(x, y, color) {
  if (!motionAllowed()) return;
  const node = document.createElement("span");
  node.className = "fx-ring";
  if (color) node.style.borderColor = color;
  place(node, x - 10, y - 10);
  spawn(node, 660);
}

/** Roll a number up instead of snapping it, so gains are felt. */
export function countUp(element, from, to, duration = 700) {
  if (!element) return;
  if (!motionAllowed() || from === to) {
    element.textContent = String(to);
    return;
  }
  const started = performance.now();
  const step = now => {
    const t = Math.min(1, (now - started) / duration);
    const eased = 1 - (1 - t) ** 3;
    element.textContent = String(Math.round(from + (to - from) * eased));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export { motionAllowed };
