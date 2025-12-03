# Freemium Transformation Checklist

Use this list to track every step for turning Focus Pomodoro into a freemium product with Basic (free) and Pro tiers.

## Phase 1: Foundation Setup
- [ ] Stand up Supabase project (capture project URL/anon key, region settings).
- [ ] Create core database tables (profiles, projects, tasks, pomodoro_sessions) plus Pro tables (goals, ideas) with sensible defaults.
- [ ] Enable RLS on all tables and add per-user CRUD policies.
- [ ] Add trigger to create a profile row on new auth user signup.
- [ ] Open Stripe account, define monthly ($4.99) and yearly ($39.99) products/prices, and note test/live API keys and webhook endpoint.
- [ ] Finalize feature matrix for Free vs Pro (timer/tasks vs. projects/goals/ideas/analytics/cloud sync) and share with all teams.
- [ ] Produce auth UI, upgrade prompt, and pricing mockups.

## Phase 2: Authentication
- [ ] Add Supabase JS client config and wiring to the frontend.
- [ ] Build login/signup/forgot-password modals and header entry points; show user menu when authenticated.
- [ ] Implement auth flows (signup, login, logout, password reset) with session persistence and auto-refresh.
- [ ] Configure Supabase Auth (email templates, redirect URLs, optional OAuth) and a helper to fetch user profile + subscription status.

## Phase 3: Free Tier UI Simplification
- [x] Introduce a user state manager and feature-gating helper that marks Pro-only elements.
- [x] Tag Pro UI with data attributes and add locked overlays that route to upgrade prompts when clicked.
- [ ] Create simplified free layout (timer + basic tasks + settings) and hide Pro areas (projects, progress graphs, archives) for free users.
- [x] Design upgrade messaging and “what you get with Pro” cards for locked states.

## Phase 4: Pro Feature Implementation
- [ ] Add data sync layer that saves to Supabase for Pro users and localStorage for Free users.
- [ ] Implement Projects CRUD with archive/unarchive and Supabase sync.
- [ ] Build Goals (daily/weekly/long-term) UI and CRUD tied to projects, with progress tracking.
- [ ] Build Ideas inbox with quick add, priority, project linking, and convert-to-task flow.
- [ ] Expand analytics: 30/90-day progress graph, daily/weekly/monthly counts, per-project time, streaks, heatmap, export option.
- [ ] Implement cloud sync: initial load on login, real-time updates via Supabase subscriptions, offline queueing, and conflict handling.
- [ ] Add backend helpers/edge functions for analytics queries and data export.

## Phase 5: Payments
- [ ] Create payments module that calls Supabase Edge Functions to start Stripe Checkout.
- [ ] Write `create-checkout` Edge Function to create customers/subscriptions, pass price IDs, and redirect users.
- [ ] Write webhook handler to update subscription status/customer IDs in `profiles` on invoice paid/failed, cancellations, renewals.
- [ ] Update UI to reflect subscription state (active, past_due, canceled) and gate features accordingly.
- [ ] Provide account portal/manage billing link for Pro users; handle downgrades and grace periods.

## Phase 6: Polish & Launch
- [ ] Add upgrade prompts in key moments (on locked features, after X pomodoros, onboarding tour).
- [ ] Optimize mobile responsiveness for new modals and layouts.
- [ ] Add DB indexes, monitoring/logging (e.g., Sentry), and Supabase backups; document recovery steps.
- [ ] Test payment flows end-to-end in Stripe test mode; switch to live keys and re-run smoke tests.
- [ ] Update marketing site with pricing, feature highlights, OG/meta tags, and legal pages (ToS/Privacy/Cookies).
- [ ] Instrument analytics for signup, checkout, and feature usage conversion funnel.

## Launch Success Targets
- [ ] Post-launch: aim for 100 signups and 5 paid conversions in week 1, ~50 paid users (~$228 net/month) at steady state.
- [ ] Monitor conversion rate; A/B test pricing or trial if uptake is low.
