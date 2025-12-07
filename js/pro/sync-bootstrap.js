import { STORAGE_KEYS, saveJson } from "../storage.js";
import { createSyncManager, mergeCollections } from "../sync.js";

export function createProSyncBootstrap({
  freemium,
  getState,
  setProjects,
  setTasks,
  setSessions,
  setGoals,
  setIdeas,
  renderers = {},
  statusLabel
}) {
  let syncManager = null;

  function applyRemoteState(remote) {
    const state = getState();
    if (remote.projects) {
      setProjects(mergeCollections(state.projects, remote.projects), { skipSync: true });
    }
    if (remote.tasks) {
      setTasks(mergeCollections(state.tasks, remote.tasks), { skipSync: true });
    }
    if (remote.sessions) {
      setSessions(mergeCollections(state.sessions, remote.sessions), { skipSync: true });
    }
    if (remote.goals) {
      setGoals(mergeCollections(state.goals, remote.goals), { skipSync: true });
    }
    if (remote.ideas) {
      setIdeas(mergeCollections(state.ideas, remote.ideas), { skipSync: true });
    }

    renderers.renderProjectsSelect?.();
    renderers.renderProjectsTable?.();
    renderers.renderTasks?.();
    renderers.updateDailyProgressUI?.();
    renderers.renderProgressGraphUI?.();
    renderers.renderGoals?.();
    renderers.renderIdeas?.();
    renderers.renderAnalytics?.();
  }

  function onStatusChange(status) {
    if (statusLabel) {
      statusLabel.textContent = status;
      saveJson(STORAGE_KEYS.LAST_SYNC, { status, at: new Date().toISOString() });
    }
  }

  function mount() {
    if (syncManager || !freemium.isPro()) return;
    syncManager = createSyncManager({
      freemium,
      getState,
      applyRemoteState,
      onStatusChange
    });
    syncManager.bootstrap();
  }

  function unmount() {
    syncManager = null;
  }

  return {
    mount,
    unmount,
    applyRemoteState,
    queueSyncChanges: () => syncManager?.queueSync?.(),
    syncDown: () => syncManager?.syncDown?.(),
    syncUp: () => syncManager?.syncUp?.()
  };
}
