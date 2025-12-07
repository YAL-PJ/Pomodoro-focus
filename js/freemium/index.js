import { createFreemiumState } from "./state.js";
import { createUiGates } from "./ui-gates.js";
import { createUpgradeModal } from "./upgrade-modal.js";

export function createFreemiumManager() {
  const state = createFreemiumState();
  const uiGates = createUiGates({ isPro: state.isPro, onChange: state.onChange });
  const upgradeModal = createUpgradeModal({ setPlan: state.setPlan });

  function requirePro(featureName = "this feature") {
    if (state.isPro()) return true;
    upgradeModal.showUpgradeModal();
    const toast = document.getElementById("freemiumNudge");
    if (toast) {
      toast.textContent = `${featureName} is a Pro feature. Upgrade to unlock cloud sync and planning tools.`;
      toast.classList.add("is-visible");
      setTimeout(() => toast.classList.remove("is-visible"), 3200);
    }
    return false;
  }

  function updateTopBar(currentState) {
    const pill = document.getElementById("planPill");
    const badge = document.getElementById("userBadge");
    const upgradeButtons = document.querySelectorAll("[data-upgrade-trigger]");
    const pro = currentState?.plan === "pro";
    if (pill) {
      pill.textContent = pro ? "Pro plan" : "Basic (free) plan";
      pill.classList.toggle("pill-pro", pro);
    }
    if (badge) {
      badge.textContent = currentState?.userEmail || "Guest";
      badge.classList.toggle("badge-pro", pro);
    }
    upgradeButtons.forEach(btn => {
      btn.textContent = pro ? "Pro active" : btn.dataset.upgradeLabel || "Upgrade to Pro";
      btn.disabled = pro;
      btn.setAttribute("aria-disabled", String(pro));
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
        state.setEmail(email);
        state.setPlan("basic");
        emailInput.value = "";
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", e => {
        e.preventDefault();
        state.reset();
      });
    }
  }

  function bootstrap() {
    upgradeModal.init();
    uiGates.init();
    initTopBar();
    state.onChange(updateTopBar);
  }

  return {
    bootstrap,
    onChange: state.onChange,
    requirePro,
    isPro: state.isPro,
    setPlan: state.setPlan,
    setEmail: state.setEmail,
    showUpgradeModal: upgradeModal.showUpgradeModal
  };
}
