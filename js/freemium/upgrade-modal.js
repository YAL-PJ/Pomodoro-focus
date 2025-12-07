export function createUpgradeModal({ setPlan }) {
  let upgradeModal = null;
  let upgradeBackdrop = null;

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

  function bindUpgradeTriggers() {
    document.body.addEventListener("click", e => {
      const trigger = e.target.closest("[data-upgrade-trigger]");
      if (!trigger) return;
      showUpgradeModal();
    });
  }

  function init() {
    wireUpgradeModal();
    bindUpgradeTriggers();
  }

  return {
    init,
    showUpgradeModal,
    hideUpgradeModal
  };
}
