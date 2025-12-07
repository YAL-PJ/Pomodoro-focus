import { STORAGE_KEYS, saveJson } from "../storage.js";

function buildOption(value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

function getSessionsForWindow(getSessions, days, projectId = null) {
  const now = new Date();
  return getSessions().filter(s => {
    if (s.mode !== "work") return false;
    if (projectId && s.projectId !== projectId) return false;
    if (!days) return true;
    const completed = s.completedAt ? new Date(s.completedAt) : new Date();
    const diffDays = (now - completed) / (1000 * 60 * 60 * 24);
    return diffDays <= days;
  });
}

export function createPlanningManager({
  freemium,
  getProjects,
  getSessions,
  getGoals,
  setGoals,
  getIdeas,
  setIdeas,
  queueSyncChanges
}) {
  const goalForm = document.getElementById("goalForm");
  const goalsList = document.getElementById("goalsList");
  const goalProjectSelect = document.getElementById("goalProjectSelect");

  const ideaForm = document.getElementById("ideaForm");
  const ideasList = document.getElementById("ideasList");
  const ideaProjectSelect = document.getElementById("ideaProjectSelect");

  const analyticsSummary = document.getElementById("analyticsSummary");
  const analyticsProjectList = document.getElementById("analyticsProjectList");

  let mounted = false;
  const listeners = [];

  function persistGoals(nextGoals, { skipSync } = {}) {
    setGoals(nextGoals);
    saveJson(STORAGE_KEYS.GOALS, nextGoals);
    if (!skipSync) queueSyncChanges?.();
  }

  function persistIdeas(nextIdeas, { skipSync } = {}) {
    setIdeas(nextIdeas);
    saveJson(STORAGE_KEYS.IDEAS, nextIdeas);
    if (!skipSync) queueSyncChanges?.();
  }

  function bind(element, event, handler) {
    if (!element) return;
    element.addEventListener(event, handler);
    listeners.push({ element, event, handler });
  }

  function teardownListeners() {
    listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    listeners.length = 0;
  }

  function computeGoalProgress(goal) {
    const windowDays = goal.type === "daily" ? 1 : goal.type === "weekly" ? 7 : 90;
    const relevantSessions = getSessionsForWindow(getSessions, windowDays, goal.projectId);
    const count = relevantSessions.length;
    const target = Math.max(0, parseInt(goal.target, 10) || 0);
    const completed = goal.completed || (target > 0 && count >= target);
    return { count, target, completed };
  }

  function renderPlanningSelects() {
    if (!mounted) return;
    const selects = [goalProjectSelect, ideaProjectSelect].filter(Boolean);
    selects.forEach(select => {
      select.innerHTML = "";
      select.appendChild(buildOption("", "Any project"));
    });

    getProjects()
      .filter(p => !p.archived)
      .forEach(project => {
        selects.forEach(select => {
          select.appendChild(buildOption(project.id, project.name));
        });
      });
  }

  function renderGoals() {
    if (!mounted || !goalsList) return;
    goalsList.innerHTML = "";

    const goals = getGoals();
    const sorted = [...goals].sort((a, b) =>
      (a.createdAt || "").localeCompare(b.createdAt || "")
    );

    if (!sorted.length) {
      const empty = document.createElement("li");
      empty.className = "muted";
      empty.textContent = "No goals yet. Add a daily, weekly, or long-term target.";
      goalsList.appendChild(empty);
      return;
    }

    sorted.forEach(goal => {
      const { count, target, completed } = computeGoalProgress(goal);
      const project = getProjects().find(p => p.id === goal.projectId);
      const li = document.createElement("li");
      li.className = "goal-item" + (completed ? " is-complete" : "");
      li.dataset.goalId = goal.id;

      const progress = target > 0 ? Math.min(100, Math.round((count / target) * 100)) : 0;

      li.innerHTML = `
        <div class="goal-main">
          <div>
            <p class="goal-title">${goal.title}</p>
            <p class="goal-meta">${goal.type || "long_term"}${
        project ? ` • ${project.name}` : ""
      }</p>
          </div>
          <div class="goal-actions">
            <button class="task-icon-btn" data-goal-complete title="Mark complete">✅</button>
            <button class="task-icon-btn" data-goal-delete title="Delete">🗑</button>
          </div>
        </div>
        <div class="goal-progress-row">
          <div class="goal-progress-bar">
            <span style="width:${progress}%"></span>
          </div>
          <span class="goal-progress-label">${count} / ${target || "∞"} pomodoros</span>
        </div>
      `;

      goalsList.appendChild(li);
    });
  }

  function renderIdeas() {
    if (!mounted || !ideasList) return;
    ideasList.innerHTML = "";

    const ideas = getIdeas();
    const sorted = [...ideas].sort((a, b) =>
      (b.createdAt || "").localeCompare(a.createdAt || "")
    );

    if (!sorted.length) {
      const empty = document.createElement("li");
      empty.className = "muted";
      empty.textContent = "Capture ideas, then turn them into tasks.";
      ideasList.appendChild(empty);
      return;
    }

    sorted.forEach(idea => {
      const project = getProjects().find(p => p.id === idea.projectId);
      const li = document.createElement("li");
      li.className = "idea-item";
      li.dataset.ideaId = idea.id;
      li.innerHTML = `
        <div>
          <p class="idea-content">${idea.content}</p>
          <p class="idea-meta">${idea.priority || "medium"}${
        project ? ` • ${project.name}` : ""
      }</p>
        </div>
        <div class="idea-actions">
          <button class="task-icon-btn" data-idea-delete title="Delete">🗑</button>
        </div>
      `;
      ideasList.appendChild(li);
    });
  }

  function renderAnalytics() {
    if (!mounted || !analyticsSummary || !analyticsProjectList) return;

    const last7 = getSessionsForWindow(getSessions, 7);
    const last30 = getSessionsForWindow(getSessions, 30);
    const last90 = getSessionsForWindow(getSessions, 90);

    const statTemplate = (label, items) =>
      `<div class="analytics-stat"><strong>${items.length}</strong><span>${label}</span></div>`;

    analyticsSummary.innerHTML = `
      ${statTemplate("Last 7 days", last7)}
      ${statTemplate("Last 30 days", last30)}
      ${statTemplate("Last 90 days", last90)}
    `;

    analyticsProjectList.innerHTML = "";
    const projectStats = getProjects().map(p => {
      const projectSessions = getSessionsForWindow(getSessions, 90, p.id);
      const minutes = projectSessions.reduce(
        (sum, s) => sum + Math.round((s.durationSeconds || 0) / 60),
        0
      );
      return { ...p, count: projectSessions.length, minutes };
    });

    projectStats
      .sort((a, b) => b.count - a.count)
      .forEach(stat => {
        const li = document.createElement("li");
        li.className = "project-analytics-row";
        li.innerHTML = `
          <div>
            <p class="project-analytics-title">${stat.name}</p>
            <p class="project-analytics-meta">${stat.count} sessions • ${stat.minutes} minutes</p>
          </div>
        `;
        analyticsProjectList.appendChild(li);
      });
  }

  function handleGoalSubmit(e) {
    e.preventDefault();
    if (!freemium.requirePro("Goals")) return;
    if (!mounted) return;

    const title = goalForm.querySelector("#goalTitle")?.value?.trim();
    const type = goalForm.querySelector("#goalType")?.value || "long_term";
    const target = parseInt(goalForm.querySelector("#goalTarget")?.value, 10) || 0;
    const projectId = goalProjectSelect?.value || "";

    if (!title) return;

    const nextGoals = [
      ...getGoals(),
      {
        id: `g-${Date.now().toString(36)}`,
        title,
        type,
        target,
        projectId: projectId || null,
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    goalForm.reset();
    persistGoals(nextGoals);
    renderGoals();
  }

  function handleGoalsListClick(e) {
    if (!mounted) return;
    const completeBtn = e.target.closest("[data-goal-complete]");
    const deleteBtn = e.target.closest("[data-goal-delete]");
    const li = e.target.closest(".goal-item");
    if (!li) return;
    const id = li.dataset.goalId;
    const goal = getGoals().find(g => g.id === id);
    if (!goal) return;

    if (completeBtn) {
      const updatedGoals = getGoals().map(g =>
        g.id === id
          ? { ...g, completed: !g.completed, updatedAt: new Date().toISOString() }
          : g
      );
      persistGoals(updatedGoals);
      renderGoals();
      return;
    }

    if (deleteBtn) {
      const updatedGoals = getGoals().filter(g => g.id !== id);
      persistGoals(updatedGoals);
      renderGoals();
    }
  }

  function handleIdeaSubmit(e) {
    e.preventDefault();
    if (!freemium.requirePro("Ideas")) return;
    if (!mounted) return;

    const content = ideaForm.querySelector("#ideaContent")?.value?.trim();
    const priority = ideaForm.querySelector("#ideaPriority")?.value || "medium";
    const projectId = ideaProjectSelect?.value || "";
    if (!content) return;

    const nextIdeas = [
      ...getIdeas(),
      {
        id: `i-${Date.now().toString(36)}`,
        content,
        priority,
        projectId: projectId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    ideaForm.reset();
    persistIdeas(nextIdeas);
    renderIdeas();
  }

  function handleIdeasListClick(e) {
    if (!mounted) return;
    const deleteBtn = e.target.closest("[data-idea-delete]");
    if (!deleteBtn) return;
    const li = e.target.closest(".idea-item");
    if (!li) return;
    const id = li.dataset.ideaId;
    const updatedIdeas = getIdeas().filter(i => i.id !== id);
    persistIdeas(updatedIdeas);
    renderIdeas();
  }

  function mount() {
    if (mounted || !freemium.isPro()) return;
    mounted = true;

    renderPlanningSelects();
    renderGoals();
    renderIdeas();
    renderAnalytics();

    bind(goalForm, "submit", handleGoalSubmit);
    bind(goalsList, "click", handleGoalsListClick);
    bind(ideaForm, "submit", handleIdeaSubmit);
    bind(ideasList, "click", handleIdeasListClick);
  }

  function unmount() {
    if (!mounted) return;
    teardownListeners();
    mounted = false;
    if (goalsList) goalsList.innerHTML = "";
    if (ideasList) ideasList.innerHTML = "";
    if (analyticsSummary) analyticsSummary.innerHTML = "";
    if (analyticsProjectList) analyticsProjectList.innerHTML = "";
  }

  return {
    mount,
    unmount,
    renderPlanningSelects,
    renderGoals,
    renderIdeas,
    renderAnalytics,
    isMounted: () => mounted
  };
}
