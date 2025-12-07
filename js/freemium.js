const STORAGE_KEY = "freemium_state_v1";
const DEFAULT_STATE = {
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

function addOverlay(element) {
  if (element.querySelector(".lock-overlay")) return;
  const overlay = document.createElement("div");
  overlay.className = "lock-overlay";
  overlay.innerHTML = `
    <div class="lock-overlay__content">
      <div class="lock-overlay__icon">🔒</div>
      <div class="lock-overlay__text">Pro feature</div>
      <button class="lock-overlay__cta" data-upgrade-trigger type="button">Upgrade to Pro</button>
    </div>
  `;
  element.appendChild(overlay);
}

function removeOverlay(element) {
  const overlay = element.querySelector(".lock-overlay");
  if (overlay) overlay.remove();
}

export function createFreemiumManager() {
  let state = loadState();
  const subscribers = new Set();
  let upgradeModal = null;
  let upgradeBackdrop = null;

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
    applyFeatureGates();
  }

  function setEmail(email) {
    state = { ...state, userEmail: email, lastUpdated: new Date().toISOString() };
    emit();
  }

  function onChange(cb) {
    subscribers.add(cb);
    cb(state);
    return () => subscribers.delete(cb);
  }

  function applyFeatureGates() {
    const gated = document.querySelectorAll("[data-tier='pro']");
    gated.forEach(el => {
      const locked = !isPro();
      el.classList.toggle("is-locked", locked);
      if (locked) {
        addOverlay(el);
      } else {
        removeOverlay(el);
      }
    });

    applyLayoutState();
  }

  function showUpgradeModal() {
    if (!upgradeModal) return;
    upgradeModal.classList.add("is-visible");
    upgradeBackdrop?.classList.add("is-visible");
  }

  function hideUpgradeModal() {
    if (!upgradeModal) return;
    upgradeModal.classList.remove("is-visible");
    upgradeBackdrop?.classList.remove("is-visible");
  }

  function wireUpgradeModal() {
    upgradeModal = document.getElementById("upgradeModal");
    upgradeBackdrop = document.querySelector("#upgradeModal .modal-backdrop");
    const closeButtons = document.querySelectorAll("#upgradeModal [data-close]");
    closeButtons.forEach(btn => btn.addEventListener("click", hideUpgradeModal));
    upgradeBackdrop?.addEventListener("click", hideUpgradeModal);
    const demoButtons = document.querySelectorAll("[data-activate-pro]");
    demoButtons.forEach(btn =>
      btn.addEventListener("click", () => {
        setPlan("pro");
        hideUpgradeModal();
      })
    );
  }

  function attachUpgradeTriggers() {
    document.body.addEventListener("click", e => {
      const trigger = e.target.closest("[data-upgrade-trigger]");
      if (!trigger) return;
      showUpgradeModal();
    });
  }

  function requirePro(featureName = "this feature") {
    if (isPro()) return true;
    showUpgradeModal();
    const toast = document.getElementById("freemiumNudge");
    if (toast) {
      toast.textContent = `${featureName} is a Pro feature. Upgrade to unlock cloud sync and planning tools.`;
      toast.classList.add("is-visible");
      setTimeout(() => toast.classList.remove("is-visible"), 3200);
    }
    return false;
  }

  function updateTopBar() {
    const pill = document.getElementById("planPill");
    const badge = document.getElementById("userBadge");
    const upgradeButtons = document.querySelectorAll("[data-upgrade-trigger]");
    if (pill) {
      pill.textContent = isPro() ? "Pro plan" : "Basic (free) plan";
      pill.classList.toggle("pill-pro", isPro());
    }
    if (badge) {
      badge.textContent = state.userEmail || "Guest";
      badge.classList.toggle("badge-pro", isPro());
    }
    upgradeButtons.forEach(btn => {
      btn.textContent = isPro() ? "Pro active" : btn.dataset.upgradeLabel || "Upgrade to Pro";
      btn.disabled = isPro();
      btn.setAttribute("aria-disabled", String(isPro()));
    });
  }

  function initTopBar() {
    const authForm = document.getElementById("authForm");
    const emailInput = document.getElementById("authEmail");
    const logoutBtn = document.getElementById("logoutBtn");

    if (authForm && emailInput) {
      authForm.addEventListener("submit", e => {
        e.preventDefault();
        const email = emailInput.value.trim();
        if (!email) return;
        setEmail(email);
        setPlan("basic");
        emailInput.value = "";
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", e => {
        e.preventDefault();
        state = { ...DEFAULT_STATE, lastUpdated: new Date().toISOString() };
        emit();
        applyFeatureGates();
      });
    }
  }

  function applyLayoutState() {
    const isBasic = !isPro();
    document.body.classList.toggle("plan-basic", isBasic);
    document.body.classList.toggle("plan-pro", !isBasic);

    const basicOnlyBlocks = document.querySelectorAll("[data-basic-only]");
    basicOnlyBlocks.forEach(el => {
      el.classList.toggle("is-visible", isBasic);
    });
  }

  function bootstrap() {
    wireUpgradeModal();
    attachUpgradeTriggers();
    initTopBar();
    applyFeatureGates();
    onChange(updateTopBar);
  }

  return {
    bootstrap,
    onChange,
    requirePro,
    isPro,
    setPlan,
    setEmail,
    showUpgradeModal
  };
}
