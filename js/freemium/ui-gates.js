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

export function createUiGates({ isPro, onChange }) {
  function applyLayoutState() {
    const basic = !isPro();
    document.body.classList.toggle("plan-basic", basic);
    document.body.classList.toggle("plan-pro", !basic);

    const basicOnlyBlocks = document.querySelectorAll("[data-basic-only]");
    basicOnlyBlocks.forEach(el => {
      el.classList.toggle("is-visible", basic);
    });
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

  function init() {
    onChange(applyFeatureGates);
  }

  return {
    init,
    applyFeatureGates
  };
}
