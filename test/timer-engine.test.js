import test from "node:test";
import assert from "node:assert/strict";
import { TimerEngine } from "../js/timer-engine.js";

function fakeClock() {
  return {
    callback: null,
    setInterval(callback) { this.callback = callback; return 1; },
    clearInterval() { this.callback = null; }
  };
}

test("starts, advances, pauses and resumes without losing progress", () => {
  const clock = fakeClock();
  const ticks = [];
  const timer = new TimerEngine(snapshot => ticks.push(snapshot), () => {}, clock);
  timer.durations.work = 2;
  timer.reset();
  timer.start();
  clock.callback();
  timer.pause();
  assert.equal(timer.snapshot().left, 1);
  timer.start();
  clock.callback();
  assert.equal(timer.snapshot().left, 0);
  assert.equal(timer.snapshot().running, false);
  assert.ok(ticks.length >= 4);
});

test("completes once and rejects unknown modes", () => {
  const clock = fakeClock();
  let completions = 0;
  const timer = new TimerEngine(() => {}, () => { completions += 1; }, clock);
  timer.durations.work = 1;
  timer.reset();
  timer.start();
  clock.callback();
  assert.equal(completions, 1);
  assert.throws(() => timer.switchMode("lunch"), /Unknown timer mode/);
});
