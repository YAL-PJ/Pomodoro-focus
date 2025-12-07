const STORAGE_KEY = "freemium_state_v1";
export const DEFAULT_STATE = {
  plan: "basic",
  userEmail: "",
  lastUpdated: new Date().toISOString()
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STATE,
      ...parsed,
      plan: parsed.plan === "pro" ? "pro" : "basic"
    };
  } catch (err) {
    console.warn("Failed to load freemium state", err);
    return { ...DEFAULT_STATE };
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function createFreemiumState() {
  let state = loadState();
  const subscribers = new Set();

  function emit() {
    saveState(state);
    subscribers.forEach(cb => cb(state));
  }

  function isPro() {
    return state.plan === "pro";
  }

  function setPlan(plan) {
    state = {
      ...state,
      plan: plan === "pro" ? "pro" : "basic",
      lastUpdated: new Date().toISOString()
    };
    emit();
  }

  function setEmail(email) {
    state = { ...state, userEmail: email, lastUpdated: new Date().toISOString() };
    emit();
  }

  function reset() {
    state = { ...DEFAULT_STATE, lastUpdated: new Date().toISOString() };
    emit();
  }

  function onChange(cb) {
    subscribers.add(cb);
    cb(state);
    return () => subscribers.delete(cb);
  }

  function getState() {
    return state;
  }

  return {
    getState,
    isPro,
    setPlan,
    setEmail,
    reset,
    onChange
  };
}
