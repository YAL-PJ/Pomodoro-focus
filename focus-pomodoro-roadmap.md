# Focus Pomodoro — Freemium Implementation Roadmap

## Overview

**Goal:** Transform Focus Pomodoro from a free app into a freemium SaaS product.

| Tier | Features | Storage |
|------|----------|---------|
| **Basic (Free)** | Timer + Tasks | localStorage only |
| **Pro (Paid)** | Timer + Tasks + Projects + Goals + Planning + Analytics | Cloud sync (Supabase) |

**Tech Stack:**
- Frontend: Vanilla JS (existing)
- Backend: Supabase (Auth + PostgreSQL)
- Payments: Stripe
- Hosting: Netlify (existing)

---

## Team Structure

| Team | Responsibility |
|------|----------------|
| **Team A: Frontend/UI** | UI changes, feature gating, responsive design |
| **Team B: Backend/Infra** | Supabase setup, database schema, API layer |
| **Team C: Payments** | Stripe integration, subscription logic, webhooks |
| **Team D: Product/Design** | UX flows, copy, onboarding, marketing pages |

---

# Phase 1: Foundation Setup
**Duration:** 1 week  
**Blocker for:** All other phases

## Team B: Backend/Infra

### Task 1.1: Create Supabase Project
- [ ] Create Supabase account and project
- [ ] Note down project URL and anon key
- [ ] Configure project settings (region, etc.)

### Task 1.2: Design Database Schema
- [ ] Create `users` table (extends Supabase auth.users)
```sql
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  subscription_status TEXT DEFAULT 'free', -- 'free', 'active', 'canceled', 'past_due'
  subscription_id TEXT, -- Stripe subscription ID
  customer_id TEXT, -- Stripe customer ID
  subscription_ends_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

- [ ] Create `projects` table
```sql
CREATE TABLE public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#f97316',
  daily_goal INTEGER DEFAULT 4,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

- [ ] Create `tasks` table
```sql
CREATE TABLE public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

- [ ] Create `pomodoro_sessions` table
```sql
CREATE TABLE public.pomodoro_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  duration_minutes INTEGER NOT NULL,
  session_type TEXT DEFAULT 'work', -- 'work', 'short_break', 'long_break'
  completed_at TIMESTAMP DEFAULT NOW()
);
```

- [ ] Create `goals` table (Pro feature)
```sql
CREATE TABLE public.goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  goal_type TEXT DEFAULT 'long_term', -- 'daily', 'weekly', 'long_term'
  target_pomodoros INTEGER,
  deadline DATE,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

- [ ] Create `ideas` table (Pro feature)
```sql
CREATE TABLE public.ideas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Task 1.3: Set Up Row Level Security (RLS)
- [ ] Enable RLS on all tables
- [ ] Create policies so users can only access their own data
```sql
-- Example for projects table
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE USING (auth.uid() = user_id);
```
- [ ] Repeat for all tables

### Task 1.4: Create Database Functions
- [ ] Function to create profile on user signup (trigger)
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## Team C: Payments

### Task 1.5: Create Stripe Account
- [ ] Create Stripe account
- [ ] Get API keys (test + live)
- [ ] Set up webhook endpoint URL (will be Supabase Edge Function)

### Task 1.6: Create Stripe Products
- [ ] Create "Focus Pro Monthly" product ($4.99/month)
- [ ] Create "Focus Pro Yearly" product ($39.99/year)
- [ ] Note down Price IDs for both

---

## Team D: Product/Design

### Task 1.7: Define Free vs Pro Feature Matrix
- [ ] Document exact features for each tier:

| Feature | Free | Pro |
|---------|------|-----|
| Pomodoro Timer | ✅ | ✅ |
| Work/Short/Long break modes | ✅ | ✅ |
| Sound settings | ✅ | ✅ |
| Dark mode | ✅ | ✅ |
| Task list (basic) | ✅ | ✅ |
| localStorage persistence | ✅ | ✅ |
| Projects | ❌ | ✅ |
| Project goals | ❌ | ✅ |
| Archived projects | ❌ | ✅ |
| Progress graph (7 days) | ❌ | ✅ |
| Long-term goals | ❌ | ✅ |
| Ideas capture | ❌ | ✅ |
| Analytics & statistics | ❌ | ✅ |
| Cloud sync | ❌ | ✅ |
| Cross-device access | ❌ | ✅ |

### Task 1.8: Design Auth UI Mockups
- [ ] Login modal design
- [ ] Signup modal design
- [ ] Forgot password flow
- [ ] Account settings page

### Task 1.9: Design Upgrade Prompts
- [ ] "Upgrade to Pro" button placement
- [ ] Feature gate UI (what users see when clicking locked features)
- [ ] Pricing page/modal design

---

# Phase 2: Authentication
**Duration:** 1-2 weeks  
**Depends on:** Phase 1

## Team A: Frontend/UI

### Task 2.1: Add Supabase Client
- [ ] Install/add Supabase JS library
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```
- [ ] Create `js/supabase.js` config file
```javascript
const SUPABASE_URL = 'your-project-url';
const SUPABASE_ANON_KEY = 'your-anon-key';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export { supabase };
```

