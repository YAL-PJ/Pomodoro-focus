// Lightweight payments helper that calls Supabase Edge Functions for checkout/portal flows.
(function initPayments() {
  const client = window.db;
  if (!client) {
    console.warn('Payments are disabled because Supabase client was not found.');
    return;
  }

  const checkoutButtons = document.querySelectorAll('[data-checkout-plan]');
  const portalButtons = document.querySelectorAll('[data-billing-portal]');

  function setLoading(btn, isLoading, text = 'Working...') {
    if (!btn) return;
    btn.disabled = isLoading;
    btn.dataset.originalText = btn.dataset.originalText || btn.innerText;
    btn.innerText = isLoading ? text : btn.dataset.originalText;
  }

  function showToast(message) {
    const toast = document.getElementById('freemiumNudge');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    setTimeout(() => toast.classList.remove('is-visible'), 3200);
  }

  async function startCheckout(priceId, btn) {
    setLoading(btn, true, 'Redirecting...');
    const { data, error } = await client.functions.invoke('create-checkout', {
      body: { priceId }
    });
    setLoading(btn, false);

    if (error || !data?.url) {
      console.error('Checkout error', error);
      showToast(error?.message || 'Checkout unavailable. Try again later.');
      return;
    }

    window.location.href = data.url;
  }

  async function openPortal(btn) {
    setLoading(btn, true, 'Opening portal...');
    const { data, error } = await client.functions.invoke('billing-portal');
    setLoading(btn, false);

    if (error || !data?.url) {
      console.error('Portal error', error);
      showToast(error?.message || 'Billing portal unavailable.');
      return;
    }

    window.location.href = data.url;
  }

  checkoutButtons.forEach(btn =>
    btn.addEventListener('click', () => startCheckout(btn.dataset.checkoutPlan, btn))
  );

  portalButtons.forEach(btn => btn.addEventListener('click', () => openPortal(btn)));
})();
