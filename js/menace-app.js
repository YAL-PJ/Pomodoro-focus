/**
 * Cat Desk Menace — application wiring.
 *
 * Keeps the interface deliberately small: one primary button that always says
 * what it will do next, one ghost button, and keyboard shortcuts for everything
 * else. Everything decorative lives in ambience.js / fx.js / easter-eggs.js so
 * this file stays about behaviour.
 */

import { TimerEngine } from "./timer-engine.js";
import { DeskStage } from "./desk-stage.js";
import { SoundManager } from "./sound-manager.js";
import { StatsStorage } from "./stats-storage.js";
import { inventory } from "./inventory-state.js";
import { Ambience } from "./ambience.js";
import { createEasterEggs, SECRETS } from "./easter-eggs.js";
import { burst, coinFly, countUp, ring, centerOf } from "./fx.js";

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const storage = new StatsStorage();
const sound = new SoundManager();
const state = storage.load();

const stage = new DeskStage($("#deskCard"), $("#cat"), $("#pushItem"));
const timer = new TimerEngine(renderTimer, completeSession);
const ambience = new Ambience();
const eggs = createEasterEggs({ stage, sound, unlock: unlockSecret, toast });

let catalog = "items";
let lastClink = null;
let lastRenderedSeconds = null;
let displayedCoins = state.coins;

// ---------------------------------------------------------------- rendering

function format(seconds) {
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

function statusFor({ mode, running, left, total }) {
  if (mode === "short") return running ? "CATNAP IN PROGRESS" : "CATNAP READY";
  if (running) return "MENACE IN MOTION";
  return left < total ? "PAUSED — LASER DEPLOYED" : "READY TO FOCUS";
}

function nudgeFor({ mode, running, left, total, progress }) {
  if (mode === "short") return "The menace is recharging.";
  if (!running && left < total) return "Held off by a red dot. Classic.";
  if (progress > 0.82) return "Careful... one paw at a time.";
  if (progress > 0.4) return "Halfway. The glass is still upright.";
  return "The glass is safe... for now.";
}

/** The primary button is the whole control scheme, so it must never lie. */
function renderPrimaryButton({ mode, running, left, total }) {
  const button = $("#startBtn");
  const paused = !running && left < total;
  const label = running
    ? "Pause"
    : paused
      ? "Resume"
      : mode === "short" ? "Start catnap" : "Start focus";
  const icon = running ? "⏸" : "▶";

  if (button.dataset.label !== label) {
    button.dataset.label = label;
    button.querySelector(".btn-label").textContent = label;
    button.querySelector(".btn-icon").textContent = icon;
  }
  button.classList.toggle("is-running", running);
  button.title = running ? "Pause with the laser pointer (Space)" : "Space";

  // Abandoning a live work session is what breaks things — say so plainly.
  const ghost = $("#abortBtn");
  const abandoning = mode === "work" && left < total;
  ghost.textContent = abandoning ? "Give up" : "Reset";
  ghost.classList.toggle("danger", abandoning);
  ghost.title = abandoning ? "Ends the session — the item goes down (R)" : "Reset the timer (R)";
}

function renderTimer(snapshot) {
  const { left, progress, mode, running, total } = snapshot;

  if (left !== lastRenderedSeconds) {
    lastRenderedSeconds = left;
    const display = $("#timeDisplay");
    display.textContent = format(left);
    display.classList.remove("tick");
    void display.offsetWidth;
    display.classList.add("tick");
  }

  $("#timeDisplay").classList.toggle("urgent", mode === "work" && running && left <= 60);
  $("#progressFill").style.width = `${progress * 100}%`;
  $("#statusText").textContent = statusFor(snapshot);
  $("#nudgeText").textContent = nudgeFor(snapshot);
  $(".timer-panel").classList.toggle("is-running", running);

  ambience.setProgress(progress);
  renderPrimaryButton(snapshot);
  stage.render(snapshot);

  // A nervous clink every ten seconds of the final two minutes.
  if (mode === "work" && running && left <= 120 && left > 0 && left % 10 === 0 && lastClink !== left) {
    lastClink = left;
    sound.clink();
    navigator.vibrate?.(12);
  }
  if (left === total) lastClink = null;
}

function renderStats() {
  countUp($("#coinBalance"), displayedCoins, state.coins);
  countUp($("#coinsMetric"), displayedCoins, state.coins);
  displayedCoins = state.coins;

  $("#focusMetric").textContent = state.focusMinutes >= 60
    ? `${(state.focusMinutes / 60).toFixed(1)}h`
    : `${state.focusMinutes}m`;
  $("#streakMetric").textContent = state.streak;

  $("#savedShelf").innerHTML = state.saved.length
    ? state.saved.slice(-10).map((id, index) => {
        const item = inventory.items.find(entry => entry.id === id);
        return `<span class="saved-item" style="animation-delay:${index * 60}ms" title="${item?.name || id}">${item?.icon || "🏆"}</span>`;
      }).join("")
    : "Nothing saved yet.";

  $("#brokenPile").textContent = state.broken
    ? `${"🏺 ".repeat(Math.min(state.broken, 8))} ${state.broken} glorious accident${state.broken === 1 ? "" : "s"}`
    : "No casualties. Yet.";

  renderSecrets();
}

function renderSecrets() {
  $("#secretCount").textContent = `${state.secrets.length}/${SECRETS.length}`;
  $("#secretGrid").innerHTML = SECRETS.map(secret => {
    const found = state.secrets.includes(secret.id);
    return `<div class="secret-chip ${found ? "found" : ""}">
      <i>${found ? secret.icon : "❓"}</i><span>${found ? secret.name : "???"}</span>
    </div>`;
  }).join("");
}

function renderStageInventory() {
  const selected = inventory.items.find(item => item.id === state.selected) || inventory.items[0];
  stage.item.className = `push-item item-${selected.id}`;
  stage.item.setAttribute("aria-label", selected.name);
  const cosmetic = inventory.cosmetics.find(item => item.id === state.equippedCosmetic);
  $("#catCosmetic").textContent = cosmetic?.icon || "";
  $("#catCosmetic").dataset.cosmetic = cosmetic?.id || "";
}

function renderCatalog() {
  const owned = catalog === "items" ? state.unlocked : state.cosmetics;
  $("#catalogGrid").innerHTML = inventory[catalog].map((entry, index) => {
    const isOwned = owned.includes(entry.id);
    const equipped = catalog === "items" ? state.selected === entry.id : state.equippedCosmetic === entry.id;
    const buttonLabel = equipped ? "Equipped" : isOwned ? "Equip" : "Unlock";
    return `<article class="catalog-card" style="animation-delay:${index * 45}ms">
      <div class="art">${entry.icon}</div>
      <b>${entry.name}</b>
      <small>${entry.price ? `${entry.price} catnip coins` : "Starter item"}</small>
      <button data-buy="${entry.id}" ${equipped ? "disabled" : ""}>${buttonLabel}</button>
    </article>`;
  }).join("");
  $$("[data-buy]").forEach(button => { button.onclick = () => buy(button.dataset.buy); });
}

function toast(text) {
  const node = $("#toast");
  node.textContent = text;
  node.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove("show"), 2400);
}

