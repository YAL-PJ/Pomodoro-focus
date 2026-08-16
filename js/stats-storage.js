const KEY = "cat_desk_menace_v1";
const DAY_MS = 86_400_000;

function createDefaults() {
  return {
    coins: 30,
    focusMinutes: 0,
    completed: 0,
    broken: 0,
    streak: 0,
    saved: [],
    unlocked: ["glass"],
    selected: "glass",
    cosmetics: [],
    equippedCosmetic: null,
    secrets: [],
    settings: { ambient: false, scanlines: false, theme: "auto" },
    lastCompleted: null
  };
}

export class StatsStorage {
  constructor(store = globalThis.localStorage) { this.store = store; }

  load() {
    const defaults = createDefaults();
    try {
      const saved = JSON.parse(this.store?.getItem(KEY) || "{}");
      return {
        ...defaults,
        ...saved,
        saved: Array.isArray(saved.saved) ? saved.saved : defaults.saved,
        unlocked: Array.isArray(saved.unlocked) ? saved.unlocked : defaults.unlocked,
        cosmetics: Array.isArray(saved.cosmetics) ? saved.cosmetics : defaults.cosmetics,
        secrets: Array.isArray(saved.secrets) ? saved.secrets : defaults.secrets,
        settings: { ...defaults.settings, ...(saved.settings || {}) }
      };
    } catch {
      return defaults;
    }
  }

  save(state) { this.store?.setItem(KEY, JSON.stringify(state)); }

  complete(state, item, minutes, now = new Date()) {
    const day = now.toISOString().slice(0, 10);
    const prior = state.lastCompleted ? new Date(`${state.lastCompleted}T00:00:00Z`) : null;
    const difference = prior ? Math.round((Date.parse(`${day}T00:00:00Z`) - prior.getTime()) / DAY_MS) : null;
    state.coins += 10;
    state.completed += 1;
    state.focusMinutes += minutes;
    state.saved.push(item);
    if (difference === null || difference === 1) state.streak += 1;
    else if (difference > 1) state.streak = 1;
    state.lastCompleted = day;
    this.save(state);
    return state;
  }

  /** Returns true only the first time a given secret is discovered. */
  unlockSecret(state, id) {
    if (state.secrets.includes(id)) return false;
    state.secrets.push(id);
    this.save(state);
    return true;
  }

  recordBreakage(state) {
    state.broken += 1;
    this.save(state);
    return state;
  }
}