### Task 2.2: Create Auth UI Components
- [ ] Create login modal HTML/CSS
- [ ] Create signup modal HTML/CSS
- [ ] Add "Log in" / "Sign up" buttons to header
- [ ] Add user menu (when logged in) showing email + logout

### Task 2.3: Implement Auth Logic
- [ ] Create `js/auth.js` module
- [ ] Implement signup function
```javascript
async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });
  return { data, error };
}
```
- [ ] Implement login function
- [ ] Implement logout function
- [ ] Implement password reset function
- [ ] Implement auth state listener
```javascript
supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    // User logged in
    updateUIForLoggedInUser(session.user);
  } else {
    // User logged out
    updateUIForAnonymousUser();
  }
});
```

### Task 2.4: Implement Session Persistence
- [ ] Check for existing session on page load
- [ ] Auto-refresh tokens
- [ ] Handle session expiry gracefully

---

## Team B: Backend/Infra

### Task 2.5: Configure Supabase Auth
- [ ] Enable email/password auth
- [ ] Configure email templates (confirmation, reset password)
- [ ] Set up redirect URLs
- [ ] (Optional) Enable OAuth providers (Google, GitHub)

### Task 2.6: Create Profile Fetch Function
- [ ] Edge function or client query to get user profile + subscription status
```javascript
async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return { data, error };
}
```

---

# Phase 3: Free Tier UI Simplification
**Duration:** 1 week  
**Depends on:** Phase 2

## Team A: Frontend/UI

### Task 3.1: Create User State Manager
- [ ] Create `js/userState.js` module
```javascript
const userState = {
  isLoggedIn: false,
  isPro: false,
  user: null,
  profile: null
};

function updateUserState(session, profile) {
  userState.isLoggedIn = !!session;
  userState.user = session?.user || null;
  userState.profile = profile || null;
  userState.isPro = profile?.subscription_status === 'active';
  applyFeatureGates();
}
```

### Task 3.2: Implement Feature Gating
- [ ] Create `js/featureGates.js` module
```javascript
function applyFeatureGates() {
  const proElements = document.querySelectorAll('[data-pro-feature]');
  
  proElements.forEach(el => {
    if (userState.isPro) {
      el.classList.remove('locked');
      el.removeAttribute('disabled');
    } else {
      el.classList.add('locked');
      el.setAttribute('disabled', 'true');
    }
  });
}
```

### Task 3.3: Update HTML with Feature Markers
- [ ] Add `data-pro-feature` attribute to pro-only elements:
  - Projects section
  - Progress graph
  - Archived sections
  - (Keep: timer, basic tasks)

### Task 3.4: Create Simplified Free UI
- [ ] Hide left sidebar projects section for free users
- [ ] Hide progress graph for free users
- [ ] Keep only:
  - Timer (center)
  - Basic task list (simplified, maybe below timer)
  - Settings (dark mode, sounds, durations)

### Task 3.5: Create "Locked Feature" Overlay
- [ ] Design lock icon overlay for pro features
- [ ] Clicking locked feature opens upgrade modal
```javascript
document.querySelectorAll('[data-pro-feature]').forEach(el => {
  el.addEventListener('click', (e) => {
    if (!userState.isPro) {
      e.preventDefault();
      e.stopPropagation();
      showUpgradeModal();
    }
  });
});
```

### Task 3.6: Reorganize Layout for Free Users
- [ ] Create CSS for free-user layout (timer-focused, minimal)
- [ ] Create CSS for pro-user layout (full features)
```css
body:not(.is-pro) .layout-sidebar-left .projects-table-card {
  display: none;
}

body:not(.is-pro) .layout-progress {
  display: none;
}

body:not(.is-pro) .layout {
  /* Simpler single-column layout */
}
```

---

## Team D: Product/Design

### Task 3.7: Design Free User Experience
- [ ] Wireframe simplified free layout
- [ ] Design "What you get with Pro" feature cards
- [ ] Write copy for upgrade prompts

---

# Phase 4: Pro Features Implementation
**Duration:** 2-3 weeks  
**Depends on:** Phase 3

## Team A: Frontend/UI

### Task 4.1: Create Data Sync Layer
- [ ] Create `js/dataSync.js` module
- [ ] Implement sync-on-change for pro users
```javascript
async function saveProject(project) {
  if (userState.isPro) {
    // Save to Supabase
    const { data, error } = await supabase
      .from('projects')
      .upsert(project);
    return { data, error };
  } else {
    // Save to localStorage
    saveToLocalStorage('projects', project);
  }
}
```

