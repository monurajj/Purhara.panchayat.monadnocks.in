const NAV_ITEMS = [
  { href: 'index.html', key: 'nav.home', id: 'home', icon: 'fa-home' },
  { href: 'table.html', key: 'nav.table', id: 'table', icon: 'fa-table' },
  { href: 'dashboard.html', key: 'nav.dashboard', id: 'dashboard', icon: 'fa-chart-pie' },
  { href: 'villages.html', key: 'nav.villages', id: 'villages', icon: 'fa-map-marker-alt' },
  { href: 'schemes.html', key: 'nav.schemes', id: 'schemes', icon: 'fa-file-contract' },
  { href: 'focus-areas.html', key: 'nav.focusAreas', id: 'focus-areas', icon: 'fa-bullseye' },
  { href: 'financial.html', key: 'nav.financial', id: 'financial', icon: 'fa-balance-scale' },
  { href: 'discrepancies.html', key: 'nav.discrepancies', id: 'discrepancies', icon: 'fa-exclamation-triangle' },
  { href: 'about.html', key: 'nav.about', id: 'about', icon: 'fa-info-circle' },
];

function renderMobileNav(activePage) {
  let bar = document.getElementById('mobile-bottom-nav');
  if (!bar) {
    bar = document.createElement('nav');
    bar.id = 'mobile-bottom-nav';
    bar.className = 'mobile-bottom-nav';
    bar.setAttribute('aria-label', 'Mobile navigation');
    document.body.appendChild(bar);
  }

  const items = [
    { href: 'index.html', key: 'nav.home', icon: 'fa-home', id: 'home' },
    { href: 'table.html', key: 'nav.table', icon: 'fa-table', id: 'table' },
    { href: 'dashboard.html', key: 'nav.dashboard', icon: 'fa-chart-pie', id: 'dashboard' },
    { href: 'financial.html', key: 'nav.financial', icon: 'fa-balance-scale', id: 'financial' },
    { href: 'about.html', key: 'nav.about', icon: 'fa-info-circle', id: 'about' },
  ];

  bar.innerHTML = items.map(item => {
    const isActive = item.id === activePage;
    return `<a href="${item.href}" class="mobile-nav-item${isActive ? ' mobile-nav-item--active' : ''}" data-i18n="${item.key}">
      <i class="fas ${item.icon}" aria-hidden="true"></i>
      <span>${t(item.key)}</span>
    </a>`;
  }).join('');
}

function renderHeader(activePage) {
  const header = document.getElementById('site-header');
  if (!header) return;

  const meta = getMeta();
  const currentYear = getFinancialYear();
  const years = getAvailableYears();
  const lang = getLang();

  const yearOptions = years.map(y => {
    const label = lang === 'hi' ? y.label_hi : y.label;
    const disabled = y.available ? '' : 'disabled';
    const suffix = y.available ? '' : (lang === 'hi' ? ' (जल्द)' : ' (Soon)');
    return `<option value="${y.id}" ${y.id === currentYear ? 'selected' : ''} ${disabled}>${label}${suffix}</option>`;
  }).join('');

  const navLinks = NAV_ITEMS.map(item => {
    const isActive = item.id === activePage;
    const cls = isActive ? 'nav-link nav-link-active' : 'nav-link';
    return `<a href="${item.href}" class="${cls}" data-i18n="${item.key}">
      <i class="fas ${item.icon} nav-link-icon"></i>
      <span>${t(item.key)}</span>
    </a>`;
  }).join('');

  const gpName = lang === 'hi' ? (meta.gram_panchayat_hi || 'पुरहरा') : (meta.gram_panchayat || 'Purhara');
  const block = field(meta, 'block');
  const district = field(meta, 'district');
  const state = field(meta, 'state');

  header.innerHTML = `
    <div class="site-topbar">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="site-topbar__inner">
          <div class="site-topbar__brand">
            <div class="brand-emblem shrink-0">
              <i class="fas fa-landmark"></i>
            </div>
            <div class="min-w-0">
              <p class="brand-tagline" data-i18n="brand.tagline">${t('brand.tagline')}</p>
              <h1 class="brand-title"><span data-i18n="brand.panchayat">${t('brand.panchayat')}</span> ${gpName}</h1>
              <p class="brand-subtitle">${block} · ${district}, ${state}</p>
            </div>
          </div>
          <div class="site-topbar__controls">
            <div class="fy-selector-wrap">
              <label for="fy-select" class="fy-label" data-i18n="brand.fyLabel">${t('brand.fyLabel')}</label>
              <div class="fy-select-box">
                <i class="fas fa-calendar-alt fy-select-icon"></i>
                <select id="fy-select" class="fy-select" onchange="switchFinancialYear(this.value)" aria-label="${t('brand.fyLabel')}">
                  ${yearOptions}
                </select>
              </div>
            </div>
            <button id="lang-toggle" class="lang-btn" onclick="toggleLanguage()">${t('langToggle')}</button>
          </div>
        </div>
      </div>
    </div>
    <nav class="site-nav sticky top-0 z-40" aria-label="Main navigation">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p class="nav-scroll-hint" aria-hidden="true"><i class="fas fa-arrows-alt-h"></i></p>
        <div class="nav-scroll scrollbar-hide">
          <div class="nav-links">
            ${navLinks}
          </div>
        </div>
      </div>
    </nav>
  `;
  renderMobileNav(activePage);
}

