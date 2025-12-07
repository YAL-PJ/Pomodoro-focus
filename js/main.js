import { PomodoroTimer } from "./timer.js";
import { STORAGE_KEYS, loadJson, saveJson, todayKey } from "./storage.js";
import { createSoundEngine } from "./sound.js";
import { createFreemiumManager } from "./freemium.js";
import { createProBootstrap } from "./pro/bootstrap.js";

// DOM refs
const timeDisplay = document.getElementById("timeDisplay");
const modeLabel = document.getElementById("modeLabel");
const timerCircle = document.getElementById("timerCircle");
const progressCircleElem = document.querySelector(".progress-ring__circle");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");
const controls = document.getElementById("controls");
const modeButtons = document.querySelectorAll(".mode-btn");

const workInput = document.getElementById("workDuration");
const shortInput = document.getElementById("shortDuration");
const longInput = document.getElementById("longDuration");

const darkModeToggle = document.getElementById("darkModeToggle");
const zenModeToggle = document.getElementById("zenModeToggle");
const masterSoundToggle = document.getElementById("masterSoundToggle");
const tickSoundToggle = document.getElementById("tickSoundToggle");
const happyTickSoundToggle = document.getElementById("happyTickSoundToggle");
const minuteSoundToggle = document.getElementById("minuteSoundToggle");
const fiveMinuteSoundToggle = document.getElementById("fiveMinuteSoundToggle");
const completionSoundToggle = document.getElementById("completionSoundToggle");

const dailyGoalLabel = document.getElementById("dailyGoalLabel");
const dailyBarFill = document.getElementById("dailyBarFill");
const projectSelect = document.getElementById("projectSelect");

const archivedProjectsTableBody = document.getElementById("archivedProjectsTableBody");
const toggleArchivedBtn = document.getElementById("toggleArchivedBtn");
const archivedSection = document.getElementById("archivedSection");

const feedbackToggle = document.getElementById("feedbackToggle");
const feedbackModal = document.getElementById("feedbackModal");

const currentProjectNameEl = document.getElementById("currentProjectName");
const projectsTableBody = document.getElementById("projectsTableBody");

// tasks DOM
const tasksList = document.getElementById("tasksList");
const archivedTasksList = document.getElementById("archivedTasksList");
const toggleTasksArchivedBtn = document.getElementById("toggleTasksArchivedBtn");
const tasksArchivedSection = document.getElementById("tasksArchivedSection");

// pro planning + sync DOM
const syncNowBtn = document.getElementById("syncNowBtn");
const syncStatusLabel = document.getElementById("syncStatusLabel");

const analyticsSummary = document.getElementById("analyticsSummary");
const analyticsProjectList = document.getElementById("analyticsProjectList");

// ===== STATE: FREEMIUM, PROJECTS, SESSIONS, TASKS =====

const freemium = createFreemiumManager();
// expose for non-module scripts (auth.js) to read/update email state
window.freemium = freemium;

let projects = loadJson(STORAGE_KEYS.PROJECTS, []);
if (!projects.length) {
  projects = [
    {
      id: "general",
      name: "General",
      createdAt: new Date().toISOString(),
      goal: 4,
      archived: false
    }
  ];
}

// normalize/ensure flags & createdAt
projects = projects.map(p => ({
  ...p,
  archived: !!p.archived,
  createdAt: p.createdAt || new Date().toISOString()
}));

let activeProjectId =
  localStorage.getItem(STORAGE_KEYS.ACTIVE_PROJECT) || projects[0].id;
if (!projects.find(p => p.id === activeProjectId && !p.archived)) {
  const firstActive = projects.find(p => !p.archived) || projects[0];
  activeProjectId = firstActive.id;
}
localStorage.setItem(STORAGE_KEYS.ACTIVE_PROJECT, activeProjectId);

let sessions = loadJson(STORAGE_KEYS.SESSIONS, []).map(s => ({
  ...s,
  projectId: s.projectId || s.project_id || activeProjectId,
  taskId: s.taskId || s.task_id || null,
  mode: s.mode || "work",
  durationSeconds: s.durationSeconds || s.duration_minutes * 60 || 0,
  completedAt: s.completedAt || s.completed_at || new Date().toISOString(),
  createdAt: s.createdAt || s.completedAt || s.completed_at || new Date().toISOString(),
  updatedAt: s.updatedAt || s.completedAt || s.completed_at || new Date().toISOString()
}));
let tasks = loadJson(STORAGE_KEYS.TASKS, []).map(t => ({
  ...t,
  archived: !!t.archived,
  done: !!t.done
}));

let goals = loadJson(STORAGE_KEYS.GOALS, []).map(g => ({
  ...g,
  completed: !!g.completed,
  createdAt: g.createdAt || new Date().toISOString()
}));

let ideas = loadJson(STORAGE_KEYS.IDEAS, []).map(i => ({
  ...i,
  createdAt: i.createdAt || new Date().toISOString()
}));

function setProjects(nextProjects, { skipSync } = {}) {
  projects = nextProjects;
  saveJson(STORAGE_KEYS.PROJECTS, projects);
  if (!skipSync) queueSyncChanges();
}

