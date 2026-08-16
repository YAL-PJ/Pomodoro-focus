/**
 * Tiny synthesised sound effects — no audio files, no dependencies.
 * Everything is short, quiet, and safe to skip if the browser has no
 * AudioContext.
 */

export class SoundManager {
  constructor() {
    this.ctx = null;
    this.ambient = null;
  }

  tone(freq = 220, duration = 0.1, type = "sine", volume = 0.035) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    this.ctx ??= new Ctor();
    const oscillator = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = freq;
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    oscillator.connect(gain).connect(this.ctx.destination);
    oscillator.start();
    oscillator.stop(this.ctx.currentTime + duration);
  }

  /** Play a sequence of [frequency, delayMs] pairs. */
  sequence(steps, { duration = 0.12, type = "square", volume = 0.03 } = {}) {
    steps.forEach(([freq, delay]) => {
      setTimeout(() => this.tone(freq, duration, type, volume), delay);
    });
  }

  meow() {
    this.tone(310, 0.18, "triangle", 0.03);
    setTimeout(() => this.tone(390, 0.22, "triangle", 0.025), 90);
  }

  clink() { this.tone(1200, 0.08, "sine", 0.025); }

  blip(freq = 880) { this.tone(freq, 0.06, "square", 0.02); }

  /** Session complete: a small major arpeggio, the only "reward" sound. */
  can() {
    this.sequence([[523, 0], [659, 90], [784, 180], [1047, 270]], { duration: 0.22, type: "triangle", volume: 0.035 });
  }

  crash() {
    [100, 80, 65].forEach((freq, i) => setTimeout(() => this.tone(freq, 0.35, "square", 0.045), i * 60));
  }

  zoomies() {
    this.sequence([[400, 0], [600, 60], [900, 120], [700, 180], [1100, 240]], { duration: 0.08, volume: 0.022 });
  }

  /** Disco easter egg sting. */
  riff() {
    this.sequence(
      [[262, 0], [330, 120], [392, 240], [523, 360], [392, 480], [523, 600], [659, 720]],
      { duration: 0.16, type: "sawtooth", volume: 0.022 }
    );
  }

  sparkle() {
    this.sequence([[1568, 0], [2093, 70], [2637, 140]], { duration: 0.1, type: "sine", volume: 0.018 });
  }

  setAmbient(on) {
    if (!on) {
      clearInterval(this.ambient);
      this.ambient = null;
      return;
    }
    this.tone(65, 0.4, "sine", 0.015);
    this.ambient = setInterval(() => this.tone(55 + Math.random() * 8, 0.8, "sine", 0.012), 1200);
  }
}