function renderModal() {
  if (document.getElementById('project-modal')) return;
  const modal = document.createElement('div');
  modal.id = 'project-modal';
  modal.className = 'hidden fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50';
  modal.innerHTML = `
    <div class="modal-panel bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">
      <div class="sticky top-0 bg-green-800 text-white px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-2xl sm:rounded-t-2xl z-10">
        <h2 class="text-base sm:text-lg font-bold pr-2" data-i18n="modal.title">${t('modal.title')}</h2>
        <button id="modal-close" type="button" class="modal-close-btn text-2xl leading-none hover:text-green-200 transition" aria-label="Close">&times;</button>
      </div>
      <div class="p-4 sm:p-6 space-y-4">
        <div>
          <label class="text-xs font-semibold text-gray-500 uppercase" data-i18n="modal.description">${t('modal.description')}</label>
          <p id="modal-desc" class="text-gray-900 font-medium mt-1 text-sm sm:text-base break-words"></p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div><label class="text-xs text-gray-500" data-i18n="table.sNo">${t('table.sNo')}</label><p id="modal-sno" class="font-medium"></p></div>
          <div><label class="text-xs text-gray-500" data-i18n="modal.code">${t('modal.code')}</label><p id="modal-code" class="font-mono font-medium"></p></div>
          <div><label class="text-xs text-gray-500" data-i18n="modal.type">${t('modal.type')}</label><p id="modal-type" class="font-medium"></p></div>
          <div><label class="text-xs text-gray-500" data-i18n="modal.focusArea">${t('modal.focusArea')}</label><p id="modal-focus" class="font-medium"></p></div>
          <div class="md:col-span-2"><label class="text-xs text-gray-500" data-i18n="modal.scheme">${t('modal.scheme')}</label><p id="modal-scheme" class="font-medium text-xs"></p></div>
          <div class="md:col-span-2"><label class="text-xs text-gray-500" data-i18n="modal.component">${t('modal.component')}</label><p id="modal-component" class="font-medium text-xs"></p></div>
          <div><label class="text-xs text-gray-500" data-i18n="modal.cost">${t('modal.cost')}</label><p id="modal-cost" class="font-bold text-green-700 text-lg"></p></div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  if (typeof initModal === 'function') initModal();
}

function renderFooter() {
  const footer = document.getElementById('site-footer');
  if (!footer) return;
  const meta = getMeta();
  const fy = getYearLabel(meta.financial_year || getFinancialYear());
  footer.innerHTML = `
    <div class="site-footer">
      <div class="max-w-7xl mx-auto px-4 py-6 text-center text-sm">
        <p class="text-gray-300">
          &copy; ${new Date().getFullYear()} ${t('brand.panchayat')} ${field(meta, 'gram_panchayat')}
          · ${field(meta, 'block')}, ${field(meta, 'district')}, ${field(meta, 'state')}
        </p>
        <p class="text-gray-500 text-xs mt-1">${fy}</p>
      </div>
      <div class="site-footer-monadnocks">
        <div class="max-w-7xl mx-auto px-4 py-4 text-center text-xs sm:text-sm">
          <p class="text-gray-400">
            ${t('footer.developed')} <span class="text-green-400 font-semibold">Monadnocks</span>
          </p>
          <p class="text-gray-500 mt-2 leading-relaxed max-w-2xl mx-auto">
            ${t('footer.promo')}
            <a href="mailto:contactmonadnocks@gmail.com" class="footer-link">contactmonadnocks@gmail.com</a>
          </p>
          <p class="mt-2">
            <a href="https://monadnocks.in" target="_blank" rel="noopener noreferrer" class="footer-link inline-flex items-center gap-1">
              ${t('footer.visit')} <i class="fas fa-external-link-alt text-[10px]"></i>
            </a>
          </p>
        </div>
      </div>
    </div>
  `;
}

async function initApp(activePage) {
  setLang(getLang());
  await loadData();
  renderHeader(activePage);
  applyTranslations();
  renderModal();
  applyTranslations();
}
