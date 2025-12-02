# Freemium Next Step

## What’s already implemented
- Feature gating is wired: UI elements marked with `data-tier="pro"` automatically show a lock overlay for free users. (Checklist: Phase 3 – feature-gating helper)
- Pro upgrade messaging exists via the Focus Pro modal and pricing cards, giving users a clear “what you get with Pro” explanation. (Checklist: Phase 3 – upgrade messaging)

## Next step to tackle
Start **Phase 1: Foundation Setup** by standing up the Supabase project and baseline schema. This unblocks authentication, data sync, and payments work that follows.

### Concrete actions
1. Create a Supabase project and capture the project URL, anon/public keys, and region.
2. Define core tables: `profiles`, `projects`, `tasks`, `pomodoro_sessions`; and Pro tables: `goals`, `ideas` with sensible defaults.
3. Enable Row Level Security on all tables and add per-user CRUD policies.
4. Add a trigger to insert a `profiles` row on new auth user signup.
