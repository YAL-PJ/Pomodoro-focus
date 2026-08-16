import test from "node:test";
import assert from "node:assert/strict";
import { StatsStorage } from "../js/stats-storage.js";

function memoryStore(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test("loads safe defaults and deeply merges settings", () => {
  const store = memoryStore({ cat_desk_menace_v1: JSON.stringify({ coins: 9, settings: { scanlines: true } }) });
  const state = new StatsStorage(store).load();
  assert.equal(state.coins, 9);
  assert.equal(state.settings.scanlines, true);
  assert.equal(state.settings.ambient, false);
  assert.deepEqual(state.unlocked, ["glass"]);
});

test("awards coins and maintains a genuinely consecutive streak", () => {
  const storage = new StatsStorage(memoryStore());
  const state = storage.load();
  storage.complete(state, "glass", 25, new Date("2026-08-10T12:00:00Z"));
  storage.complete(state, "vase", 25, new Date("2026-08-11T12:00:00Z"));
  assert.equal(state.streak, 2);
  storage.complete(state, "phone", 25, new Date("2026-08-14T12:00:00Z"));
  assert.equal(state.streak, 1);
  assert.equal(state.coins, 60);
  assert.equal(state.focusMinutes, 75);
});

test("records aborted sessions", () => {
  const storage = new StatsStorage(memoryStore());
  const state = storage.load();
  storage.recordBreakage(state);
  assert.equal(state.broken, 1);
});
