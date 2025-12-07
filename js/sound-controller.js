import { createSoundEngine } from "./sound.js";

const DEFAULT_SOUND_SETTINGS = {
  master: true,
  tick: true,
  happyTick: true,
  minute: true,
  fiveMinute: true,
  completion: true
};

export function createSoundController({ loadSettings, saveSettings, toggles = {} } = {}) {
  const soundEngine = createSoundEngine();
  let settings = { ...DEFAULT_SOUND_SETTINGS, ...(loadSettings?.() || {}) };
  let lastTickState = null;
  const { master, tick, happyTick, minute, fiveMinute, completion } = toggles;

  function persist(next) {
    settings = { ...settings, ...next };
    saveSettings?.(settings);
  }

  function applySettingsToUI() {
    if (!master || !tick || !happyTick || !minute || !fiveMinute || !completion) {
      return;
    }
    master.checked = settings.master;
    tick.checked = settings.tick;
    happyTick.checked = settings.happyTick;
    minute.checked = settings.minute;
    fiveMinute.checked = settings.fiveMinute;
    completion.checked = settings.completion;
  }

  function readSettingsFromUI() {
    if (!master || !tick || !happyTick || !minute || !fiveMinute || !completion) {
      console.warn("Sound toggles missing; skipping sound settings save.");
      return;
    }
    const next = {
      master: master.checked,
      tick: tick.checked,
      happyTick: happyTick.checked,
      minute: minute.checked,
      fiveMinute: fiveMinute.checked,
      completion: completion.checked
    };
    persist(next);
  }

  function bindToggleListeners() {
    if (!master || !tick || !happyTick || !minute || !fiveMinute || !completion) {
      console.warn("Sound toggles missing; skipping sound settings bind.");
      return;
    }
    [master, tick, happyTick, minute, fiveMinute, completion].forEach(input => {
      input.addEventListener("change", () => {
        readSettingsFromUI();
      });
    });
  }

  function handleTick({ timeLeft, totalTime, mode }) {
    if (!soundEngine || !soundEngine.ctx) return;
    if (!settings.master) return;

    if (mode === "work" && settings.tick) {
      soundEngine.tick();
    }

    const prev = lastTickState;
    lastTickState = { timeLeft, mode };

    if (!prev || timeLeft === prev.timeLeft) return;

    if (mode === "work" && settings.minute && timeLeft > 0 && timeLeft % 60 === 0) {
      soundEngine.minute();
    }

    if (mode === "work" && settings.fiveMinute && timeLeft > 0 && timeLeft % 300 === 0) {
      soundEngine.fiveMinute();
    }

    if (mode === "work" && settings.happyTick && timeLeft > 0 && timeLeft <= 10) {
      soundEngine.happyTick();
    }
  }

  function handleComplete({ mode }) {
    if (
      mode === "work" &&
      soundEngine &&
      soundEngine.ctx &&
      settings.master &&
      settings.completion
    ) {
      soundEngine.completion();
    }
  }

  return {
    getSettings: () => ({ ...settings }),
    syncUIFromStorage() {
      settings = { ...DEFAULT_SOUND_SETTINGS, ...(loadSettings?.() || {}) };
      applySettingsToUI();
    },
    bindToggleListeners,
    handleTick,
    handleComplete
  };
}