function setTasks(nextTasks, { skipSync } = {}) {
  tasks = nextTasks;
  saveJson(STORAGE_KEYS.TASKS, tasks);
  if (!skipSync) queueSyncChanges();
}

function setSessions(nextSessions, { skipSync } = {}) {
  sessions = nextSessions;
  saveJson(STORAGE_KEYS.SESSIONS, sessions);
  if (!skipSync) queueSyncChanges();
}

function setGoals(nextGoals, { skipSync } = {}) {
  goals = nextGoals;
  saveJson(STORAGE_KEYS.GOALS, goals);
  if (!skipSync) queueSyncChanges();
}

function setIdeas(nextIdeas, { skipSync } = {}) {
  ideas = nextIdeas;
  saveJson(STORAGE_KEYS.IDEAS, ideas);
  if (!skipSync) queueSyncChanges();
}

// current focused task (UI only)
let activeTaskId = null;

let proBootstrap = null;

// sound engine + settings
const soundEngine = createSoundEngine();
let currentSoundSettings = {
  master: true,
  tick: true,
  happyTick: true,
  minute: true,
  fiveMinute: true,
  completion: true
};

// for sound logic (detect transitions)
let lastTickState = null;

proBootstrap = createProBootstrap({
  freemium,
  getState: () => ({ projects, tasks, sessions, goals, ideas }),
  setProjects,
  setTasks,
  setSessions,
  setGoals,
  setIdeas,
  renderers: {
    renderProjectsSelect,
    renderProjectsTable: updateProjectsTableUI,
    renderTasks: renderTasksUI,
    updateDailyProgressUI,
    renderProgressGraphUI
  },
  statusLabel: syncStatusLabel
});

// ===== TIMER INSTANCE =====

const timer = new PomodoroTimer({
  onTick: handleTick,
  onModeChange: handleModeChange,
  onComplete: handleComplete
});

// expose for debugging
window.focusTimer = timer;

// ===== HELPERS =====

function getProjectColorIndex(projectId) {
  const sorted = [...projects].sort((a, b) =>
    (a.createdAt || "").localeCompare(b.createdAt || "")
  );
  const idx = sorted.findIndex(p => p.id === projectId);
  return idx < 0 ? 0 : idx % 8;
}

function queueSyncChanges() {
  proBootstrap?.sync.queueSyncChanges();
}

function initDarkMode() {
  const saved = localStorage.getItem(STORAGE_KEYS.DARK_MODE);
  const isDark = saved === "true";
  document.body.classList.toggle("dark", isDark);
  if (darkModeToggle) {
    darkModeToggle.textContent = isDark ? "☀️" : "🌙";
  }
}

function updateZenModeUI(isZen) {
  document.body.classList.toggle("zen-mode", isZen);
  if (zenModeToggle) {
    zenModeToggle.classList.toggle("is-active", isZen);
    zenModeToggle.textContent = isZen ? "🧘‍♀️" : "🧘";
    zenModeToggle.setAttribute("aria-pressed", String(isZen));
    zenModeToggle.setAttribute(
      "title",
      isZen ? "Exit zen mode" : "Enter zen mode"
    );
    zenModeToggle.setAttribute(
      "aria-label",
      isZen
        ? "Exit zen mode and show sidebars"
        : "Enter zen mode and hide sidebars"
    );
  }
}

function initZenMode() {
  const saved = localStorage.getItem(STORAGE_KEYS.ZEN_MODE);
  const isZen = saved === "true";
  updateZenModeUI(isZen);
}

function initSoundSettings() {
  if (
    !masterSoundToggle ||
    !tickSoundToggle ||
    !happyTickSoundToggle ||
    !minuteSoundToggle ||
    !fiveMinuteSoundToggle ||
    !completionSoundToggle
  ) {
    console.warn("Sound toggles missing; skipping sound settings init.");
    return;
  }

  const saved = loadJson(STORAGE_KEYS.SOUND_SETTINGS, null);
  const defaults = {
    master: true,
    tick: true,
    happyTick: true,
    minute: true,
    fiveMinute: true,
    completion: true
  };
  const applied = { ...defaults, ...(saved || {}) };

  masterSoundToggle.checked = applied.master;
  tickSoundToggle.checked = applied.tick;
  happyTickSoundToggle.checked = applied.happyTick;
  minuteSoundToggle.checked = applied.minute;
  fiveMinuteSoundToggle.checked = applied.fiveMinute;
  completionSoundToggle.checked = applied.completion;

  currentSoundSettings = applied;
  timer.setSoundSettings(applied); // reserved for future use
}

function saveSoundSettingsFromUI() {
  if (
    !masterSoundToggle ||
    !tickSoundToggle ||
    !happyTickSoundToggle ||
    !minuteSoundToggle ||
    !fiveMinuteSoundToggle ||
    !completionSoundToggle
  ) {
    console.warn("Sound toggles missing; skipping sound settings save.");
    return;
  }

  const settings = {
    master: masterSoundToggle.checked,
    tick: tickSoundToggle.checked,
    happyTick: happyTickSoundToggle.checked,
    minute: minuteSoundToggle.checked,
    fiveMinute: fiveMinuteSoundToggle.checked,
    completion: completionSoundToggle.checked
  };
  currentSoundSettings = settings;
  saveJson(STORAGE_KEYS.SOUND_SETTINGS, settings);
  timer.setSoundSettings(settings);
}

