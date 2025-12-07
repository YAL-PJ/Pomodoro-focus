import { timer, freemium } from "./main.js";
import { STORAGE_KEYS, loadJson, saveJson } from "./storage.js";
import { createSoundController } from "./sound-controller.js";

const soundController = createSoundController({
  loadSettings: () => loadJson(STORAGE_KEYS.SOUND_SETTINGS, null),
  saveSettings: settings => saveJson(STORAGE_KEYS.SOUND_SETTINGS, settings),
  toggles: {
    master: document.getElementById("masterSoundToggle"),
    tick: document.getElementById("tickSoundToggle"),
    happyTick: document.getElementById("happyTickSoundToggle"),
    minute: document.getElementById("minuteSoundToggle"),
    fiveMinute: document.getElementById("fiveMinuteSoundToggle"),
    completion: document.getElementById("completionSoundToggle")
  }
});

soundController.syncUIFromStorage();
soundController.bindToggleListeners();
timer.addTickListener(soundController.handleTick);
timer.addCompleteListener(soundController.handleComplete);

let proUnsubscribers = [];

function attachProExtras() {
  if (proUnsubscribers.length) return;

  const notifyOnComplete = payload => {
    if (payload.mode !== "work") return;
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      new Notification("Pomodoro complete", {
        body: "Great job! Time for a break.",
        tag: "pomodoro-complete"
      });
      return;
    }
    if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          new Notification("Pomodoro complete", {
            body: "Great job! Time for a break.",
            tag: "pomodoro-complete"
          });
        }
      });
    }
  };

  const trackAnalytics = payload => {
    console.debug("[analytics] session complete", payload);
  };

  proUnsubscribers = [
    timer.addCompleteListener(notifyOnComplete),
    timer.addCompleteListener(trackAnalytics)
  ];
}

function detachProExtras() {
  proUnsubscribers.forEach(unsub => unsub?.());
  proUnsubscribers = [];
}

if (freemium.isPro()) {
  attachProExtras();
}

freemium.onChange(state => {
  if (state.plan === "pro") {
    attachProExtras();
  } else {
    detachProExtras();
  }
});
