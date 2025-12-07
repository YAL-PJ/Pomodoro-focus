import { STORAGE_KEYS } from "./storage.js";

export function createTimerController({ timer, soundEngine, loadJson, saveJson, onComplete }) {
  // DOM refs
  const timeDisplay = document.getElementById("timeDisplay");
  const modeLabel = document.getElementById("modeLabel");
  const timerCircle = document.getElementById("timerCircle");
  const progressCircleElem = document.querySelector(".progress-ring__circle");

  const startBtn = document.getElementById("startBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const resetBtn = document.getElementById("resetBtn");
  const controls = document.getElementById("controls");
  const modeButtons = document.querySelectorAll(".mode-btn");

  const workInput = document.getElementById("workDuration");
  const shortInput = document.getElementById("shortDuration");
  const longInput = document.getElementById("longDuration");

  const darkModeToggle = document.getElementById("darkModeToggle");
  const zenModeToggle = document.getElementById("zenModeToggle");
  const masterSoundToggle = document.getElementById("masterSoundToggle");
  const tickSoundToggle = document.getElementById("tickSoundToggle");
  const happyTickSoundToggle = document.getElementById("happyTickSoundToggle");
  const minuteSoundToggle = document.getElementById("minuteSoundToggle");
  const fiveMinuteSoundToggle = document.getElementById("fiveMinuteSoundToggle");
  const completionSoundToggle = document.getElementById("completionSoundToggle");

  let currentSoundSettings = {
    master: true,
    tick: true,
    happyTick: true,
    minute: true,
    fiveMinute: true,
    completion: true
  };

  let lastTickState = null;

  function handleTick({ timeLeft, totalTime, mode }) {
    if (timeDisplay) {
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      timeDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }

    const r = 140;
    const circumference = 2 * Math.PI * r;
    if (progressCircleElem && totalTime > 0) {
      const progress = (totalTime - timeLeft) / totalTime;
      const offset = circumference * (1 - progress);
      progressCircleElem.style.strokeDasharray = circumference;
      progressCircleElem.style.strokeDashoffset = offset;
    }

    handleTickSounds({ timeLeft, totalTime, mode });
  }

  function handleModeChange({ mode }) {
    if (modeLabel) {
      const label =
        mode === "work"
          ? "WORK"
          : mode === "short"
          ? "SHORT BREAK"
          : "LONG BREAK";
      modeLabel.textContent = label;
    }

    modeButtons.forEach(btn => {
      const m = btn.getAttribute("data-mode");
      btn.classList.toggle("active", m === mode);
    });
  }

  function handleComplete(payload) {
    const { mode } = payload;

    if (mode === "work" && timerCircle) {
      timerCircle.classList.remove("pulse");
      void timerCircle.offsetWidth;
      timerCircle.classList.add("pulse");
    }

    const celebration = document.getElementById("tomatoCelebration");
    if (mode === "work" && celebration) {
      celebration.classList.add("show");
      setTimeout(() => celebration.classList.remove("show"), 700);
    }

    if (currentSoundSettings.master && currentSoundSettings.completion) {
      soundEngine.completion();
    }

    if (typeof onComplete === "function") {
      onComplete(payload);
    }
  }

  function initDarkMode() {
    const saved = localStorage.getItem(STORAGE_KEYS.DARK_MODE);
    const isDark = saved === "true";
    document.body.classList.toggle("dark", isDark);
    if (darkModeToggle) {
      darkModeToggle.textContent = isDark ? "☀️" : "🌙";
    }
  }

  function updateZenModeUI(isZen) {
    document.body.classList.toggle("zen-mode", isZen);
    if (zenModeToggle) {
      zenModeToggle.classList.toggle("is-active", isZen);
      zenModeToggle.textContent = isZen ? "🧘‍♀️" : "🧘";
      zenModeToggle.setAttribute("aria-pressed", String(isZen));
      zenModeToggle.setAttribute(
        "title",
        isZen ? "Exit zen mode" : "Enter zen mode"
      );
      zenModeToggle.setAttribute(
        "aria-label",
        isZen
          ? "Exit zen mode and show sidebars"
          : "Enter zen mode and hide sidebars"
      );
    }
  }

  function initZenMode() {
    const saved = localStorage.getItem(STORAGE_KEYS.ZEN_MODE);
    const isZen = saved === "true";
    updateZenModeUI(isZen);
  }

  function initSoundSettings() {
    if (
      !masterSoundToggle ||
      !tickSoundToggle ||
      !happyTickSoundToggle ||
      !minuteSoundToggle ||
      !fiveMinuteSoundToggle ||
      !completionSoundToggle
    ) {
      console.warn("Sound toggles missing; skipping sound settings init.");
      return;
    }

    const saved = loadJson(STORAGE_KEYS.SOUND_SETTINGS, null);
    const defaults = {
      master: true,
      tick: true,
      happyTick: true,
      minute: true,
      fiveMinute: true,
      completion: true
    };
    const applied = { ...defaults, ...(saved || {}) };

    masterSoundToggle.checked = applied.master;
    tickSoundToggle.checked = applied.tick;
    happyTickSoundToggle.checked = applied.happyTick;
    minuteSoundToggle.checked = applied.minute;
    fiveMinuteSoundToggle.checked = applied.fiveMinute;
    completionSoundToggle.checked = applied.completion;

    currentSoundSettings = applied;
    timer.setSoundSettings(applied);
  }

  function saveSoundSettingsFromUI() {
    if (
      !masterSoundToggle ||
      !tickSoundToggle ||
      !happyTickSoundToggle ||
      !minuteSoundToggle ||
      !fiveMinuteSoundToggle ||
      !completionSoundToggle
    ) {
      console.warn("Sound toggles missing; skipping sound settings save.");
      return;
    }

    const settings = {
      master: masterSoundToggle.checked,
      tick: tickSoundToggle.checked,
      happyTick: happyTickSoundToggle.checked,
      minute: minuteSoundToggle.checked,
      fiveMinute: fiveMinuteSoundToggle.checked,
      completion: completionSoundToggle.checked
    };
    currentSoundSettings = settings;
    saveJson(STORAGE_KEYS.SOUND_SETTINGS, settings);
    timer.setSoundSettings(settings);
  }

  function syncDurationsFromInputs() {
    if (!workInput || !shortInput || !longInput) {
      console.warn("Duration inputs missing; skipping duration sync.");
      return;
    }

    const work = Math.max(1, Math.min(60, parseInt(workInput.value, 10) || 25));
    const short = Math.max(1, Math.min(30, parseInt(shortInput.value, 10) || 5));
    const long = Math.max(1, Math.min(60, parseInt(longInput.value, 10) || 15));

    workInput.value = work;
    shortInput.value = short;
    longInput.value = long;

    timer.updateDurations({
      work: work * 60,
      short: short * 60,
      long: long * 60
    });
  }

  function handleTickSounds({ timeLeft, totalTime, mode }) {
    if (!soundEngine || !soundEngine.ctx) return;
    const s = currentSoundSettings;
    if (!s.master) return;

    if (mode === "work" && s.tick) {
      soundEngine.tick();
    }

    const prev = lastTickState;
    lastTickState = { timeLeft, mode };

    if (!prev) return;
    if (timeLeft === prev.timeLeft) return;

    if (
      mode === "work" &&
      s.minute &&
      timeLeft > 0 &&
      timeLeft % 60 === 0
    ) {
      soundEngine.minute();
    }

    if (
      mode === "work" &&
      s.fiveMinute &&
      timeLeft > 0 &&
      timeLeft % 300 === 0
    ) {
      soundEngine.fiveMinute();
    }

    if (
      mode === "work" &&
      s.happyTick &&
      timeLeft > 0 &&
      timeLeft <= 10
    ) {
      soundEngine.happyTick();
    }
  }

  function attachEvents() {
    if (startBtn && pauseBtn && controls) {
      startBtn.addEventListener("click", () => {
        timer.start();
        startBtn.style.display = "none";
        controls.classList.add("active");
      });

      pauseBtn.addEventListener("click", () => {
        timer.pause();
        startBtn.style.display = "inline-flex";
        controls.classList.remove("active");
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        timer.reset();
      });
    }

    if (timerCircle && startBtn && pauseBtn) {
      timerCircle.addEventListener("click", e => {
        if (
          e.target.closest("#pauseBtn") ||
          e.target.closest("#resetBtn") ||
          e.target.closest("#startBtn")
        ) {
          return;
        }
        if (timer.isRunning) {
          pauseBtn.click();
        } else {
          startBtn.click();
        }
      });
    }

    modeButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const mode = btn.getAttribute("data-mode");
        timer.switchMode(mode);
        timer.pause();
        if (startBtn && controls) {
          startBtn.style.display = "inline-flex";
          controls.classList.remove("active");
        }
      });
    });

    [workInput, shortInput, longInput]
      .filter(Boolean)
      .forEach(input => {
        input.addEventListener("change", syncDurationsFromInputs);
      });

    if (darkModeToggle) {
      darkModeToggle.addEventListener("click", () => {
        const isDark = !document.body.classList.contains("dark");
        document.body.classList.toggle("dark", isDark);
        darkModeToggle.textContent = isDark ? "☀️" : "🌙";
        localStorage.setItem(STORAGE_KEYS.DARK_MODE, String(isDark));
      });
    }

    if (zenModeToggle) {
      zenModeToggle.addEventListener("click", () => {
        const isZen = !document.body.classList.contains("zen-mode");
        updateZenModeUI(isZen);
        localStorage.setItem(STORAGE_KEYS.ZEN_MODE, String(isZen));
      });
    }

    [
      masterSoundToggle,
      tickSoundToggle,
      happyTickSoundToggle,
      minuteSoundToggle,
      fiveMinuteSoundToggle,
      completionSoundToggle
    ]
      .filter(Boolean)
      .forEach(input => {
        input.addEventListener("change", saveSoundSettingsFromUI);
      });

    document.addEventListener("keydown", e => {
      if (e.code !== "Space" && e.key !== " ") return;

      const target = e.target;
      const tag = target.tagName;
      const isEditable =
        target.isContentEditable || tag === "INPUT" || tag === "TEXTAREA";
      if (isEditable) return;

      e.preventDefault();
      if (timer.isRunning) {
        pauseBtn?.click();
      } else {
        startBtn?.click();
      }
    });
  }

  function bootstrap() {
    timer.onTick = handleTick;
    timer.onModeChange = handleModeChange;
    timer.onComplete = handleComplete;

    initDarkMode();
    initZenMode();
    initSoundSettings();
    syncDurationsFromInputs();
    attachEvents();
    timer.switchMode("work");
  }

  return {
    bootstrap,
    syncDurationsFromInputs
  };
}
