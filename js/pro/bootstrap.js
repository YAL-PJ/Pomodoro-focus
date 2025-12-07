import { createPlanningManager } from "./planning.js";
import { createProSyncBootstrap } from "./sync-bootstrap.js";

export function createProBootstrap(config) {
  const { freemium, getState, setProjects, setTasks, setSessions, setGoals, setIdeas, renderers, statusLabel } = config;

  const planning = createPlanningManager({
    freemium,
    getProjects: () => getState().projects,
    getSessions: () => getState().sessions,
    getGoals: () => getState().goals,
    setGoals,
    getIdeas: () => getState().ideas,
    setIdeas,
    queueSyncChanges: () => sync.queueSyncChanges()
  });

  const sync = createProSyncBootstrap({
    freemium,
    getState,
    setProjects,
    setTasks,
    setSessions,
    setGoals,
    setIdeas,
    renderers: {
      ...renderers,
      renderGoals: () => planning.renderGoals(),
      renderIdeas: () => planning.renderIdeas(),
      renderAnalytics: () => planning.renderAnalytics(),
      renderProjectsSelect: () => {
        renderers.renderProjectsSelect?.();
        planning.renderPlanningSelects();
      }
    },
    statusLabel
  });

  function mount() {
    sync.mount();
    planning.mount();
  }

  function unmount() {
    planning.unmount();
    sync.unmount();
  }

  const unsubscribe = freemium.onChange(state => {
    if (state.plan === "pro") {
      mount();
    } else {
      unmount();
    }
  });

  return {
    planning,
    sync,
    mount,
    unmount,
    destroy: unsubscribe
  };
}