function renderProjectsSelect() {
  if (!projectSelect) {
    console.warn("Project select element missing; skipping render.");
    return;
  }

  projectSelect.innerHTML = "";
  const activeProjects = projects.filter(p => !p.archived);

  activeProjects.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    projectSelect.appendChild(opt);
  });

  if (!activeProjects.find(p => p.id === activeProjectId)) {
    const firstActive = activeProjects[0];
    if (firstActive) {
      activeProjectId = firstActive.id;
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PROJECT, activeProjectId);
    }
  }

  if (projectSelect.options.length > 0) {
    projectSelect.value = activeProjectId;
  }
}

function isProjectCreationLocked() {
  const activeProjects = projects.filter(p => !p.archived).length;
  // free users can keep "General" but need Pro for multiple projects
  if (activeProjects >= 1 && !freemium.isPro()) {
    return !freemium.requirePro("Projects & goals");
  }
  return false;
}

function updateCurrentProjectLabel() {
  const project = projects.find(p => p.id === activeProjectId);
  if (currentProjectNameEl) {
    currentProjectNameEl.textContent = project ? project.name : "Unknown";
  }
}

function getProjectStatsById() {
  const today = todayKey();
  const statsById = {};
  projects.forEach(p => {
    statsById[p.id] = {
      today: 0,
      total: 0,
      goal: typeof p.goal === "number" ? p.goal : 0
    };
  });

  sessions.forEach(s => {
    if (s.mode !== "work") return;
    const stats = statsById[s.projectId];
    if (!stats) return;
    stats.total += 1;
    if (s.completedAt.slice(0, 10) === today) {
      stats.today += 1;
    }
  });

  return statsById;
}

function updateDailyProgressUI() {
  if (!dailyGoalLabel || !dailyBarFill) {
    console.warn("Daily progress elements missing; skipping update.");
    return;
  }

  const today = todayKey();
  const todaysSessions = sessions.filter(
    s => s.mode === "work" && s.completedAt.slice(0, 10) === today
  );
  const count = todaysSessions.length;

  const totalMinutes = Math.round(
    todaysSessions.reduce(
      (sum, s) => sum + (s.durationSeconds || 1500),
      0
    ) / 60
  );

  // total daily goal = sum of per-project "goal today"
  const totalGoal =
    projects.reduce((sum, p) => sum + (p.goal || 0), 0) || 4;

  const minutesText = totalMinutes > 0 ? ` (${totalMinutes} min)` : "";

  dailyGoalLabel.textContent = `${count} / ${totalGoal} Pomodoros (today)${minutesText}`;
  dailyBarFill.style.width = `${Math.min(1, totalGoal ? count / totalGoal : 0) * 100}%`;

  const dailyProgressEl = document.querySelector(".daily-progress");
  if (dailyProgressEl) {
    const reached = totalGoal > 0 && count >= totalGoal;
    dailyProgressEl.classList.toggle("goal-complete", reached);
  }
}

function updateProjectsTableUI() {
  if (!projectsTableBody) return;
  const statsById = getProjectStatsById();

  projectsTableBody.innerHTML = "";
  if (archivedProjectsTableBody) {
    archivedProjectsTableBody.innerHTML = "";
  }

  const activeProjects = projects.filter(p => !p.archived);
  const archivedProjects = projects.filter(p => p.archived);

  // always-on "new project" row at top
  const newRow = document.createElement("tr");
  newRow.dataset.isNewProject = "true";
  newRow.innerHTML = `
    <td colspan="5">
      <div class="projects-new-row">
        <input
          type="text"
          class="projects-new-name-input"
          placeholder="New project name"
        />
        <input
          type="number"
          min="0"
          class="projects-new-goal-input"
          placeholder="Goal today"
        />
      </div>
    </td>
  `;
  projectsTableBody.appendChild(newRow);

  // active projects
  activeProjects.forEach(p => {
    const stats = statsById[p.id] || { today: 0, total: 0, goal: 0 };
    const colorIndex = getProjectColorIndex(p.id);
    const tr = document.createElement("tr");
    tr.dataset.projectId = p.id;
    tr.classList.add("projects-table-row");
    if (p.id === activeProjectId) {
      tr.classList.add("is-active");
    }

    tr.innerHTML = `
      <td class="projects-table-name">
        <span class="project-color-dot" style="background: var(--project-color-${colorIndex});"></span>
        ${p.name}
      </td>
      <td>${stats.today}</td>
      <td>${stats.total}</td>
      <td>
        <input
          type="number"
          min="0"
          class="projects-table-goal-input"
          value="${stats.goal || 0}"
          data-project-goal-input="true"
        />
      </td>
      <td class="projects-table-actions">
        <button class="table-icon-btn" data-project-action="archive" title="Archive">📦</button>
        <button class="table-icon-btn" data-project-action="delete" title="Delete">🗑</button>
      </td>
    `;

    projectsTableBody.appendChild(tr);
  });

  // archived table
  if (archivedProjectsTableBody) {
    archivedProjects.forEach(p => {
      const stats = statsById[p.id] || { today: 0, total: 0, goal: 0 };
      const colorIndex = getProjectColorIndex(p.id);
      const tr = document.createElement("tr");
      tr.dataset.projectId = p.id;

      tr.innerHTML = `
        <td class="projects-table-name">
          <span class="project-color-dot" style="background: var(--project-color-${colorIndex});"></span>
          ${p.name}
        </td>
        <td>${stats.today}</td>
        <td>${stats.total}</td>
        <td>${stats.goal || 0}</td>
        <td class="projects-table-actions">
          <button class="table-icon-btn" data-project-action="restore" title="Restore">⤴</button>
          <button class="table-icon-btn" data-project-action="delete" title="Delete">🗑</button>
        </td>
      `;

      archivedProjectsTableBody.appendChild(tr);
    });
  }
}

