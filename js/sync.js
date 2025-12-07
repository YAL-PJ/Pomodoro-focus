// Cloud sync manager for Pro users. Pushes local data to Supabase and
// pulls down the latest copy when authentication + Pro are active.

const TABLE_MAP = {
  projects: "projects",
  tasks: "tasks",
  sessions: "pomodoro_sessions",
  goals: "goals",
  ideas: "ideas"
};

function mapToSupabase({ type, rows, userId }) {
  if (!rows?.length) return [];

  switch (type) {
    case "projects":
      return rows.map(p => ({
        id: p.id,
        user_id: userId,
        name: p.name,
        color: p.color || "#f97316",
        daily_goal: p.goal ?? 4,
        is_archived: !!p.archived,
        created_at: p.createdAt,
        updated_at: p.updatedAt || new Date().toISOString()
      }));
    case "tasks":
      return rows.map(t => ({
        id: t.id,
        user_id: userId,
        project_id: t.projectId || null,
        title: t.title || t.text,
        is_completed: !!t.done,
        is_archived: !!t.archived,
        created_at: t.createdAt,
        updated_at: t.updatedAt || new Date().toISOString()
      }));
    case "sessions":
      return rows.map(s => ({
        id: s.id,
        user_id: userId,
        project_id: s.projectId || null,
        task_id: s.taskId || null,
        duration_minutes: Math.round((s.durationSeconds || 0) / 60),
        session_type: s.mode || "work",
        completed_at: s.completedAt || s.completed_at || new Date().toISOString(),
        created_at: s.createdAt || s.completedAt || s.completed_at || new Date().toISOString(),
        updated_at: s.updatedAt || s.completedAt || s.completed_at || new Date().toISOString()
      }));
    case "goals":
      return rows.map(g => ({
        id: g.id,
        user_id: userId,
        project_id: g.projectId || null,
        title: g.title,
        description: g.description || null,
        goal_type: g.type || g.goalType || "long_term",
        target_pomodoros: g.target || null,
        deadline: g.deadline || null,
        is_completed: !!g.completed,
        created_at: g.createdAt || new Date().toISOString(),
        updated_at: g.updatedAt || new Date().toISOString()
      }));
    case "ideas":
      return rows.map(i => ({
        id: i.id,
        user_id: userId,
        project_id: i.projectId || null,
        content: i.content,
        priority: i.priority || "medium",
        created_at: i.createdAt || new Date().toISOString(),
        updated_at: i.updatedAt || new Date().toISOString()
      }));
    default:
      return rows;
  }
}

function mapFromSupabase({ type, rows }) {
  if (!rows?.length) return [];

  switch (type) {
    case "projects":
      return rows.map(p => ({
        id: p.id,
        name: p.name,
        color: p.color,
        goal: p.daily_goal ?? 4,
        archived: !!p.is_archived,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      }));
    case "tasks":
      return rows.map(t => ({
        id: t.id,
        projectId: t.project_id,
        title: t.title,
        text: t.title,
        done: !!t.is_completed,
        archived: !!t.is_archived,
        createdAt: t.created_at,
        updatedAt: t.updated_at
      }));
    case "sessions":
      return rows.map(s => ({
        id: s.id,
        projectId: s.project_id,
        taskId: s.task_id,
        durationSeconds: (s.duration_minutes || 0) * 60,
        mode: s.session_type || "work",
        completedAt: s.completed_at,
        createdAt: s.created_at || s.completed_at,
        updatedAt: s.updated_at || s.completed_at
      }));
    case "goals":
      return rows.map(g => ({
        id: g.id,
        projectId: g.project_id,
        title: g.title,
        description: g.description || "",
        type: g.goal_type || "long_term",
        target: g.target_pomodoros,
        deadline: g.deadline,
        completed: !!g.is_completed,
        createdAt: g.created_at,
        updatedAt: g.updated_at
      }));
    case "ideas":
      return rows.map(i => ({
        id: i.id,
        projectId: i.project_id,
        content: i.content,
        priority: i.priority || "medium",
        createdAt: i.created_at,
        updatedAt: i.updated_at
      }));
    default:
      return rows;
  }
}

export function mergeCollections(localRows, remoteRows, key = "id") {
  const map = new Map();
  [...localRows, ...remoteRows].forEach(row => {
    if (!row || !row[key]) return;
    const existing = map.get(row[key]);
    if (!existing || new Date(row.updatedAt || row.createdAt || 0) > new Date(existing.updatedAt || existing.createdAt || 0)) {
      map.set(row[key], row);
    }
  });
  return Array.from(map.values());
}

export function createSyncManager({ freemium, getState, applyRemoteState, onStatusChange }) {
  const client = window.db;
  let syncing = false;

  function emitStatus(status) {
    onStatusChange?.(status);
  }

  async function getUser() {
    if (!client) return null;
    const { data } = await client.auth.getUser();
    return data?.user || null;
  }

  function shouldSync() {
    return freemium?.isPro?.() && !!client;
  }

  async function syncDown() {
    if (!shouldSync()) return;
    const user = await getUser();
    if (!user) return;

    syncing = true;
    emitStatus("Syncing from cloud...");

    const remote = {};
    for (const key of Object.keys(TABLE_MAP)) {
      const { data, error } = await client
        .from(TABLE_MAP[key])
        .select("*")
        .eq("user_id", user.id);
      if (error) {
        console.warn(`Failed to pull ${key}`, error.message);
        continue;
      }
      remote[key] = mapFromSupabase({ type: key, rows: data });
    }

    applyRemoteState?.(remote);
    emitStatus("Cloud data loaded");
    syncing = false;
  }

  async function syncUp() {
    if (!shouldSync()) return;
    const user = await getUser();
    if (!user) return;

    const state = getState?.();
    if (!state) return;

    syncing = true;
    emitStatus("Syncing changes...");

    for (const key of Object.keys(TABLE_MAP)) {
      const payload = mapToSupabase({ type: key, rows: state[key], userId: user.id });
      if (!payload.length) continue;
      const { error } = await client
        .from(TABLE_MAP[key])
        .upsert(payload, { onConflict: "id" });
      if (error) {
        console.warn(`Failed to push ${key}`, error.message);
      }
    }

    emitStatus("Synced");
    syncing = false;
  }

  function queueSync() {
    if (syncing) return;
    if (!shouldSync()) return;
    syncUp();
  }

  function bootstrap() {
    if (!client) {
      emitStatus("Offline (no Supabase client)");
      return;
    }
    if (freemium) {
      freemium.onChange(state => {
        if (state.plan === "pro") {
          syncDown();
        }
      });
    }
    syncDown();
  }

  return {
    bootstrap,
    syncDown,
    syncUp,
    queueSync
  };
}
