export function createSoundEngine() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = AudioCtx ? new AudioCtx() : null;

  function playBeep(freqs, { gain = 0.15, step = 0.08, length = 0.2 } = {}) {
    if (!ctx) return;
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g);
      g.connect(ctx.destination);
      osc.frequency.value = freq;

      const start = ctx.currentTime + i * step;
      const end = start + length;
      g.gain.setValueAtTime(gain, start);
      g.gain.exponentialRampToValueAtTime(0.01, end);
      osc.start(start);
      osc.stop(end);
    });
  }

  // Best effort: resume context on first user interaction
  function ensureContext() {
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  }

  document.addEventListener(
    "click",
    () => {
      ensureContext();
    },
    { once: true }
  );

  return {
    ctx,
    tick() {
      playBeep([880], { gain: 0.05, length: 0.04 });
    },
    happyTick() {
      playBeep([880, 1047], { gain: 0.09, step: 0.05, length: 0.1 });
    },
    minute() {
      playBeep([659, 880], { gain: 0.12, step: 0.08, length: 0.16 });
    },
    fiveMinute() {
      playBeep([523, 659, 784], { gain: 0.15, step: 0.08, length: 0.18 });
    },
    completion() {
      playBeep([523, 659, 784, 1047], { gain: 0.18, step: 0.1, length: 0.25 });
    }
  };
}
