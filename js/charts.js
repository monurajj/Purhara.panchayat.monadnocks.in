const chartInstances = {};

const CHART_COLORS = [
  '#166534', '#15803d', '#16a34a', '#22c55e', '#4ade80',
  '#ca8a04', '#d97706', '#ea580c', '#dc2626', '#7c3aed',
];

function destroyChart(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
    delete chartInstances[id];
  }
}

function chartLabel(text) {
  return text;
}

function createPieChart(canvasId, labels, data) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  chartInstances[canvasId] = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{ data, backgroundColor: CHART_COLORS, borderWidth: 2, borderColor: '#fff' }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } },
    },
  });
}

function createBarChart(canvasId, labels, data, horizontal = false) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  chartInstances[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: getLang() === 'hi' ? 'राशि (₹)' : 'Amount (₹)',
        data,
        backgroundColor: CHART_COLORS.slice(0, labels.length),
        borderRadius: 4,
      }],
    },
    options: {
      indexAxis: horizontal ? 'y' : 'x',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: !horizontal } },
        y: { grid: { display: horizontal }, beginAtZero: true },
      },
    },
  });
}

function createDoughnutChart(canvasId, labels, data) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  chartInstances[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: CHART_COLORS, borderWidth: 2, borderColor: '#fff' }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '55%',
      plugins: { legend: { position: 'right', labels: { font: { size: 10 } } } },
    },
  });
}

function createLineChart(canvasId, labels, data) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  chartInstances[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: getLang() === 'hi' ? 'परियोजनाएँ' : 'Projects',
        data,
        borderColor: '#166534',
        backgroundColor: 'rgba(22, 101, 52, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: '#166534',
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
    },
  });
}

function renderDashboardCharts(projects) {
  const lang = getLang();

  const focusCounts = {};
  projects.forEach(p => {
    const label = lang === 'hi' ? p.focus_area_hi : p.focus_area;
    focusCounts[label] = (focusCounts[label] || 0) + 1;
  });
  createPieChart('chart-focus-pie', Object.keys(focusCounts), Object.values(focusCounts));

  const schemeFunds = {};
  projects.forEach(p => {
    const label = lang === 'hi' ? (p.scheme_name_hi || p.scheme_name).substring(0, 20) : p.scheme_name.substring(0, 25);
    schemeFunds[label] = (schemeFunds[label] || 0) + p.total_cost;
  });
  createBarChart('chart-scheme-bar', Object.keys(schemeFunds), Object.values(schemeFunds));

  const villageCounts = {};
  projects.forEach(p => {
    const label = lang === 'hi' ? p.village_hi : p.village;
    villageCounts[label] = (villageCounts[label] || 0) + 1;
  });
  const sortedVillages = Object.entries(villageCounts).sort((a, b) => b[1] - a[1]);
  createBarChart('chart-village-bar', sortedVillages.map(v => v[0]), sortedVillages.map(v => v[1]), true);

  const focusCosts = {};
  projects.forEach(p => {
    const label = lang === 'hi' ? p.focus_area_hi : p.focus_area;
    focusCosts[label] = (focusCosts[label] || 0) + p.total_cost;
  });
  createDoughnutChart('chart-cost-doughnut', Object.keys(focusCosts), Object.values(focusCosts));

  const monthlyCompletions = {};
  const typeCounts = {};
  projects.forEach(p => {
    const label = lang === 'hi' ? (p.activity_type_hi || p.activity_type) : p.activity_type;
    typeCounts[label] = (typeCounts[label] || 0) + 1;
  });
  createLineChart('chart-completion-line', Object.keys(typeCounts), Object.values(typeCounts));
}

function renderFinancialChart(projects) {
  const lang = getLang();
  const villageFunds = {};
  projects.forEach(p => {
    const label = lang === 'hi' ? p.village_hi : p.village;
    villageFunds[label] = (villageFunds[label] || 0) + p.total_cost;
  });
  const sorted = Object.entries(villageFunds).sort((a, b) => b[1] - a[1]);
  createBarChart('chart-financial-village', sorted.map(v => v[0]), sorted.map(v => v[1]));
}