### Task 4.2: Implement Projects CRUD (Pro)
- [ ] Create project
- [ ] Read/list projects
- [ ] Update project
- [ ] Delete project
- [ ] Archive/unarchive project
- [ ] Sync with Supabase for pro users

### Task 4.3: Implement Goals Feature (Pro)
- [ ] Create goals UI section
- [ ] Goal types: daily, weekly, long-term
- [ ] Goal CRUD operations
- [ ] Goal progress tracking
- [ ] Connect goals to projects

### Task 4.4: Implement Ideas Capture (Pro)
- [ ] Create ideas UI section (simple list/inbox)
- [ ] Quick-add idea input
- [ ] Link idea to project (optional)
- [ ] Priority marking
- [ ] Convert idea to task

### Task 4.5: Implement Analytics Dashboard (Pro)
- [ ] Daily/weekly/monthly pomodoro counts
- [ ] Time spent per project (pie chart)
- [ ] Streak tracking
- [ ] Goal completion rate
- [ ] Best focus times (heatmap)

### Task 4.6: Implement Progress Graph Enhancement (Pro)
- [ ] Extend from 7 days to 30/90 days
- [ ] Filter by project
- [ ] Export data option

### Task 4.7: Implement Cloud Sync
- [ ] Initial data load from Supabase on login
- [ ] Real-time sync using Supabase subscriptions
- [ ] Offline support with queue
- [ ] Conflict resolution (last-write-wins or merge)

---

## Team B: Backend/Infra

### Task 4.8: Create Analytics Queries
- [ ] Daily pomodoro summary
```sql
CREATE OR REPLACE FUNCTION get_daily_stats(user_uuid UUID, days INTEGER)
RETURNS TABLE (
  date DATE,
  total_pomodoros BIGINT,
  total_minutes BIGINT
) AS $$
  SELECT 
    DATE(completed_at) as date,
    COUNT(*) as total_pomodoros,
    SUM(duration_minutes) as total_minutes
  FROM pomodoro_sessions
  WHERE user_id = user_uuid
    AND completed_at >= CURRENT_DATE - days
    AND session_type = 'work'
  GROUP BY DATE(completed_at)
  ORDER BY date DESC;
$$ LANGUAGE sql;
```

### Task 4.9: Create Data Export Function
- [ ] Edge function to export user data as JSON/CSV

---

# Phase 5: Payment Integration
**Duration:** 2 weeks  
**Depends on:** Phase 2, can run parallel to Phase 4

## Team C: Payments

### Task 5.1: Create Checkout Flow
- [ ] Create `js/payments.js` module
- [ ] Implement redirect to Stripe Checkout
```javascript
async function createCheckoutSession(priceId) {
  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: { priceId }
  });
  
  if (data?.url) {
    window.location.href = data.url;
  }
}
```

### Task 5.2: Create Supabase Edge Function for Checkout
- [ ] Create `supabase/functions/create-checkout/index.ts`
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@12.0.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