// ===== TASKS UI =====

function saveTasks() {
  saveJson(STORAGE_KEYS.TASKS, tasks);
  queueSyncChanges();
}

function renderTasksUI() {
  if (!tasksList || !archivedTasksList) return;

  tasksList.innerHTML = "";
  archivedTasksList.innerHTML = "";

  const activeTasks = tasks.filter(t => !t.archived);
  const archivedTasks = tasks.filter(t => t.archived);

  // always-on "new task" row at top
  const liNew = document.createElement("li");
  liNew.className = "tasks-list-item is-new";
  liNew.innerHTML = `
    <div class="tasks-list-item-main">
      <span class="task-status-dot"></span>
      <input type="checkbox" class="task-checkbox" disabled />
      <input
        type="text"
        class="task-new-input"
        placeholder="New task"
      />
    </div>
  `;
  tasksList.appendChild(liNew);

  // existing active tasks
  activeTasks.forEach(t => {
    const li = document.createElement("li");
    li.className =
      "tasks-list-item" +
      (t.done ? " done" : "") +
      (t.id === activeTaskId ? " is-current" : "");
    li.dataset.taskId = t.id;

    li.innerHTML = `
      <div class="tasks-list-item-main">
        <span class="task-status-dot"></span>
        <input
          type="checkbox"
          class="task-checkbox"
          ${t.done ? "checked" : ""}
          data-task-toggle="true"
        />
        <span class="task-label">${t.text}</span>
      </div>
      <div class="tasks-list-actions">
        <button class="task-icon-btn" data-task-action="archive" title="Archive">📦</button>
        <button class="task-icon-btn" data-task-action="delete" title="Delete">🗑</button>
      </div>
    `;

    tasksList.appendChild(li);
  });

  // archived tasks
  archivedTasks.forEach(t => {
    const li = document.createElement("li");
    li.className = "tasks-list-item" + (t.done ? " done" : "");
    li.dataset.taskId = t.id;

    li.innerHTML = `
      <div class="tasks-list-item-main">
        <span class="task-status-dot"></span>
        <input
          type="checkbox"
          class="task-checkbox"
          ${t.done ? "checked" : ""}
          data-task-toggle="true"
        />
        <span class="task-label">${t.text}</span>
      </div>
      <div class="tasks-list-actions">
        <button class="task-icon-btn" data-task-action="restore" title="Restore">⤴</button>
        <button class="task-icon-btn" data-task-action="delete" title="Delete">🗑</button>
      </div>
    `;

    archivedTasksList.appendChild(li);
  });
}

// ===== PROGRESS GRAPH =====

function getLastNDates(n) {
  const result = [];
  const today = new Date();

  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString(undefined, { weekday: "short" });
    result.push({ key, label });
  }

  return result;
}

