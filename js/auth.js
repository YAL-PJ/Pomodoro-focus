// Listen for the "Save profile" form submission
const authForm = document.getElementById('authForm');

if (authForm) {
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Stop the page from reloading
    
    const emailInput = document.getElementById('authEmail');
    const email = emailInput.value;
    const btn = authForm.querySelector('button');
    const originalText = btn.innerText;

    // 1. Show loading state
    btn.innerText = "Sending...";
    btn.disabled = true;

    // 2. Ask Supabase to send a Magic Link
    // 'db' comes from the db.js file we created earlier
    const { error } = await db.auth.signInWithOtp({ email });

    if (error) {
      alert("Error logging in: " + error.message);
      btn.innerText = originalText;
      btn.disabled = false;
    } else {
      alert("Magic link sent! Please check your email to finish logging in.");
      btn.innerText = "Sent!";
      emailInput.value = ""; // Clear the box
    }
  });
}
