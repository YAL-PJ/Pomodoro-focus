// Supabase auth UI wiring for login, signup, and password reset flows.
(function wireAuthUI() {
  const client = window.db;
  if (!client) {
    console.warn('Auth is disabled because Supabase client was not found.');
    return;
  }

  const freemium = window.freemium;

  const authModal = document.getElementById('authModal');
  const authBackdrop = authModal?.querySelector('.modal-backdrop');
  const modalCloseButtons = authModal?.querySelectorAll('[data-close]') || [];

  const authTabButtons = authModal?.querySelectorAll('.auth-tab') || [];
  const authTabTriggers = authModal?.querySelectorAll('[data-auth-tab]') || [];
  const authViews = authModal?.querySelectorAll('[data-auth-view]') || [];

  const authTriggerButtons = document.querySelectorAll('[data-auth-trigger]');
  const authForm = document.getElementById('authForm');
  const emailInput = document.getElementById('authEmail');
  const logoutBtn = document.getElementById('logoutBtn');
  const planPill = document.getElementById('planPill');
  const userBadge = document.getElementById('userBadge');

  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const resetForm = document.getElementById('resetForm');

  function setFreemiumEmail(email) {
    if (freemium && typeof freemium.setEmail === 'function') {
      freemium.setEmail(email || '');
    }
  }

  function setFreemiumPlanFromProfile(profile) {
    const status = profile?.subscription_status || profile?.plan || '';
    const isPro = status === 'active' || status === 'trialing' || status === 'pro';
    if (freemium && typeof freemium.setPlan === 'function') {
      freemium.setPlan(isPro ? 'pro' : 'basic');
    }
  }

  function toggleAuthModal(show) {
    if (!authModal) return;
    authModal.classList.toggle('is-visible', show);
    authBackdrop?.classList.toggle('is-visible', show);
  }

  function activateTab(target) {
    authTabButtons.forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.authTab === target);
    });
    authViews.forEach(view => {
      view.classList.toggle('is-active', view.dataset.authView === target);
    });
  }

  function setLoading(btn, isLoading, loadingText = 'Working...') {
    if (!btn) return;
    btn.disabled = isLoading;
    btn.dataset.originalText = btn.dataset.originalText || btn.innerText;
    btn.innerText = isLoading ? loadingText : btn.dataset.originalText;
  }

  function showToast(message) {
    const toast = document.getElementById('freemiumNudge');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    setTimeout(() => toast.classList.remove('is-visible'), 3200);
  }

  async function fetchProfile(user) {
    if (!user) return;
    const { data, error } = await client
      .from('profiles')
      .select('id, email, subscription_status, plan')
      .eq('id', user.id)
      .single();

    if (error) {
      console.warn('Profile fetch skipped', error.message);
      return;
    }

    if (data) {
      setFreemiumEmail(data.email || user.email);
      setFreemiumPlanFromProfile(data);
    }
  }

  function updateAuthUI(session) {
    const isLoggedIn = !!session?.user;
    const email = session?.user?.email || '';

    if (authForm) authForm.style.display = isLoggedIn ? 'none' : 'flex';
    if (logoutBtn) logoutBtn.style.display = isLoggedIn ? 'inline-flex' : 'none';
    if (userBadge) userBadge.textContent = isLoggedIn ? email : 'Guest';
    if (planPill) planPill.textContent = isLoggedIn ? 'Pro-ready (auth linked)' : 'Basic (free) plan';

    setFreemiumEmail(email);
    if (isLoggedIn) {
      fetchProfile(session.user);
    } else if (freemium && typeof freemium.setPlan === 'function') {
      freemium.setPlan('basic');
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(loginForm);
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '').trim();
    if (!email || !password) return;

    const submitBtn = loginForm.querySelector('button[type="submit"]');
    setLoading(submitBtn, true, 'Signing in...');

    const { error } = await client.auth.signInWithPassword({ email, password });
    setLoading(submitBtn, false);

    if (error) {
      showToast(error.message || 'Unable to log in');
    } else {
      toggleAuthModal(false);
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    const formData = new FormData(signupForm);
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '').trim();
    if (!email || !password) return;

    const submitBtn = signupForm.querySelector('button[type="submit"]');
    setLoading(submitBtn, true, 'Creating...');

    const { error } = await client.auth.signUp({ email, password });
    setLoading(submitBtn, false);

    if (error) {
      showToast(error.message || 'Unable to sign up');
    } else {
      showToast('Check your email to confirm your account.');
      toggleAuthModal(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    const formData = new FormData(resetForm);
    const email = String(formData.get('email') || '').trim();
    if (!email) return;

    const submitBtn = resetForm.querySelector('button[type="submit"]');
    setLoading(submitBtn, true, 'Sending...');

    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.href
    });
    setLoading(submitBtn, false);

    if (error) {
      showToast(error.message || 'Unable to send reset link');
    } else {
      showToast('Reset email sent. Check your inbox.');
      activateTab('login');
    }
  }

  async function handleLogout() {
    await client.auth.signOut();
  }

  // Inline email capture (kept for Basic users without signing in)
  if (authForm) {
    authForm.addEventListener('submit', e => {
      e.preventDefault();
      const email = emailInput?.value?.trim();
      if (!email) return;
      setFreemiumEmail(email);
      freemium?.setPlan?.('basic');
      emailInput.value = '';
      showToast('Email saved locally. Sign up to sync across devices.');
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (signupForm) signupForm.addEventListener('submit', handleSignup);
  if (resetForm) resetForm.addEventListener('submit', handleReset);

  authTabTriggers.forEach(btn =>
    btn.addEventListener('click', () => activateTab(btn.dataset.authTab))
  );

  modalCloseButtons.forEach(btn => btn.addEventListener('click', () => toggleAuthModal(false)));
  authBackdrop?.addEventListener('click', () => toggleAuthModal(false));
  authTriggerButtons.forEach(btn =>
    btn.addEventListener('click', () => {
      activateTab(btn.dataset.authDefaultTab || 'login');
      toggleAuthModal(true);
    })
  );

  client.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') activateTab('update');
    updateAuthUI(session);
  });

  client.auth.getSession().then(({ data }) => updateAuthUI(data.session));
})();
