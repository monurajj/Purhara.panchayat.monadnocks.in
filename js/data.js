let appData = null;
let yearCatalog = null;

function getFinancialYear() {
  return localStorage.getItem('financialYear') || '2022-2023';
}

function setFinancialYear(year) {
  localStorage.setItem('financialYear', year);
}

async function loadYearCatalog() {
  if (yearCatalog) return yearCatalog;
  const res = await fetch('data/index.json');
  yearCatalog = await res.json();
  if (!localStorage.getItem('financialYear')) {
    setFinancialYear(yearCatalog.default);
  }
  return yearCatalog;
}

function getAvailableYears() {
  return yearCatalog?.years || [];
}

function getYearLabel(yearId) {
  const lang = getLang();
  const entry = getAvailableYears().find(y => y.id === yearId);
  if (!entry) return yearId;
  return lang === 'hi' ? entry.label_hi : entry.label;
}

/** English FY label for PDF (Helvetica-safe; avoids garbled Hindi numerals). */
function getYearLabelPdf(yearId) {
  const entry = getAvailableYears().find(y => y.id === yearId);
  return entry?.label || yearId;
}

async function loadData(force = false) {
  await loadYearCatalog();
  const year = getFinancialYear();
  const entry = yearCatalog.years.find(y => y.id === year && y.available)
    || yearCatalog.years.find(y => y.id === yearCatalog.default);

  if (entry && entry.id !== year) setFinancialYear(entry.id);

  if (appData && !force && appData.meta?.financial_year === entry.id) {
    return appData;
  }

  const res = await fetch(entry.file);
  appData = await res.json();
  window.appData = appData;
  return appData;
}

function switchFinancialYear(yearId) {
  const entry = yearCatalog?.years.find(y => y.id === yearId);
  if (!entry) return;
  if (!entry.available) {
    const msg = getLang() === 'hi'
      ? `वित्त वर्ष ${entry.label_hi} का डेटा जल्द उपलब्ध होगा।`
      : `Data for ${entry.label} is not yet available.`;
    alert(msg);
    const select = document.getElementById('fy-select');
    if (select) select.value = getFinancialYear();
    return;
  }
  if (yearId === getFinancialYear()) return;
  setFinancialYear(yearId);
  location.reload();
}

function getProjects() {
  return appData?.projects || [];
}

function getMeta() {
  return appData?.meta || {};
}

function getSchemes() {
  return appData?.schemes || [];
}

function getFocusAreas() {
  return appData?.focus_areas || [];
}

function getVillages() {
  return appData?.villages || [];
}

function getFinancialProgress() {
  return appData?.financial_progress || { receipt: 0, expenditure: 0 };
}

function getProjectCostTotal() {
  if (appData?.project_cost_total != null) return appData.project_cost_total;
  return getProjects().reduce((sum, p) => sum + p.total_cost, 0);
}