serve(async (req) => {
  const { priceId } = await req.json();
  const authHeader = req.headers.get('Authorization');
  
  // Get user from Supabase auth
  const supabase = createClient(/* ... */);
  const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  
  // Create Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    customer_email: user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: 'https://focus-pomadoro.com/?success=true',
    cancel_url: 'https://focus-pomadoro.com/?canceled=true',
    metadata: { user_id: user.id }
  });
  
  return new Response(JSON.stringify({ url: session.url }));
});
```

### Task 5.3: Create Stripe Webhook Handler
- [ ] Create `supabase/functions/stripe-webhook/index.ts`
- [ ] Handle `checkout.session.completed` event
- [ ] Handle `customer.subscription.updated` event
- [ ] Handle `customer.subscription.deleted` event
- [ ] Update `profiles.subscription_status` accordingly

```typescript
// Webhook handler pseudocode
switch (event.type) {
  case 'checkout.session.completed':
    // Get user_id from metadata
    // Update profile: subscription_status = 'active'
    break;
    
  case 'customer.subscription.updated':
    // Check subscription status
    // Update profile accordingly
    break;
    
  case 'customer.subscription.deleted':
    // Update profile: subscription_status = 'canceled'
    break;
}
```

### Task 5.4: Create Customer Portal Link
- [ ] Allow users to manage subscription via Stripe portal
```javascript
async function openCustomerPortal() {
  const { data } = await supabase.functions.invoke('customer-portal');
  if (data?.url) {
    window.location.href = data.url;
  }
}
```

---

## Team A: Frontend/UI

### Task 5.5: Create Pricing Modal/Page
- [ ] Design pricing comparison (Free vs Pro)
- [ ] Monthly/yearly toggle
- [ ] "Subscribe" buttons linking to checkout
- [ ] Show current plan for logged-in users

### Task 5.6: Create Success/Cancel Pages
- [ ] Success page after checkout
- [ ] Handle `?success=true` query param
- [ ] Refresh user profile to get updated subscription status
- [ ] Cancel/return page

### Task 5.7: Create Account/Billing Page
- [ ] Show current subscription status
- [ ] Show renewal date
- [ ] "Manage Subscription" button (Stripe portal)
- [ ] "Cancel Subscription" option

### Task 5.8: Handle Subscription Status Changes
- [ ] Listen for profile changes (realtime)
- [ ] Update UI immediately when subscription changes
- [ ] Handle downgrade gracefully (keep data, lock features)

---

# Phase 6: Polish & Launch
**Duration:** 1-2 weeks  
**Depends on:** All previous phases

## Team A: Frontend/UI

### Task 6.1: Error Handling
- [ ] Network error handling
- [ ] Auth error messages
- [ ] Payment error messages
- [ ] Graceful fallbacks

### Task 6.2: Loading States
- [ ] Skeleton loaders for data fetch
- [ ] Button loading states
- [ ] Page transition smoothness

### Task 6.3: Onboarding Flow
- [ ] First-time user tour (optional)
- [ ] Explain free vs pro on first visit
- [ ] Prompt to create account after X pomodoros

### Task 6.4: Mobile Responsiveness
- [ ] Test all new UI on mobile
- [ ] Ensure modals work on small screens
- [ ] Touch-friendly interactions

---

## Team B: Backend/Infra

### Task 6.5: Performance Optimization
- [ ] Add database indexes
- [ ] Optimize queries
- [ ] Set up caching if needed

### Task 6.6: Monitoring & Logging
- [ ] Set up error tracking (Sentry or similar)
- [ ] Monitor Supabase usage
- [ ] Set up alerts for failures

### Task 6.7: Backup Strategy
- [ ] Configure Supabase backups
- [ ] Document recovery procedures

---

## Team C: Payments

### Task 6.8: Test Payment Flows
- [ ] Test successful subscription
- [ ] Test failed payment
- [ ] Test subscription cancellation
- [ ] Test subscription renewal
- [ ] Test upgrade/downgrade

### Task 6.9: Switch to Stripe Live Mode
- [ ] Update API keys
- [ ] Update webhook endpoints
- [ ] Final end-to-end test

---

## Team D: Product/Design

### Task 6.10: Update Marketing
- [ ] Update landing page with pricing
- [ ] Create "Pro" feature highlights
- [ ] Update meta tags and OG images
- [ ] Prepare launch announcement

### Task 6.11: Legal Pages
- [ ] Create/update Terms of Service
- [ ] Create/update Privacy Policy
- [ ] Add cookie consent if needed (for EU)

### Task 6.12: Analytics Setup
- [ ] Track signup events
- [ ] Track checkout events
- [ ] Track feature usage
- [ ] Set up conversion funnel

---

# Timeline Summary

| Phase | Duration | Teams |
|-------|----------|-------|
| Phase 1: Foundation | 1 week | B, C, D |
| Phase 2: Authentication | 1-2 weeks | A, B |
| Phase 3: Free UI Simplification | 1 week | A, D |
| Phase 4: Pro Features | 2-3 weeks | A, B |
| Phase 5: Payments | 2 weeks | A, C |
| Phase 6: Polish & Launch | 1-2 weeks | All |

**Total estimated time: 8-11 weeks**

---

# Dependencies Diagram

```
Phase 1 (Foundation)
    │
    ├──► Phase 2 (Auth)
    │        │
    │        ├──► Phase 3 (Free UI)
    │        │        │
    │        │        └──► Phase 4 (Pro Features)
    │        │                    │
    │        └──► Phase 5 (Payments) ◄──┘
    │                    │
    └────────────────────┴──► Phase 6 (Polish)
```

---

# Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Scope creep on Pro features | Define MVP feature set, defer extras to v1.1 |
| Stripe webhook failures | Implement retry logic, manual sync option |
| Data migration issues | Keep localStorage as fallback, gradual migration |
| Low conversion rate | A/B test pricing, add trial period |
| Auth complexity | Start with email only, add OAuth later |

---

# Success Metrics

- **Week 1 post-launch:** 100 signups, 5 paid conversions
- **Month 1:** 500 signups, 25 paid users ($125 MRR)
- **Month 3:** 2000 signups, 100 paid users ($500 MRR)

---

# Notes

- All localStorage data should remain functional for free users
- Pro users who cancel keep their data but lose cloud sync
- Consider 7-day free trial for Pro (reduces friction)
- Annual plan should offer ~2 months free (33% discount)
