// Supabase configuration for the Focus Pomodoro freemium rollout.
// Expose URL/key on window so inline scripts and non-module files can use them.
(function bootstrapSupabaseConfig() {
  const SUPABASE_URL = 'https://leaccpgbhzbfifdvbrrv.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxlYWNjcGdiaHpiZmlmZHZicnJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODcxNjksImV4cCI6MjA4MDI2MzE2OX0.sB7Tp2kEkrWzLJbFHpdRyXikdMsGoTKXjJZVc22OnqA';

  if (!window.supabase) {
    console.warn('Supabase library not found on window. Ensure @supabase/supabase-js CDN script loads first.');
    return;
  }

  // Attach to window for other scripts (db.js, auth.js) to consume.
  window.SUPABASE_URL = SUPABASE_URL;
  window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
})();