function renderProgressGraphUI() {
  const graphEl = document.getElementById("progressGraph");
  if (!graphEl) return;

  const days = getLastNDates(7);
  const activeProjects = projects.filter(p => !p.archived);
  if (!activeProjects.length) {
    graphEl.innerHTML = "";
    return;
  }

  // minutes per project per day
  const minutesByProjectDay = {};
  sessions.forEach(s => {
    if (s.mode !== "work") return;
    const dayKey = s.completedAt.slice(0, 10);
    const minutes = Math.round((s.durationSeconds || 1500) / 60);
    if (!minutesByProjectDay[s.projectId]) {
      minutesByProjectDay[s.projectId] = {};
    }
    minutesByProjectDay[s.projectId][dayKey] =
      (minutesByProjectDay[s.projectId][dayKey] || 0) + minutes;
  });

  let globalMaxMinutes = 0;

  const series = activeProjects.map(p => {
    const createdKey = p.createdAt.slice(0, 10);
    const colorIndex = getProjectColorIndex(p.id);
    const dayMinutes = minutesByProjectDay[p.id] || {};

    const points = [];
    days.forEach((d, idx) => {
      // only from day created
      if (d.key < createdKey) return;
      const minutes = dayMinutes[d.key] || 0;
      globalMaxMinutes = Math.max(globalMaxMinutes, minutes);
      points.push({ dayIndex: idx, minutes });
    });

    // if project created after the current window → single point at last day
    if (!points.length) {
      points.push({ dayIndex: days.length - 1, minutes: 0 });
    }

    return {
      project: p,
      colorIndex,
      points
    };
  });

  if (globalMaxMinutes === 0) {
    globalMaxMinutes = 1; // to avoid divide-by-zero; keeps flat lines at bottom
  }

  const viewWidth = 100;
  const viewHeight = 60;
  const marginLeft = 6;
  const marginRight = 4;
  const marginTop = 4;
  const marginBottom = 12;
  const innerWidth = viewWidth - marginLeft - marginRight;
  const innerHeight = viewHeight - marginTop - marginBottom;

  const mapX = dayIndex => {
    if (days.length <= 1) return marginLeft + innerWidth / 2;
    return marginLeft + (dayIndex / (days.length - 1)) * innerWidth;
  };
  const mapY = minutes => {
    const ratio = minutes / globalMaxMinutes;
    return marginTop + (1 - ratio) * innerHeight;
  };

  // grid lines
  const horizontalLines = [];
  const gridSteps = 4;
  for (let i = 0; i <= gridSteps; i++) {
    const y = marginTop + (i / gridSteps) * innerHeight;
    horizontalLines.push(
      `<line x1="${marginLeft}" y1="${y}" x2="${viewWidth - marginRight}" y2="${y}" />`
    );
  }

  const verticalLines = days.map((_, idx) => {
    const x = mapX(idx);
    return `<line x1="${x}" y1="${marginTop}" x2="${x}" y2="${marginTop + innerHeight}" />`;
  });

  const axisLines = `
    <line class="axis" x1="${marginLeft}" y1="${marginTop + innerHeight}" x2="${viewWidth -
    marginRight}" y2="${marginTop + innerHeight}" />
  `;

  const seriesLines = series
    .map(s => {
      const pts = s.points
        .map(pt => `${mapX(pt.dayIndex).toFixed(2)},${mapY(pt.minutes).toFixed(2)}`)
        .join(" ");
      return `<polyline
        class="progress-graph-line"
        points="${pts}"
        style="stroke: var(--project-color-${s.colorIndex});"
      />`;
    })
    .join("");

  const legendHtml = `
    <div class="progress-graph-legend">
      ${series
        .map(
          s => `
        <div class="progress-graph-legend-item">
          <span class="progress-graph-legend-color" style="background: var(--project-color-${s.colorIndex});"></span>
          <span>${s.project.name}</span>
        </div>
      `
        )
        .join("")}
    </div>
  `;

  graphEl.innerHTML = `
    <svg class="progress-graph-svg" viewBox="0 0 ${viewWidth} ${viewHeight}" preserveAspectRatio="none">
      <g class="progress-graph-grid">
        ${horizontalLines.join("")}
        ${verticalLines.join("")}
        ${axisLines}
      </g>
      ${seriesLines}
    </svg>
    ${legendHtml}
  `;
}

// ===== SOUND TICK LOGIC =====

function handleTickSounds({ timeLeft, totalTime, mode }) {
  if (!soundEngine || !soundEngine.ctx) return;
  const s = currentSoundSettings;
  if (!s.master) return;

  // base tick every second in work mode (soft beep)
  if (mode === "work" && s.tick) {
    soundEngine.tick();
  }

  const prev = lastTickState;
  lastTickState = { timeLeft, mode };

  if (!prev) return;
  if (timeLeft === prev.timeLeft) return;

  // every full minute remaining (work mode only)
  if (
    mode === "work" &&
    s.minute &&
    timeLeft > 0 &&
    timeLeft % 60 === 0
  ) {
    soundEngine.minute();
  }

  // every 5 minutes remaining
  if (
    mode === "work" &&
    s.fiveMinute &&
    timeLeft > 0 &&
    timeLeft % 300 === 0
  ) {
    soundEngine.fiveMinute();
  }

  // last 10 seconds: "happy ticks"
  if (
    mode === "work" &&
    s.happyTick &&
    timeLeft > 0 &&
    timeLeft <= 10
  ) {
    soundEngine.happyTick();
  }
}

// ===== TIMER CALLBACKS =====

function handleTick({ timeLeft, totalTime, mode }) {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  timeDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  const r = 140;
  const circumference = 2 * Math.PI * r;
  if (progressCircleElem && totalTime > 0) {
    const progress = (totalTime - timeLeft) / totalTime;
    const offset = circumference * (1 - progress);
    progressCircleElem.style.strokeDasharray = circumference;
    progressCircleElem.style.strokeDashoffset = offset;
  }

  handleTickSounds({ timeLeft, totalTime, mode });
}

function handleModeChange({ mode }) {
  const label =
    mode === "work"
      ? "WORK"
      : mode === "short"
      ? "SHORT BREAK"
      : "LONG BREAK";
  modeLabel.textContent = label;

  modeButtons.forEach(btn => {
    const m = btn.getAttribute("data-mode");
    btn.classList.toggle("active", m === mode);
  });
}

