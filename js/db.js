// Access the library we loaded in index.html
const { createClient } = supabase;

// Create the database client using keys from config.js
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("Supabase client initialized", db);