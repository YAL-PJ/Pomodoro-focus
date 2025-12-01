export const STORAGE_KEYS = {
  DARK_MODE: "focus_dark_mode",
  SOUND_SETTINGS: "focus_sound_settings",
  PROJECTS: "focus_projects_v1",
  SESSIONS: "focus_sessions_v1",
  ACTIVE_PROJECT: "focus_active_project",
  TASKS: "focus_tasks_v1"
};

export function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors etc.
  }
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