function handleComplete(payload) {
  const { mode } = payload;

  if (mode === "work") {
    timerCircle.classList.remove("pulse");
    void timerCircle.offsetWidth;
    timerCircle.classList.add("pulse");

    const celebration = document.getElementById("tomatoCelebration");
    if (celebration) {
      celebration.classList.add("show");
      setTimeout(() => celebration.classList.remove("show"), 700);
    }

    const now = new Date().toISOString();
    const session = {
      id: `s-${Date.now().toString(36)}`,
      projectId: activeProjectId,
      taskId: activeTaskId,
      mode: "work",
      durationSeconds: payload.durationSeconds,
      completedAt: payload.completedAt || now,
      createdAt: now,
      updatedAt: now
    };
    sessions.push(session);
    saveJson(STORAGE_KEYS.SESSIONS, sessions);
    queueSyncChanges();

    if (currentSoundSettings.master && currentSoundSettings.completion) {
      soundEngine.completion();
    }

    updateDailyProgressUI();
    updateProjectsTableUI();
    renderProgressGraphUI();
    proBootstrap?.planning.renderGoals();
    proBootstrap?.planning.renderAnalytics();
  }
}

// ===== EVENT HANDLERS =====

// start / pause / reset

if (startBtn && pauseBtn && controls) {
  startBtn.addEventListener("click", () => {
    timer.start();
    startBtn.style.display = "none";
    controls.classList.add("active");
  });

  pauseBtn.addEventListener("click", () => {
    timer.pause();
    startBtn.style.display = "inline-flex";
    controls.classList.remove("active");
  });
}

if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    timer.reset();
  });
}

// make entire timer circle clickable (toggle start/pause)
if (timerCircle && startBtn && pauseBtn) {
  timerCircle.addEventListener("click", e => {
    if (
      e.target.closest("#pauseBtn") ||
      e.target.closest("#resetBtn") ||
      e.target.closest("#startBtn")
    ) {
      return;
    }
    if (timer.isRunning) {
      pauseBtn.click();
    } else {
      startBtn.click();
    }
  });
}

// modes

modeButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const mode = btn.getAttribute("data-mode");
    timer.switchMode(mode);
    timer.pause();
    startBtn.style.display = "inline-flex";
    controls.classList.remove("active");
  });
});

// durations

function syncDurationsFromInputs() {
  if (!workInput || !shortInput || !longInput) {
    console.warn("Duration inputs missing; skipping duration sync.");
    return;
  }

  const work = Math.max(1, Math.min(60, parseInt(workInput.value, 10) || 25));
  const short = Math.max(1, Math.min(30, parseInt(shortInput.value, 10) || 5));
  const long = Math.max(1, Math.min(60, parseInt(longInput.value, 10) || 15));

  workInput.value = work;
  shortInput.value = short;
  longInput.value = long;

  timer.updateDurations({
    work: work * 60,
    short: short * 60,
    long: long * 60
  });
}

[workInput, shortInput, longInput]
  .filter(Boolean)
  .forEach(input => {
    input.addEventListener("change", syncDurationsFromInputs);
  });

// dark mode

  if (darkModeToggle) {
    darkModeToggle.addEventListener("click", () => {
      const isDark = !document.body.classList.contains("dark");
      document.body.classList.toggle("dark", isDark);
      darkModeToggle.textContent = isDark ? "☀️" : "🌙";
      localStorage.setItem(STORAGE_KEYS.DARK_MODE, String(isDark));
    });
  }

// zen mode

if (zenModeToggle) {
  zenModeToggle.addEventListener("click", () => {
    const isZen = !document.body.classList.contains("zen-mode");
    updateZenModeUI(isZen);
    localStorage.setItem(STORAGE_KEYS.ZEN_MODE, String(isZen));
  });
}

// sound settings toggles

  [
    masterSoundToggle,
    tickSoundToggle,
    happyTickSoundToggle,
    minuteSoundToggle,
    fiveMinuteSoundToggle,
    completionSoundToggle
  ]
    .filter(Boolean)
    .forEach(input => {
      input.addEventListener("change", saveSoundSettingsFromUI);
    });

// keyboard: space = start/pause

document.addEventListener("keydown", e => {
  // we only care about Space
  if (e.code !== "Space" && e.key !== " ") return;

  const target = e.target;
  const tag = target.tagName;

  // If user is typing in an editable field, don't hijack Space
  const isEditable =
    target.isContentEditable ||
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT";

  if (isEditable) {
    return; // let Space behave normally inside inputs
  }

  // Global Space shortcut: toggle timer
    e.preventDefault();
    if (!startBtn || !pauseBtn) return;
    if (timer.isRunning) {
      pauseBtn.click();
    } else {
      startBtn.click();
    }
  });

  // projects: dropdown change

  if (projectSelect) {
    projectSelect.addEventListener("change", () => {
      activeProjectId = projectSelect.value;
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PROJECT, activeProjectId);
      updateCurrentProjectLabel();
      updateDailyProgressUI();
      updateProjectsTableUI();
    });
  }

// handle new project row (enter: add, esc: clear)

