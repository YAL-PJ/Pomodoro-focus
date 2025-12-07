// Timer emits plan-agnostic callbacks that higher-level controllers (Basic or Pro)
// can subscribe to for sounds, notifications, or analytics.
export class PomodoroTimer {
  constructor({ onTick, onModeChange, onComplete } = {}) {
    this.tickSubscribers = new Set();
    this.modeChangeSubscribers = new Set();
    this.completeSubscribers = new Set();

    if (onTick) this.addTickListener(onTick);
    if (onModeChange) this.addModeChangeListener(onModeChange);
    if (onComplete) this.addCompleteListener(onComplete);

    this.durations = {
      work: 25 * 60,
      short: 5 * 60,
      long: 15 * 60
    };

    this.mode = "work";
    this.timeLeft = this.durations.work;
    this.totalTime = this.durations.work;
    this.isRunning = false;
    this._intervalId = null;

    this._emitModeChange();
    this._emitTick();
  }

  updateDurations({ work, short, long }) {
    if (typeof work === "number") this.durations.work = work;
    if (typeof short === "number") this.durations.short = short;
    if (typeof long === "number") this.durations.long = long;
    this._applyCurrentDuration();
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    if (!this.timeLeft || this.timeLeft <= 0) {
      this._applyCurrentDuration();
    }

    this._intervalId = setInterval(() => {
      if (!this.isRunning) return;
      this._tick();
    }, 1000);
  }

  pause() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  reset() {
    this.pause();
    this._applyCurrentDuration();
    this._emitTick();
  }

  switchMode(mode) {
    if (!["work", "short", "long"].includes(mode)) return;
    this.mode = mode;
    this._applyCurrentDuration();
    this.pause();
    this._emitModeChange();
    this._emitTick();
  }

  _applyCurrentDuration() {
    const duration = this.durations[this.mode] || 1500;
    this.totalTime = duration;
    this.timeLeft = duration;
  }

  _tick() {
    if (this.timeLeft <= 0) {
      this._handleComplete();
      return;
    }

    this.timeLeft -= 1;
    if (this.timeLeft < 0) this.timeLeft = 0;

    this._emitTick();
  }

  _handleComplete() {
    this.pause();
    const payload = {
      mode: this.mode,
      durationSeconds: this.totalTime,
      completedAt: new Date().toISOString()
    };
    this._emitTick();
    this._emitComplete(payload);
  }

  _emitTick() {
    const payload = {
      timeLeft: this.timeLeft,
      totalTime: this.totalTime,
      mode: this.mode
    };
    this.tickSubscribers.forEach(cb => cb(payload));
  }

  _emitModeChange() {
    this.modeChangeSubscribers.forEach(cb => cb({ mode: this.mode }));
  }

  _emitComplete(payload) {
    this.completeSubscribers.forEach(cb => cb(payload));
  }

  addTickListener(cb) {
    if (typeof cb !== "function") return () => {};
    this.tickSubscribers.add(cb);
    return () => this.tickSubscribers.delete(cb);
  }

  addModeChangeListener(cb) {
    if (typeof cb !== "function") return () => {};
    this.modeChangeSubscribers.add(cb);
    return () => this.modeChangeSubscribers.delete(cb);
  }

  addCompleteListener(cb) {
    if (typeof cb !== "function") return () => {};
    this.completeSubscribers.add(cb);
    return () => this.completeSubscribers.delete(cb);
  }
}
