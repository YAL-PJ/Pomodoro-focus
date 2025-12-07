// Basic Supabase auth helpers for the freemium experience.
(function wireAuthUI() {
  const client = window.db;
  if (!client) {
    console.warn('Auth is disabled because Supabase client was not found.');
    return;
  }

  const authForm = document.getElementById('authForm');
  const emailInput = document.getElementById('authEmail');
  const logoutBtn = document.getElementById('logoutBtn');
  const planPill = document.getElementById('planPill');
  const userBadge = document.getElementById('userBadge');

  function setFreemiumEmail(email) {
    if (window.freemium && typeof window.freemium.setEmail === 'function') {
      window.freemium.setEmail(email || '');
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
  }

  async function handleLogin(e) {
    e.preventDefault();
    if (!emailInput) return;

    const email = emailInput.value.trim();
    if (!email) return;

    const btn = authForm.querySelector('button');
    const originalText = btn?.innerText;

    if (btn) {
      btn.innerText = 'Sending...';
      btn.disabled = true;
    }

    const { error } = await client.auth.signInWithOtp({ email });

    if (error) {
      alert('Error logging in: ' + error.message);
      if (btn) {
        btn.innerText = originalText;
        btn.disabled = false;
      }
    } else {
      alert('Magic link sent! Please check your email to finish logging in.');
      if (btn) {
        btn.innerText = 'Sent!';
      }
      emailInput.value = '';
    }
  }

  async function handleLogout() {
    await client.auth.signOut();
  }

  if (authForm) {
    authForm.addEventListener('submit', handleLogin);
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  client.auth.onAuthStateChange((event, session) => {
    updateAuthUI(session);
  });

  client.auth.getSession().then(({ data }) => updateAuthUI(data.session));
})();
