const MODES = Object.freeze({ work: 25 * 60, short: 5 * 60 });

export class TimerEngine {
  constructor(onTick = () => {}, onComplete = () => {}, clock = globalThis) {
    this.durations = { ...MODES };
    this.mode = "work";
    this.left = this.total = this.durations.work;
    this.running = false;
    this.onTick = onTick;
    this.onComplete = onComplete;
    this.clock = clock;
    this.intervalId = null;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.intervalId = this.clock.setInterval(() => this.advance(), 1000);
    this.emit();
  }

  advance() {
    if (!this.running) return;
    this.left = Math.max(0, this.left - 1);
    this.emit();
    if (this.left === 0) {
      const completed = this.snapshot();
      this.pause(false);
      this.onComplete(completed);
    }
  }

  pause(emit = true) {
    this.running = false;
    if (this.intervalId !== null) this.clock.clearInterval(this.intervalId);
    this.intervalId = null;
    if (emit) this.emit();
  }

  reset() {
    this.pause(false);
    this.left = this.total = this.durations[this.mode];
    this.emit();
  }

  switchMode(mode) {
    if (!(mode in this.durations)) throw new Error(`Unknown timer mode: ${mode}`);
    this.mode = mode;
    this.reset();
  }

  emit() { this.onTick(this.snapshot()); }

  snapshot() {
    return {
      mode: this.mode,
      left: this.left,
      total: this.total,
      running: this.running,
      progress: 1 - this.left / this.total
    };
  }
}
