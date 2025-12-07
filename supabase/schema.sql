-- Focus Pomodoro freemium baseline schema
-- Run inside your Supabase SQL editor to provision core + Pro tables.

-- Profiles table mirrors auth.users and tracks subscription state
create table if not exists public.profiles (
  id uuid references auth.users(id) primary key,
  email text,
  display_name text,
  subscription_status text default 'free', -- free, active, canceled, past_due
  subscription_id text,
  customer_id text,
  subscription_ends_at timestamp,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Core productivity tables
create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  color text default '#f97316',
  daily_goal integer default 4,
  is_archived boolean default false,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table if not exists public.tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  is_completed boolean default false,
  is_archived boolean default false,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table if not exists public.pomodoro_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  duration_minutes integer not null,
  session_type text default 'work', -- work, short_break, long_break
  completed_at timestamp default now()
);

-- Pro-only planning tables
create table if not exists public.goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  description text,
  goal_type text default 'long_term', -- daily, weekly, long_term
  target_pomodoros integer,
  deadline date,
  is_completed boolean default false,
  created_at timestamp default now()
);

create table if not exists public.ideas (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  content text not null,
  priority text default 'medium', -- low, medium, high
  created_at timestamp default now()
);

-- RLS: scope all data to the authenticated user
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.pomodoro_sessions enable row level security;
alter table public.goals enable row level security;
alter table public.ideas enable row level security;

-- Profiles policies
create policy if not exists "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy if not exists "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Generic CRUD helpers for user-owned rows
create policy if not exists "Users view own projects" on public.projects
  for select using (auth.uid() = user_id);
create policy if not exists "Users insert own projects" on public.projects
  for insert with check (auth.uid() = user_id);
create policy if not exists "Users update own projects" on public.projects
  for update using (auth.uid() = user_id);
create policy if not exists "Users delete own projects" on public.projects
  for delete using (auth.uid() = user_id);

create policy if not exists "Users view own tasks" on public.tasks
  for select using (auth.uid() = user_id);
create policy if not exists "Users insert own tasks" on public.tasks
  for insert with check (auth.uid() = user_id);
create policy if not exists "Users update own tasks" on public.tasks
  for update using (auth.uid() = user_id);
create policy if not exists "Users delete own tasks" on public.tasks
  for delete using (auth.uid() = user_id);

create policy if not exists "Users view own sessions" on public.pomodoro_sessions
  for select using (auth.uid() = user_id);
create policy if not exists "Users insert own sessions" on public.pomodoro_sessions
  for insert with check (auth.uid() = user_id);
create policy if not exists "Users delete own sessions" on public.pomodoro_sessions
  for delete using (auth.uid() = user_id);

create policy if not exists "Users view own goals" on public.goals
  for select using (auth.uid() = user_id);
create policy if not exists "Users insert own goals" on public.goals
  for insert with check (auth.uid() = user_id);
create policy if not exists "Users update own goals" on public.goals
  for update using (auth.uid() = user_id);
create policy if not exists "Users delete own goals" on public.goals
  for delete using (auth.uid() = user_id);

create policy if not exists "Users view own ideas" on public.ideas
  for select using (auth.uid() = user_id);
create policy if not exists "Users insert own ideas" on public.ideas
  for insert with check (auth.uid() = user_id);
create policy if not exists "Users update own ideas" on public.ideas
  for update using (auth.uid() = user_id);
create policy if not exists "Users delete own ideas" on public.ideas
  for delete using (auth.uid() = user_id);

-- Auto-create profile rows when new auth users sign up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