// ------------------------------------------------------------------ actions

function switchMode(mode) {
  timer.switchMode(mode);
  $$(".mode-btn").forEach(button => button.classList.toggle("active", button.dataset.mode === mode));
  $(".session-switch").classList.toggle("on-short", mode === "short");
}

function togglePrimary() {
  if (timer.running) {
    timer.pause();
    sound.tone(480, 0.12);
    toast("Laser deployed. Menace distracted.");
  } else {
    timer.start();
  }
}

function resetOrAbandon() {
  const abandoning = timer.mode === "work" && timer.left < timer.total;
  if (!abandoning) {
    timer.reset();
    return;
  }
  timer.pause();
  stage.crash();
  sound.crash();
  storage.recordBreakage(state);
  toast("CRASH! Another one for the broken pile.");
  const spot = centerOf($("#pushItem"));
  burst(spot.x, spot.y, { count: 18, colors: ["#9ac4c1", "#e8f2e9", "#829b91"], power: 150 });
  setTimeout(() => timer.reset(), 700);
  renderStats();
}

function completeSession(snapshot) {
  if (snapshot.mode === "work") {
    storage.complete(state, state.selected, Math.round(snapshot.total / 60));
    sound.can();
    stage.celebrate();

    const spot = centerOf($("#deskCard"));
    burst(spot.x, spot.y - 40, { count: 34, power: 240 });
    coinFly($("#pushItem"), $("#shopButton"), { count: 5 });
    $("#shopButton").classList.add("bump");
    setTimeout(() => $("#shopButton").classList.remove("bump"), 600);

    toast("Item saved! +10 catnip coins");
    setTimeout(() => switchMode("short"), 1100);
  } else {
    sound.meow();
    toast("Catnap over. Back to the desk!");
    switchMode("work");
  }
  renderStats();
}

