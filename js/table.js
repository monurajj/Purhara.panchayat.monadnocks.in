let projectFilter;

function renderFilterDropdowns(projects) {
  const fill = (id, items, allLabel) => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = `<option value="">${allLabel}</option>` +
      items.map(i => `<option value="${i.value}">${i.label}</option>`).join('');
  };

  fill('filter-village', getUniqueValues(projects, 'village'), t('table.all'));
  fill('filter-focus', getUniqueValues(projects, 'focus_area'), t('table.all'));
  fill('filter-scheme', getUniqueValues(projects, 'scheme_name'), t('table.all'));
}

function renderTable() {
  const { items, total, page, totalPages } = projectFilter.getPage();
  const tbody = document.getElementById('projects-tbody');
  if (!tbody) return;

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center py-8 text-gray-500">${t('table.noResults')}</td></tr>`;
  } else {
    tbody.innerHTML = items.map(p => `
      <tr class="border-b hover:bg-green-50 transition">
        <td class="px-3 py-2 text-sm">${p.s_no}</td>
        <td class="px-3 py-2 text-sm font-mono">${p.activity_code}</td>
        <td class="px-3 py-2 text-sm max-w-xs truncate" title="${field(p, 'activity_description')}">${field(p, 'activity_description')}</td>
        <td class="px-3 py-2 text-sm">${field(p, 'activity_type')}</td>
        <td class="px-3 py-2 text-sm">${field(p, 'focus_area')}</td>
        <td class="px-3 py-2 text-sm text-xs max-w-[8rem] truncate" title="${field(p, 'scheme_name')}">${field(p, 'scheme_name')}</td>
        <td class="px-3 py-2 text-sm text-xs">${field(p, 'scheme_component_name')}</td>
        <td class="px-3 py-2 text-sm font-medium whitespace-nowrap">${formatCurrency(p.total_cost)}</td>
        <td class="px-3 py-2">
          <button onclick="showProjectModal(appData.projects.find(x=>x.s_no===${p.s_no}))" class="btn-touch-inline text-green-700 hover:text-green-900 text-sm font-medium py-2 px-1 min-h-[2.75rem]">
            <i class="fas fa-eye"></i> <span data-i18n="table.view">${t('table.view')}</span>
          </button>
        </td>
      </tr>
    `).join('');
  }

  document.getElementById('page-info').textContent =
    `${t('table.showing')} ${((page - 1) * projectFilter.perPage) + 1}-${Math.min(page * projectFilter.perPage, total)} ${t('table.of')} ${total}`;

  document.getElementById('btn-prev').disabled = page <= 1;
  document.getElementById('btn-next').disabled = page >= totalPages;

  renderGrandTotal();
}

function renderGrandTotal() {
  const el = document.getElementById('table-grand-total');
  if (!el || !projectFilter) return;
  const filtered = projectFilter.getFiltered();
  const totalCost = filtered.reduce((s, p) => s + p.total_cost, 0);
  el.innerHTML = `
    <p class="text-sm font-semibold text-green-900 mb-2">${t('table.grandTotal')} (${filtered.length} ${t('table.projects')})</p>
    ${amountWordsHtml(totalCost, 0)}
  `;
}

