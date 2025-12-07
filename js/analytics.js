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

export function createAnalytics({ state }) {
  function getSessionsForWindow(days = 7, projectId) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return state.sessions.filter(s => {
      const completed = new Date(s.completedAt || s.completed_at || s.createdAt);
      const matchesProject = projectId ? s.projectId === projectId : true;
      return completed >= cutoff && matchesProject;
    });
  }

  function renderProgressGraphUI() {
    const graphEl = document.getElementById("progressGraph");
    if (!graphEl) return;

    const days = getLastNDates(7);
    const activeProjects = state.projects.filter(p => !p.archived);
    if (!activeProjects.length) {
      graphEl.innerHTML = "";
      return;
    }

    const minutesByProjectDay = {};
    state.sessions.forEach(s => {
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
      const colorIndex = state.getProjectColorIndex(p.id);
      const dayMinutes = minutesByProjectDay[p.id] || {};

      const points = [];
      days.forEach((d, idx) => {
        if (d.key < createdKey) return;
        const minutes = dayMinutes[d.key] || 0;
        globalMaxMinutes = Math.max(globalMaxMinutes, minutes);
        points.push({ dayIndex: idx, minutes });
      });

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
      globalMaxMinutes = 1;
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

  function renderAnalytics() {
    const analyticsSummary = document.getElementById("analyticsSummary");
    const analyticsProjectList = document.getElementById("analyticsProjectList");
    if (!analyticsSummary || !analyticsProjectList) return;

    const last7 = getSessionsForWindow(7);
    const last30 = getSessionsForWindow(30);
    const last90 = getSessionsForWindow(90);

    const statTemplate = (label, items) =>
      `<div class="analytics-stat"><strong>${items.length}</strong><span>${label}</span></div>`;

    analyticsSummary.innerHTML = `
      ${statTemplate("Last 7 days", last7)}
      ${statTemplate("Last 30 days", last30)}
      ${statTemplate("Last 90 days", last90)}
    `;

    analyticsProjectList.innerHTML = "";
    const projectStats = state.projects.map(p => {
      const projectSessions = getSessionsForWindow(90, p.id);
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

  return {
    renderProgressGraphUI,
    renderAnalytics,
    getSessionsForWindow
  };
}