function buy(id) {
  const list = inventory[catalog];
  const item = list.find(entry => entry.id === id);
  const owned = catalog === "items" ? state.unlocked : state.cosmetics;

  if (!owned.includes(id)) {
    if (state.coins < item.price) {
      toast("Not enough catnip coins");
      return;
    }
    state.coins -= item.price;
    owned.push(id);
    sound.sparkle();
    toast(`${item.name} unlocked!`);
  }

  if (catalog === "items") state.selected = id;
  else state.equippedCosmetic = id;

  storage.save(state);
  renderStats();
  renderStageInventory();
  renderCatalog();
}

function unlockSecret(id) {
  if (!storage.unlockSecret(state, id)) return;
  const secret = SECRETS.find(entry => entry.id === id);
  sound.sparkle();
  toast(`Secret found: ${secret.name} (${state.secrets.length}/${SECRETS.length})`);
  renderSecrets();
}

function showView(view) {
  $$(".nav-btn").forEach(button => button.classList.toggle("active", button.dataset.view === view));
  $("#timerView").hidden = view !== "timer";
  $("#statsView").hidden = view !== "stats";
  if (view === "stats") renderStats();
}

function openCatalog(open) {
  $("#catalogModal").hidden = !open;
  if (open) renderCatalog();
}

// ------------------------------------------------------------------- events

$("#startBtn").onclick = togglePrimary;
$("#abortBtn").onclick = resetOrAbandon;
$("#cat").onclick = () => stage.poke(sound);
stage.onFrenzy = () => eggs.zoomies();

$$(".mode-btn").forEach(button => { button.onclick = () => switchMode(button.dataset.mode); });
$$(".nav-btn").forEach(button => { button.onclick = () => showView(button.dataset.view); });

$("#shopButton").onclick = () => openCatalog(true);
$$("[data-close]").forEach(button => { button.onclick = () => openCatalog(false); });
$$("[data-catalog]").forEach(button => {
  button.onclick = () => {
    catalog = button.dataset.catalog;
    $$("[data-catalog]").forEach(tab => tab.classList.toggle("active", tab === button));
    renderCatalog();
  };
});

$("#themeToggle").onclick = event => {
  state.settings.theme = ambience.cycleMode();
  storage.save(state);
  event.currentTarget.textContent = ambience.glyph;
  event.currentTarget.title = ambience.label;
  event.currentTarget.classList.toggle("active", state.settings.theme !== "auto");
  if (ambience.isNight) eggs.checkNightOwl(1);
  toast(ambience.label);
};

$("#scanlineToggle").onclick = event => {
  state.settings.scanlines = !state.settings.scanlines;
  document.body.classList.toggle("scanlines-on", state.settings.scanlines);
  event.currentTarget.classList.toggle("active", state.settings.scanlines);
  storage.save(state);
};

$("#soundToggle").onclick = event => {
  state.settings.ambient = !state.settings.ambient;
  sound.setAmbient(state.settings.ambient);
  event.currentTarget.classList.toggle("active", state.settings.ambient);
  storage.save(state);
  toast(state.settings.ambient ? "Lo-fi purr mode on" : "Lo-fi purr mode off");
};

// A ring wherever you click the scene: every poke should feel acknowledged.
$("#deskCard").addEventListener("pointerdown", event => ring(event.clientX, event.clientY));

document.addEventListener("keydown", event => {
  const tag = event.target?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || event.target?.isContentEditable) return;

  if (event.key === "Escape") { openCatalog(false); return; }
  if (event.code === "Space") { event.preventDefault(); togglePrimary(); return; }
  if (event.metaKey || event.ctrlKey || event.altKey) return;

  const key = event.key.toLowerCase();
  if (key === "r") resetOrAbandon();
  if (key === "c") openCatalog($("#catalogModal").hidden);
  if (key === "s") showView($("#statsView").hidden ? "stats" : "timer");
});

// --------------------------------------------------------------- initialise

ambience.init(state.settings.theme);
$("#themeToggle").textContent = ambience.glyph;
$("#themeToggle").title = ambience.label;
$("#themeToggle").classList.toggle("active", state.settings.theme !== "auto");

document.body.classList.toggle("scanlines-on", state.settings.scanlines);
$("#scanlineToggle").classList.toggle("active", state.settings.scanlines);
$("#soundToggle").classList.toggle("active", state.settings.ambient);
if (state.settings.ambient) sound.setAmbient(true);

eggs.attach();
eggs.checkNightOwl();

renderStats();
renderStageInventory();
renderTimer(timer.snapshot());
