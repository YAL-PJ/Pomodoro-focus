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
import { PomodoroTimer } from "./timer.js";
import { createSoundEngine } from "./sound.js";
import { createFreemiumManager } from "./freemium.js";
import { STORAGE_KEYS, loadJson, saveJson } from "./storage.js";
import { createSyncManager, mergeCollections } from "./sync.js";
import { createTimerController } from "./timer-controller.js";
import {
  createProjectsTasksBasic,
  createProjectsTasksPro
} from "./projects-tasks.js";

const freemium = createFreemiumManager();
window.freemium = freemium;

const soundEngine = createSoundEngine();
const timer = new PomodoroTimer();

let analyticsModule = null;

const syncStatusLabel = document.getElementById("syncStatusLabel");
const syncNowBtn = document.getElementById("syncNowBtn");

const feedbackToggle = document.getElementById("feedbackToggle");
const feedbackModal = document.getElementById("feedbackModal");

let syncManager = null;

const basic = createProjectsTasksBasic({
  freemium,
  queueSyncChanges: () => syncManager?.queueSync?.()
});

const timerController = createTimerController({
  timer,
  soundEngine,
  loadJson,
  saveJson,
  onComplete: payload => handleTimerComplete(payload)
});

function handleTimerComplete(payload) {
  if (payload.mode !== "work") return;

  const now = new Date().toISOString();
  const session = {
    id: `s-${Date.now().toString(36)}`,
    projectId: basic.getActiveProjectId(),
    taskId: basic.getActiveTaskId(),
    mode: "work",
    durationSeconds: payload.durationSeconds,
    completedAt: payload.completedAt || now,
    createdAt: now,
    updatedAt: now
  };
  basic.addSession(session);
  basic.updateDailyProgressUI();
  basic.updateProjectsTableUI();
  analyticsModule?.renderProgressGraphUI();
  analyticsModule?.renderAnalytics();
}

function initSyncManager() {
  syncManager = createSyncManager({
    freemium,
    getState: () => basic.getState(),
    applyRemoteState: remote => {
      const current = basic.getState();
      const merged = {
        projects: remote.projects
          ? mergeCollections(current.projects, remote.projects)
          : current.projects,
        tasks: remote.tasks
          ? mergeCollections(current.tasks, remote.tasks)
          : current.tasks,
        sessions: remote.sessions
          ? mergeCollections(current.sessions, remote.sessions)
          : current.sessions,
        goals: remote.goals
          ? mergeCollections(current.goals, remote.goals)
          : current.goals,
        ideas: remote.ideas
          ? mergeCollections(current.ideas, remote.ideas)
          : current.ideas
      };

      saveJson(STORAGE_KEYS.PROJECTS, merged.projects);
      saveJson(STORAGE_KEYS.TASKS, merged.tasks);
      saveJson(STORAGE_KEYS.SESSIONS, merged.sessions);
      saveJson(STORAGE_KEYS.GOALS, merged.goals);
      saveJson(STORAGE_KEYS.IDEAS, merged.ideas);

      basic.setState(merged);
      analyticsModule?.renderProgressGraphUI();
      analyticsModule?.renderAnalytics();
    },
    onStatusChange: status => {
      if (syncStatusLabel) {
        syncStatusLabel.textContent = status;
        saveJson(STORAGE_KEYS.LAST_SYNC, { status, at: new Date().toISOString() });
      }
    }
  });
}

function wireSyncControls() {
  if (syncNowBtn) {
    syncNowBtn.addEventListener("click", () => {
      if (!freemium.requirePro("Cloud sync")) return;
      syncStatusLabel.textContent = "Syncing...";
      syncManager.syncUp();
    });
  }

  const cachedSync = loadJson(STORAGE_KEYS.LAST_SYNC, null);
  if (cachedSync && syncStatusLabel) {
    syncStatusLabel.textContent = `${cachedSync.status} at ${new Date(
      cachedSync.at
    ).toLocaleTimeString()}`;
  }
}

function bootstrapFeedbackModal() {
  if (!feedbackToggle || !feedbackModal) return;
  const closeEls = feedbackModal.querySelectorAll("[data-close]");
  const backdrop = feedbackModal.querySelector(".modal-backdrop");

  function openModal() {
    feedbackModal.classList.add("is-open");
  }

  function closeModal() {
    feedbackModal.classList.remove("is-open");
  }

  feedbackToggle.addEventListener("click", openModal);
  closeEls.forEach(el => el.addEventListener("click", closeModal));
  if (backdrop) backdrop.addEventListener("click", closeModal);

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      closeModal();
    }
  });
}

async function bootstrapProModules() {
  const pro = createProjectsTasksPro({
    state: basic.state,
    queueSyncChanges: () => syncManager?.queueSync?.(),
    freemium,
    onProjectsUpdated: () => {
      basic.renderProjectsSelect();
      basic.updateCurrentProjectLabel();
      basic.updateDailyProgressUI();
      basic.updateProjectsTableUI();
      analyticsModule?.renderProgressGraphUI();
    },
    onSessionsUpdated: () => {
      basic.updateDailyProgressUI();
      analyticsModule?.renderProgressGraphUI();
    }
  });
  pro.bootstrap();

  const { createAnalytics } = await import("./analytics.js");
  analyticsModule = createAnalytics({ state: basic.state });
  analyticsModule.renderProgressGraphUI();
  analyticsModule.renderAnalytics();
}

function bootstrapBasic() {
  basic.bootstrap();
}

function bootstrapFreemium() {
  freemium.bootstrap();
}

function bootstrapTimer() {
  timerController.bootstrap();
}

function bootstrapApp() {
  bootstrapFreemium();
  bootstrapBasic();
  bootstrapTimer();
  initSyncManager();
  wireSyncControls();
  bootstrapFeedbackModal();
  timer.switchMode("work");
  syncManager.bootstrap();
  if (freemium.isPro()) {
    bootstrapProModules();
  }

  freemium.onChange(state => {
    if (state.plan === "pro" && !analyticsModule) {
      bootstrapProModules();
    }
  });
}

bootstrapApp();