if (projectsTableBody) {
  projectsTableBody.addEventListener("keydown", e => {
    const newRow = projectsTableBody.querySelector("tr[data-is-new-project='true']");
    if (!newRow) return;

    const nameInput = newRow.querySelector(".projects-new-name-input");
    const goalInput = newRow.querySelector(".projects-new-goal-input");
    if (!nameInput || !goalInput) return;

    if (e.target !== nameInput && e.target !== goalInput) return;

    if (e.key === "Enter") {
      e.preventDefault();
      const name = (nameInput.value || "").trim();
      if (!name) return;
      const goal = Math.max(0, parseInt(goalInput.value, 10) || 0);

      if (isProjectCreationLocked()) return;

      const id = "p-" + Date.now().toString(36);
      projects.push({
        id,
        name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        goal,
        archived: false
      });
      saveJson(STORAGE_KEYS.PROJECTS, projects);
      queueSyncChanges();
      activeProjectId = id;
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PROJECT, activeProjectId);

      // reset inputs for next project
      nameInput.value = "";
      goalInput.value = "";
      renderProjectsSelect();
      updateCurrentProjectLabel();
      updateDailyProgressUI();
      updateProjectsTableUI();
      renderProgressGraphUI();

      // focus new row again for fast adding
      const freshNameInput = projectsTableBody.querySelector(".projects-new-name-input");
      if (freshNameInput) freshNameInput.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      nameInput.value = "";
      goalInput.value = "";
    }
  });
}

// project actions & goal editing

function handleProjectAction(projectId, action) {
  const project = projects.find(p => p.id === projectId);
  if (!project) return;

  if (action === "archive") {
    project.archived = true;
    if (activeProjectId === projectId) {
      const firstActive = projects.find(p => !p.archived);
      if (firstActive) {
        activeProjectId = firstActive.id;
        localStorage.setItem(STORAGE_KEYS.ACTIVE_PROJECT, activeProjectId);
      }
    }
  } else if (action === "restore") {
    project.archived = false;
  } else if (action === "delete") {
    const activeCount = projects.filter(p => !p.archived).length;
    if (activeCount <= 1 && !project.archived) {
      alert("You need at least one active project.");
      return;
    }
    const index = projects.findIndex(p => p.id === projectId);
    if (index !== -1) {
      projects.splice(index, 1);
    }
    if (activeProjectId === projectId) {
      const firstActive = projects.find(p => !p.archived);
      if (firstActive) {
        activeProjectId = firstActive.id;
        localStorage.setItem(STORAGE_KEYS.ACTIVE_PROJECT, activeProjectId);
      }
    }
  }

  project.updatedAt = new Date().toISOString();

  saveJson(STORAGE_KEYS.PROJECTS, projects);
  queueSyncChanges();
  renderProjectsSelect();
  updateCurrentProjectLabel();
  updateDailyProgressUI();
  updateProjectsTableUI();
  renderProgressGraphUI();
  proBootstrap?.planning.renderGoals();
  proBootstrap?.planning.renderIdeas();
  proBootstrap?.planning.renderAnalytics();
}

// projects table main listeners

if (projectsTableBody) {
  projectsTableBody.addEventListener("click", e => {
    // ignore clicks in new project row
    if (e.target.closest("tr[data-is-new-project='true']")) return;

    const actionBtn = e.target.closest("[data-project-action]");
    if (actionBtn) {
      const tr = actionBtn.closest("tr[data-project-id]");
      if (!tr) return;
      const id = tr.dataset.projectId;
      const action = actionBtn.dataset.projectAction;
      handleProjectAction(id, action);
      return;
    }

    if (e.target.tagName === "INPUT") return;
    const tr = e.target.closest("tr[data-project-id]");
    if (!tr) return;
    const id = tr.dataset.projectId;
    if (!id) return;
    activeProjectId = id;
    localStorage.setItem(STORAGE_KEYS.ACTIVE_PROJECT, activeProjectId);
    if (projectSelect) projectSelect.value = activeProjectId;
    updateCurrentProjectLabel();
    updateDailyProgressUI();
    updateProjectsTableUI();
    renderProgressGraphUI();
  });

  projectsTableBody.addEventListener("change", e => {
    const input = e.target.closest("[data-project-goal-input]");
    if (!input) return;
    const tr = input.closest("tr[data-project-id]");
    if (!tr) return;
    const id = tr.dataset.projectId;
    const goal = Math.max(0, parseInt(input.value, 10) || 0);
    input.value = goal;

    const project = projects.find(p => p.id === id);
    if (project) {
      project.goal = goal;
      project.updatedAt = new Date().toISOString();
      saveJson(STORAGE_KEYS.PROJECTS, projects);
      queueSyncChanges();
      updateDailyProgressUI();
      updateProjectsTableUI();
    }
  });
}

// archived table: restore/delete

if (archivedProjectsTableBody) {
  archivedProjectsTableBody.addEventListener("click", e => {
    const actionBtn = e.target.closest("[data-project-action]");
    if (!actionBtn) return;
    const tr = actionBtn.closest("tr[data-project-id]");
    if (!tr) return;
    const id = tr.dataset.projectId;
    const action = actionBtn.dataset.projectAction;
    handleProjectAction(id, action);
  });
}

// toggle archived projects section

if (toggleArchivedBtn && archivedSection) {
  toggleArchivedBtn.addEventListener("click", () => {
    const isOpen = archivedSection.classList.toggle("is-open");
    toggleArchivedBtn.textContent = isOpen
      ? "Hide archived projects"
      : "Show archived projects";
  });
}

// TASKS EVENTS – inline first row always present

