// Create a single Supabase client that the rest of the app can reuse.
(function initializeSupabaseClient() {
  if (!window.supabaseClient && window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
    window.supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  }

  const client = window.supabaseClient;

  if (!client) {
    console.warn('Supabase client could not be initialized. Check config.js for URL/key values.');
    return;
  }

  window.db = client;
  console.log('Supabase client initialized', client);
})();