function bindTableEvents() {
  const bind = (id, key) => {
    document.getElementById(id)?.addEventListener('change', e => {
      projectFilter.setFilter(key, e.target.value);
      renderTable();
    });
    document.getElementById(id)?.addEventListener('input', e => {
      projectFilter.setFilter(key, e.target.value);
      renderTable();
    });
  };

  bind('filter-village', 'village');
  bind('filter-focus', 'focusArea');
  bind('filter-scheme', 'scheme');
  bind('filter-search', 'search');

  const costMin = document.getElementById('cost-min');
  const costMax = document.getElementById('cost-max');
  const costLabel = document.getElementById('cost-label');
  const costFill = document.getElementById('cost-range-fill');

  function updateCostFill(min, max) {
    const ceiling = projectFilter.maxCost;
    if (!costFill || !ceiling) return;
    const left = (min / ceiling) * 100;
    const right = 100 - (max / ceiling) * 100;
    costFill.style.left = `${left}%`;
    costFill.style.right = `${right}%`;
  }

  function updateCost(source) {
    let min = Number(costMin.value);
    let max = Number(costMax.value);
    if (min > max) {
      if (source === 'min') {
        max = min;
        costMax.value = max;
      } else {
        min = max;
        costMin.value = min;
      }
    }
    projectFilter.setFilter('costMin', min);
    projectFilter.setFilter('costMax', max);
    updateCostFill(min, max);
    costLabel.textContent = `${formatCurrency(min)} — ${formatCurrency(max)}`;
    renderTable();
  }

  costMin?.addEventListener('input', () => updateCost('min'));
  costMax?.addEventListener('input', () => updateCost('max'));

  function focusCostThumb(el) {
    costMin?.classList.remove('range-slider__input--active');
    costMax?.classList.remove('range-slider__input--active');
    el?.classList.add('range-slider__input--active');
  }
  costMin?.addEventListener('pointerdown', () => focusCostThumb(costMin));
  costMax?.addEventListener('pointerdown', () => focusCostThumb(costMax));

  document.querySelectorAll('.sortable').forEach(th => {
    th.addEventListener('click', () => {
      projectFilter.setSort(th.dataset.sort);
      document.querySelectorAll('.sortable').forEach(t => t.classList.remove('active'));
      th.classList.add('active');
      renderTable();
    });
  });

  document.getElementById('btn-prev')?.addEventListener('click', () => {
    projectFilter.page--;
    renderTable();
  });
  document.getElementById('btn-next')?.addEventListener('click', () => {
    projectFilter.page++;
    renderTable();
  });

  document.getElementById('export-csv')?.addEventListener('click', () => {
    exportToCSV(projectFilter.getFiltered());
  });
  document.getElementById('export-pdf')?.addEventListener('click', async () => {
    const btn = document.getElementById('export-pdf');
    if (!btn || btn.disabled) return;

    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.classList.add('opacity-70', 'cursor-wait', 'pointer-events-none');
    btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-1" aria-hidden="true"></i> <span>${t('table.generatingPdf')}</span>`;

    try {
      await exportToPDF(projectFilter.getFiltered(), tEn('table.title'), {
        filters: { ...projectFilter.filters },
        maxCost: projectFilter.maxCost,
        totalInDataset: projectFilter.all.length,
      });
    } catch (err) {
      console.error('PDF export failed:', err);
      window.alert(t('table.exportPdfFailed'));
    } finally {
      btn.disabled = false;
      btn.classList.remove('opacity-70', 'cursor-wait', 'pointer-events-none');
      btn.innerHTML = originalHtml;
    }
  });
}

async function initTablePage() {
  await initApp('table');
  const projects = getProjects();
  projectFilter = new ProjectFilter(projects);
  projectFilter.applyFromURL();

  const maxCost = projectFilter.maxCost;
  const costMin = document.getElementById('cost-min');
  const costMax = document.getElementById('cost-max');
  if (costMin && costMax) {
    costMin.min = 0;
    costMin.max = maxCost;
    costMin.value = projectFilter.filters.costMin || 0;
    costMax.min = 0;
    costMax.max = maxCost;
    costMax.value = projectFilter.filters.costMax < Infinity ? projectFilter.filters.costMax : maxCost;
    projectFilter.filters.costMax = Number(costMax.value);
    const minVal = Number(costMin.value);
    const maxVal = Number(costMax.value);
    const fill = document.getElementById('cost-range-fill');
    if (fill) {
      fill.style.left = `${(minVal / maxCost) * 100}%`;
      fill.style.right = `${100 - (maxVal / maxCost) * 100}%`;
    }
    document.getElementById('cost-label').textContent =
      `${formatCurrency(minVal)} — ${formatCurrency(maxVal)}`;
  }

  ['village', 'focusArea', 'scheme'].forEach(k => {
    const elId = { village: 'filter-village', focusArea: 'filter-focus', scheme: 'filter-scheme' }[k];
    const el = document.getElementById(elId);
    if (el && projectFilter.filters[k]) el.value = projectFilter.filters[k];
  });
  const searchEl = document.getElementById('filter-search');
  if (searchEl && projectFilter.filters.search) searchEl.value = projectFilter.filters.search;

  renderFilterDropdowns(projects);
  if (projectFilter.filters.village) document.getElementById('filter-village').value = projectFilter.filters.village;
  if (projectFilter.filters.focusArea) document.getElementById('filter-focus').value = projectFilter.filters.focusArea;
  if (projectFilter.filters.scheme) document.getElementById('filter-scheme').value = projectFilter.filters.scheme;

  bindTableEvents();
  renderTable();
  renderFooter();
}