if (tasksList) {
  tasksList.addEventListener("keydown", e => {
    const input = e.target.closest(".task-new-input");
    if (!input) return;

    if (e.key === "Enter") {
      e.preventDefault();
      const text = (input.value || "").trim();
      if (!text) return;

      const id = "t-" + Date.now().toString(36);
      tasks.push({
        id,
        text,
        done: false,
        archived: false,
        createdAt: new Date().toISOString()
      });
      saveTasks();
      input.value = "";
      renderTasksUI();

      const freshInput = tasksList.querySelector(".task-new-input");
      if (freshInput) freshInput.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      input.value = "";
    }
  });

  tasksList.addEventListener("click", e => {
    const newRow = e.target.closest(".tasks-list-item.is-new");
    if (newRow && !e.target.classList.contains("task-new-input")) {
      const input = newRow.querySelector(".task-new-input");
      if (input) input.focus();
      return;
    }

    const checkbox = e.target.closest("[data-task-toggle]");
    if (checkbox) {
      const li = checkbox.closest(".tasks-list-item");
      if (!li) return;
      const id = li.dataset.taskId;
      const task = tasks.find(t => t.id === id);
      if (!task) return;
      task.done = checkbox.checked;
      task.updatedAt = new Date().toISOString();
      saveTasks();
      renderTasksUI();
      return;
    }

    const actionBtn = e.target.closest("[data-task-action]");
    if (actionBtn) {
      const li = actionBtn.closest(".tasks-list-item");
      if (!li) return;
      const id = li.dataset.taskId;
      const action = actionBtn.dataset.taskAction;
      handleTaskAction(id, action);
      return;
    }

    // click on a normal task row → set as current
    const item = e.target.closest(".tasks-list-item");
    if (item && !item.classList.contains("is-new") && item.dataset.taskId) {
      activeTaskId = item.dataset.taskId;
      renderTasksUI();
    }
  });
}

if (archivedTasksList) {
  archivedTasksList.addEventListener("click", e => {
    const checkbox = e.target.closest("[data-task-toggle]");
    if (checkbox) {
      const li = checkbox.closest(".tasks-list-item");
      if (!li) return;
      const id = li.dataset.taskId;
      const task = tasks.find(t => t.id === id);
      if (!task) return;
      task.done = checkbox.checked;
      task.updatedAt = new Date().toISOString();
      saveTasks();
      renderTasksUI();
      return;
    }

    const actionBtn = e.target.closest("[data-task-action]");
    if (actionBtn) {
      const li = actionBtn.closest(".tasks-list-item");
      if (!li) return;
      const id = li.dataset.taskId;
      const action = actionBtn.dataset.taskAction;
      handleTaskAction(id, action);
    }
  });
}

function handleTaskAction(taskId, action) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  if (action === "archive") {
    task.archived = true;
    if (activeTaskId === taskId) {
      activeTaskId = null;
    }
  } else if (action === "restore") {
    task.archived = false;
  } else if (action === "delete") {
    const idx = tasks.findIndex(t => t.id === taskId);
    if (idx !== -1) tasks.splice(idx, 1);
    if (activeTaskId === taskId) {
      activeTaskId = null;
    }
  }

  if (task) {
    task.updatedAt = new Date().toISOString();
  }

  saveTasks();
  renderTasksUI();
}

if (toggleTasksArchivedBtn && tasksArchivedSection) {
  toggleTasksArchivedBtn.addEventListener("click", () => {
    const isOpen = tasksArchivedSection.classList.toggle("is-open");
    toggleTasksArchivedBtn.textContent = isOpen
      ? "Hide archived tasks"
      : "Show archived tasks";
  });
}

// ===== CLOUD SYNC (PRO) =====

if (syncNowBtn) {
  syncNowBtn.addEventListener("click", () => {
    if (!freemium.requirePro("Cloud sync")) return;
    syncStatusLabel.textContent = "Syncing...";
    proBootstrap?.sync.syncUp();
  });
}

const cachedSync = loadJson(STORAGE_KEYS.LAST_SYNC, null);
if (cachedSync && syncStatusLabel) {
  syncStatusLabel.textContent = `${cachedSync.status} at ${new Date(
    cachedSync.at
  ).toLocaleTimeString()}`;
}

// feedback modal

if (feedbackToggle && feedbackModal) {
  const closeEls = feedbackModal.querySelectorAll("[data-close]");
  const backdrop = feedbackModal.querySelector(".modal-backdrop");

  function openModal() {
    feedbackModal.classList.add("is-open");
  }

  function closeModal() {
    feedbackModal.classList.remove("is-open");
  }

  feedbackToggle.addEventListener("click", openModal);
  closeEls.forEach(el => el.addEventListener("click", closeModal));
  if (backdrop) backdrop.addEventListener("click", closeModal);

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      closeModal();
    }
  });
}

// ===== INITIAL RUN =====

initDarkMode();
initZenMode();
initSoundSettings();
freemium.bootstrap();
renderProjectsSelect();
syncDurationsFromInputs();
updateDailyProgressUI();
updateCurrentProjectLabel();
updateProjectsTableUI();
renderTasksUI();
renderProgressGraphUI();
proBootstrap?.planning.renderPlanningSelects();
proBootstrap?.planning.renderGoals();
proBootstrap?.planning.renderIdeas();
proBootstrap?.planning.renderAnalytics();
timer.switchMode("work");
