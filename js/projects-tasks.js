import { STORAGE_KEYS, loadJson, saveJson, todayKey } from "./storage.js";

function normalizeProjects(projects) {
  if (!projects.length) {
    projects.push({
      id: "general",
      name: "General",
      createdAt: new Date().toISOString(),
      goal: 4,
      archived: false
    });
  }

  return projects.map(p => ({
    ...p,
    archived: !!p.archived,
    createdAt: p.createdAt || new Date().toISOString()
  }));
}

export function createProjectsTasksBasic({ freemium, queueSyncChanges = () => {} }) {
  const projectSelect = document.getElementById("projectSelect");
  const currentProjectNameEl = document.getElementById("currentProjectName");
  const projectsTableBody = document.getElementById("projectsTableBody");

  const tasksList = document.getElementById("tasksList");

  const dailyGoalLabel = document.getElementById("dailyGoalLabel");
  const dailyBarFill = document.getElementById("dailyBarFill");

  const goalForm = document.getElementById("goalForm");
  const goalsList = document.getElementById("goalsList");
  const goalProjectSelect = document.getElementById("goalProjectSelect");

  const ideaForm = document.getElementById("ideaForm");
  const ideasList = document.getElementById("ideasList");
  const ideaProjectSelect = document.getElementById("ideaProjectSelect");

  let projects = normalizeProjects(loadJson(STORAGE_KEYS.PROJECTS, []));
  let tasks = loadJson(STORAGE_KEYS.TASKS, []).map(t => ({
    ...t,
    archived: !!t.archived,
    done: !!t.done
  }));
  let sessions = loadJson(STORAGE_KEYS.SESSIONS, []).map(s => ({
    ...s,
    projectId: s.projectId || s.project_id || s.projectId || projects[0]?.id,
    taskId: s.taskId || s.task_id || null,
    mode: s.mode || "work",
    durationSeconds: s.durationSeconds || s.duration_minutes * 60 || 0,
    completedAt: s.completedAt || s.completed_at || new Date().toISOString(),
    createdAt: s.createdAt || s.completedAt || s.completed_at || new Date().toISOString(),
    updatedAt: s.updatedAt || s.completedAt || s.completed_at || new Date().toISOString()
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

  let activeProjectId =
    localStorage.getItem(STORAGE_KEYS.ACTIVE_PROJECT) || projects[0].id;
  if (!projects.find(p => p.id === activeProjectId && !p.archived)) {
    const firstActive = projects.find(p => !p.archived) || projects[0];
    activeProjectId = firstActive.id;
  }
  localStorage.setItem(STORAGE_KEYS.ACTIVE_PROJECT, activeProjectId);

  let activeTaskId = null;

  function saveProjects() {
    saveJson(STORAGE_KEYS.PROJECTS, projects);
    queueSyncChanges();
  }

  function saveTasks() {
    saveJson(STORAGE_KEYS.TASKS, tasks);
    queueSyncChanges();
  }

  function saveSessions() {
    saveJson(STORAGE_KEYS.SESSIONS, sessions);
    queueSyncChanges();
  }

  function saveGoals() {
    saveJson(STORAGE_KEYS.GOALS, goals);
    queueSyncChanges();
  }

  function saveIdeas() {
    saveJson(STORAGE_KEYS.IDEAS, ideas);
    queueSyncChanges();
  }

  function getProjectColorIndex(projectId) {
    const sorted = [...projects].sort((a, b) =>
      (a.createdAt || "").localeCompare(b.createdAt || "")
    );
    const idx = sorted.findIndex(p => p.id === projectId);
    return idx < 0 ? 0 : idx % 8;
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

  function renderProjectsSelect() {
    if (!projectSelect) {
      console.warn("Project select element missing; skipping render.");
      return;
    }

    projectSelect.innerHTML = "";
    const activeProjects = projects.filter(p => !p.archived);

    const planningSelects = [goalProjectSelect, ideaProjectSelect].filter(Boolean);
    planningSelects.forEach(select => {
      select.innerHTML = "";
      const anyOpt = document.createElement("option");
      anyOpt.value = "";
      anyOpt.textContent = "Any project";
      select.appendChild(anyOpt);
    });

    activeProjects.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.name;
      projectSelect.appendChild(opt);

      planningSelects.forEach(select => {
        const option = document.createElement("option");
        option.value = p.id;
        option.textContent = p.name;
        select.appendChild(option);
      });
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

    const activeProjects = projects.filter(p => !p.archived);

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
  }

  function renderTasksUI() {
    if (!tasksList) return;
    tasksList.innerHTML = "";

    const activeTasks = tasks.filter(t => !t.archived);
    const sorted = activeTasks.sort((a, b) =>
      (a.createdAt || "").localeCompare(b.createdAt || "")
    );

    const newRow = document.createElement("li");
    newRow.className = "tasks-list-item is-new";
    newRow.innerHTML = `
      <input
        type="checkbox"
        class="task-checkbox"
        data-task-toggle
        aria-label="Toggle task complete"
        disabled
      />
      <input
        type="text"
        class="task-new-input"
        placeholder="New task"
      />
    `;
    tasksList.appendChild(newRow);

    if (!sorted.length) {
      const empty = document.createElement("li");
      empty.className = "muted";
      empty.textContent = "Add tasks to keep focus.";
      tasksList.appendChild(empty);
      return;
    }

    sorted.forEach(t => {
      const li = document.createElement("li");
      li.className = "tasks-list-item";
      li.dataset.taskId = t.id;
      if (t.id === activeTaskId) {
        li.classList.add("is-active");
      }

      li.innerHTML = `
        <div class="task-main">
          <input type="checkbox" class="task-checkbox" data-task-toggle ${
        t.done ? "checked" : ""
      } />
          <span class="task-label">${t.text}</span>
        </div>
        <div class="tasks-list-actions">
          <button class="task-icon-btn" data-task-action="archive" title="Archive">📦</button>
          <button class="task-icon-btn" data-task-action="delete" title="Delete">🗑</button>
        </div>
      `;

      tasksList.appendChild(li);
    });
  }

  function renderGoalsUI() {
    if (!goalsList) return;

    goalsList.innerHTML = "";
    const sorted = goals.sort((a, b) =>
      (a.createdAt || "").localeCompare(b.createdAt || "")
    );

    if (!sorted.length) {
      const empty = document.createElement("li");
      empty.className = "muted";
      empty.textContent = "Set a few goals for today.";
      goalsList.appendChild(empty);
      return;
    }

    sorted.forEach(goal => {
      const project = projects.find(p => p.id === goal.projectId);
      const li = document.createElement("li");
      li.className = "goal-item";
      li.dataset.goalId = goal.id;
      li.innerHTML = `
        <label>
          <input type="checkbox" ${goal.completed ? "checked" : ""} data-goal-complete />
          <span>${goal.text}${project ? ` (${project.name})` : ""}</span>
        </label>
        <button class="task-icon-btn" data-goal-delete title="Delete">🗑</button>
      `;
      goalsList.appendChild(li);
    });
  }

  function renderIdeasUI() {
    if (!ideasList) return;
    ideasList.innerHTML = "";

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
      const project = projects.find(p => p.id === idea.projectId);
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

  function handleTaskAction(taskId, action) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (action === "archive") {
      task.archived = true;
    } else if (action === "restore") {
      task.archived = false;
    } else if (action === "delete") {
      tasks = tasks.filter(t => t.id !== taskId);
      if (activeTaskId === taskId) {
        activeTaskId = null;
      }
    }

    task.updatedAt = new Date().toISOString();
    saveTasks();
    renderTasksUI();
  }

  function addSession(session) {
    sessions.push(session);
    saveSessions();
  }

  function attachBasicProjectEvents() {
    if (projectSelect) {
      projectSelect.addEventListener("change", () => {
        activeProjectId = projectSelect.value;
        localStorage.setItem(STORAGE_KEYS.ACTIVE_PROJECT, activeProjectId);
        updateCurrentProjectLabel();
        updateDailyProgressUI();
        updateProjectsTableUI();
      });
    }

    if (!projectsTableBody) return;

    projectsTableBody.addEventListener("keydown", e => {
      const row = e.target.closest("tr[data-is-new-project='true']");
      if (!row) return;
      const nameInput = row.querySelector(".projects-new-name-input");
      const goalInput = row.querySelector(".projects-new-goal-input");
      if (!nameInput || !goalInput) return;

      if (e.key === "Enter") {
        e.preventDefault();
        if (isProjectCreationLocked()) return;

        const name = nameInput.value.trim();
        if (!name) return;
        const goal = Math.max(0, parseInt(goalInput.value, 10) || 0);
        const id = `p-${Date.now().toString(36)}`;
        projects.push({
          id,
          name,
          goal,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          archived: false
        });
        saveProjects();
        activeProjectId = id;
        localStorage.setItem(STORAGE_KEYS.ACTIVE_PROJECT, activeProjectId);

        nameInput.value = "";
        goalInput.value = "";
        renderProjectsSelect();
        updateCurrentProjectLabel();
        updateDailyProgressUI();
        updateProjectsTableUI();

        const freshNameInput = projectsTableBody.querySelector(".projects-new-name-input");
        if (freshNameInput) freshNameInput.focus();
      } else if (e.key === "Escape") {
        e.preventDefault();
        nameInput.value = "";
        goalInput.value = "";
      }
    });

    projectsTableBody.addEventListener("click", e => {
      if (e.target.closest("tr[data-is-new-project='true']")) return;

      const tr = e.target.closest("tr[data-project-id]");
      if (!tr || e.target.tagName === "INPUT") return;
      const id = tr.dataset.projectId;
      if (!id) return;
      activeProjectId = id;
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PROJECT, activeProjectId);
      if (projectSelect) projectSelect.value = activeProjectId;
      updateCurrentProjectLabel();
      updateDailyProgressUI();
      updateProjectsTableUI();
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
        saveProjects();
        updateDailyProgressUI();
        updateProjectsTableUI();
      }
    });
  }

  function attachBasicTaskEvents() {
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

        const item = e.target.closest(".tasks-list-item");
        if (item && !item.classList.contains("is-new") && item.dataset.taskId) {
          activeTaskId = item.dataset.taskId;
          renderTasksUI();
        }
      });
    }
  }

  function attachGoalsEvents() {
    if (goalForm) {
      goalForm.addEventListener("submit", e => {
        e.preventDefault();
        const text = goalForm.querySelector("#goalText")?.value?.trim();
        const projectId = goalProjectSelect?.value || "";
        if (!text) return;

        goals.push({
          id: `g-${Date.now().toString(36)}`,
          text,
          projectId: projectId || null,
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        goalForm.reset();
        saveGoals();
        renderGoalsUI();
      });
    }

    if (goalsList) {
      goalsList.addEventListener("click", e => {
        const completeBtn = e.target.closest("[data-goal-complete]");
        const deleteBtn = e.target.closest("[data-goal-delete]");
        const li = e.target.closest(".goal-item");
        if (!li) return;
        const id = li.dataset.goalId;
        const goal = goals.find(g => g.id === id);
        if (!goal) return;

        if (completeBtn) {
          goal.completed = !goal.completed;
          goal.updatedAt = new Date().toISOString();
          saveGoals();
          renderGoalsUI();
          return;
        }

        if (deleteBtn) {
          goals = goals.filter(g => g.id !== id);
          goal.updatedAt = new Date().toISOString();
          saveGoals();
          renderGoalsUI();
        }
      });
    }
  }

  function attachIdeasEvents() {
    if (ideaForm) {
      ideaForm.addEventListener("submit", e => {
        e.preventDefault();
        if (!freemium.requirePro("Ideas")) return;

        const content = ideaForm.querySelector("#ideaContent")?.value?.trim();
        const priority = ideaForm.querySelector("#ideaPriority")?.value || "medium";
        const projectId = ideaProjectSelect?.value || "";
        if (!content) return;

        ideas.push({
          id: `i-${Date.now().toString(36)}`,
          content,
          priority,
          projectId: projectId || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        ideaForm.reset();
        saveIdeas();
        renderIdeasUI();
      });
    }

    if (ideasList) {
      ideasList.addEventListener("click", e => {
        const deleteBtn = e.target.closest("[data-idea-delete]");
        if (!deleteBtn) return;
        const li = e.target.closest(".idea-item");
        if (!li) return;
        const id = li.dataset.ideaId;
        ideas = ideas.filter(i => i.id !== id);
        saveIdeas();
        renderIdeasUI();
      });
    }
  }

  function bootstrap() {
    renderProjectsSelect();
    updateCurrentProjectLabel();
    updateDailyProgressUI();
    updateProjectsTableUI();
    renderTasksUI();
    renderGoalsUI();
    renderIdeasUI();
    attachBasicProjectEvents();
    attachBasicTaskEvents();
    attachGoalsEvents();
    attachIdeasEvents();
  }

  const state = {
    get projects() {
      return projects;
    },
    set projects(next) {
      projects = next;
    },
    get tasks() {
      return tasks;
    },
    set tasks(next) {
      tasks = next;
    },
    get sessions() {
      return sessions;
    },
    set sessions(next) {
      sessions = next;
    },
    get goals() {
      return goals;
    },
    set goals(next) {
      goals = next;
    },
    get ideas() {
      return ideas;
    },
    set ideas(next) {
      ideas = next;
    },
    get activeProjectId() {
      return activeProjectId;
    },
    set activeProjectId(id) {
      activeProjectId = id;
    },
    get activeTaskId() {
      return activeTaskId;
    },
    set activeTaskId(id) {
      activeTaskId = id;
    },
    getProjectColorIndex
  };

  return {
    bootstrap,
    state,
    getState: () => ({ projects, tasks, sessions, goals, ideas }),
    setState: next => {
      projects = normalizeProjects(next.projects || projects);
      tasks = next.tasks || tasks;
      sessions = next.sessions || sessions;
      goals = next.goals || goals;
      ideas = next.ideas || ideas;
      renderProjectsSelect();
      updateProjectsTableUI();
      renderTasksUI();
      updateDailyProgressUI();
      renderGoalsUI();
      renderIdeasUI();
    },
    addSession,
    updateDailyProgressUI,
    updateProjectsTableUI,
    renderProjectsSelect,
    renderTasksUI,
    getProjectColorIndex,
    updateCurrentProjectLabel,
    getSessions: () => sessions,
    getProjects: () => projects,
    getActiveProjectId: () => activeProjectId,
    getActiveTaskId: () => activeTaskId,
    setActiveTaskId: id => {
      activeTaskId = id;
    }
  };
}

export function createProjectsTasksPro({
  state,
  queueSyncChanges = () => {},
  freemium,
  onProjectsUpdated,
  onSessionsUpdated
}) {
  const archivedProjectsTableBody = document.getElementById(
    "archivedProjectsTableBody"
  );
  const toggleArchivedBtn = document.getElementById("toggleArchivedBtn");
  const archivedSection = document.getElementById("archivedSection");

  const archivedTasksList = document.getElementById("archivedTasksList");
  const toggleTasksArchivedBtn = document.getElementById("toggleTasksArchivedBtn");
  const tasksArchivedSection = document.getElementById("tasksArchivedSection");

  function renderArchivedProjects() {
    if (!archivedProjectsTableBody) return;
    archivedProjectsTableBody.innerHTML = "";
    const statsById = {};
    state.projects.forEach(p => {
      statsById[p.id] = {
        today: 0,
        total: 0,
        goal: typeof p.goal === "number" ? p.goal : 0
      };
    });

    state.sessions.forEach(s => {
      if (s.mode !== "work") return;
      const stats = statsById[s.projectId];
      if (!stats) return;
      stats.total += 1;
    });

    const archivedProjects = state.projects.filter(p => p.archived);
    archivedProjects.forEach(p => {
      const stats = statsById[p.id] || { today: 0, total: 0, goal: 0 };
      const colorIndex =
        typeof state.getProjectColorIndex === "function"
          ? state.getProjectColorIndex(p.id)
          : 0;
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

  function renderArchivedTasks() {
    if (!archivedTasksList) return;
    archivedTasksList.innerHTML = "";

    const archivedTasks = state.tasks.filter(t => t.archived);
    if (!archivedTasks.length) {
      const empty = document.createElement("li");
      empty.className = "muted";
      empty.textContent = "No archived tasks yet.";
      archivedTasksList.appendChild(empty);
      return;
    }

    archivedTasks.forEach(t => {
      const li = document.createElement("li");
      li.className = "tasks-list-item is-archived";
      li.dataset.taskId = t.id;
      li.innerHTML = `
        <div class="task-main">
          <input type="checkbox" class="task-checkbox" data-task-toggle ${
        t.done ? "checked" : ""
      } />
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

  function handleProjectAction(projectId, action) {
    const project = state.projects.find(p => p.id === projectId);
    if (!project) return;

    if (action === "archive") {
      project.archived = true;
      if (state.activeProjectId === projectId) {
        const firstActive = state.projects.find(p => !p.archived);
        if (firstActive) {
          state.activeProjectId = firstActive.id;
          localStorage.setItem(STORAGE_KEYS.ACTIVE_PROJECT, state.activeProjectId);
        }
      }
    } else if (action === "restore") {
      project.archived = false;
    } else if (action === "delete") {
      const activeCount = state.projects.filter(p => !p.archived).length;
      if (activeCount <= 1 && !project.archived) {
        alert("You need at least one active project.");
        return;
      }
      const index = state.projects.findIndex(p => p.id === projectId);
      if (index !== -1) {
        state.projects.splice(index, 1);
      }
      if (state.activeProjectId === projectId) {
        const firstActive = state.projects.find(p => !p.archived);
        if (firstActive) {
          state.activeProjectId = firstActive.id;
          localStorage.setItem(STORAGE_KEYS.ACTIVE_PROJECT, state.activeProjectId);
        }
      }
    }

    project.updatedAt = new Date().toISOString();
    saveJson(STORAGE_KEYS.PROJECTS, state.projects);
    queueSyncChanges();
    onProjectsUpdated?.();
    renderArchivedProjects();
  }

  function attachProListeners() {
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

    if (toggleArchivedBtn && archivedSection) {
      toggleArchivedBtn.addEventListener("click", () => {
        const isOpen = archivedSection.classList.toggle("is-open");
        toggleArchivedBtn.textContent = isOpen
          ? "Hide archived projects"
          : "Show archived projects";
      });
    }

    if (archivedTasksList) {
      archivedTasksList.addEventListener("click", e => {
        const checkbox = e.target.closest("[data-task-toggle]");
        if (checkbox) {
          const li = checkbox.closest(".tasks-list-item");
          if (!li) return;
          const id = li.dataset.taskId;
          const task = state.tasks.find(t => t.id === id);
          if (!task) return;
          task.done = checkbox.checked;
          task.updatedAt = new Date().toISOString();
          saveJson(STORAGE_KEYS.TASKS, state.tasks);
          queueSyncChanges();
          renderArchivedTasks();
          onSessionsUpdated?.();
          return;
        }

        const actionBtn = e.target.closest("[data-task-action]");
        if (actionBtn) {
          const li = actionBtn.closest(".tasks-list-item");
          if (!li) return;
          const id = li.dataset.taskId;
          const action = actionBtn.dataset.taskAction;
          const task = state.tasks.find(t => t.id === id);
          if (!task) return;
          if (action === "restore") {
            task.archived = false;
          } else if (action === "delete") {
            const idx = state.tasks.findIndex(t => t.id === id);
            if (idx !== -1) state.tasks.splice(idx, 1);
          }
          task.updatedAt = new Date().toISOString();
          saveJson(STORAGE_KEYS.TASKS, state.tasks);
          queueSyncChanges();
          renderArchivedTasks();
        }
      });
    }

    if (toggleTasksArchivedBtn && tasksArchivedSection) {
      toggleTasksArchivedBtn.addEventListener("click", () => {
        const isOpen = tasksArchivedSection.classList.toggle("is-open");
        toggleTasksArchivedBtn.textContent = isOpen
          ? "Hide archived tasks"
          : "Show archived tasks";
      });
    }
  }

  function bootstrap() {
    renderArchivedProjects();
    renderArchivedTasks();
    attachProListeners();
  }

  return {
    bootstrap,
    renderArchivedProjects,
    renderArchivedTasks
  };
}
