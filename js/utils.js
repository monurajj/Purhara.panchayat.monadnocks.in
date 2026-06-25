const HIGH_COST_THRESHOLD = 500000;

function getUniqueValues(projects, field) {
  const lang = getLang();
  const seen = new Map();
  projects.forEach(p => {
    const val = p[field];
    const label = lang === 'hi' && p[field + '_hi'] ? p[field + '_hi'] : val;
    if (!seen.has(val)) seen.set(val, label);
  });
  return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([value, label]) => ({ value, label }));
}

function detectDiscrepancies(projects) {
  const duplicates = [];
  const descMap = new Map();
  projects.forEach(p => {
    const key = `${p.village}|${p.ward}|${p.focus_area}|${p.activity_description.substring(0, 40)}`;
    if (descMap.has(key)) {
      duplicates.push({ project: p, duplicateOf: descMap.get(key) });
    } else {
      descMap.set(key, p);
    }
  });

  const highCost = projects.filter(p => p.total_cost > HIGH_COST_THRESHOLD);

  const incomplete = projects.filter(p => !/GRAM\s+/i.test(p.activity_description));

  const costMismatches = [];
  const byFocus = groupBy(projects, 'focus_area');
  Object.values(byFocus).forEach(group => {
    if (group.length < 3) return;
    const costs = group.map(p => p.total_cost);
    const avg = costs.reduce((a, b) => a + b, 0) / costs.length;
    group.forEach(p => {
      if (p.total_cost > avg * 3) {
        costMismatches.push({ project: p, avgCost: Math.round(avg), ratio: (p.total_cost / avg).toFixed(1) });
      }
    });
  });

  return {
    duplicates,
    highCost,
    incomplete,
    costMismatches,
    total: duplicates.length + highCost.length + incomplete.length + costMismatches.length,
  };
}

function detectFinancialIrregularities(data) {
  const issues = [];
  const fp = data.financial_progress;
  const utilization = fp.expenditure / fp.receipt;

  if (utilization > 1) {
    issues.push({
      type: 'over-expenditure',
      severity: 'high',
      message: { en: 'Expenditure exceeds total receipt by ' + formatCurrency(fp.expenditure - fp.receipt), hi: 'व्यय कुल प्राप्ति से ' + formatCurrency(fp.expenditure - fp.receipt) + ' अधिक है' },
    });
  }
  if (utilization < 0.5) {
    issues.push({
      type: 'low-utilization',
      severity: 'medium',
      message: { en: 'Fund utilization below 50% — significant unspent balance', hi: 'निधि उपयोग ५०% से कम — महत्वपूर्ण अव्ययित शेष' },
    });
  }

  data.schemes.forEach(s => {
    const schemeUtil = s.expenditure_amount / s.receipt_amount;
    if (schemeUtil > 1.1) {
      issues.push({
        type: 'scheme-over',
        severity: 'high',
        message: {
          en: `${field(s, 'scheme_name')} expenditure exceeds allocation`,
          hi: `${field(s, 'scheme_name')} व्यय आवंटन से अधिक`,
        },
      });
    }
  });

  const disc = detectDiscrepancies(data.projects);
  if (disc.total > 0) {
    issues.push({
      type: 'project-flags',
      severity: 'medium',
      message: {
        en: `${disc.total} project-level discrepancies detected`,
        hi: `${disc.total} परियोजना-स्तरीय विसंगतियाँ पाई गईं`,
      },
    });
  }

  return issues;
}

function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key];
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

function sumBy(arr, key) {
  return arr.reduce((s, item) => s + (item[key] || 0), 0);
}

function getStatusClass(status) {
  const map = {
    Completed: 'bg-green-100 text-green-800',
    'In Progress': 'bg-yellow-100 text-yellow-800',
    Pending: 'bg-red-100 text-red-800',
  };
  return map[status] || 'bg-gray-100 text-gray-800';
}

function animateCounter(el, target, duration = 1500) {
  const start = 0;
  const startTime = performance.now();
  const isCurrency = el.dataset.currency === 'true';
  const isPercent = el.dataset.percent === 'true';

  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = start + (target - start) * eased;

    if (isPercent) {
      el.textContent = current.toFixed(1) + '%';
    } else if (isCurrency) {
      el.textContent = formatCurrency(Math.round(current));
    } else {
      el.textContent = formatNumber(Math.round(current));
    }

    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function exportToCSV(projects, filename = 'projects.csv') {
  const lang = getLang();
  const headers = lang === 'hi'
    ? ['क्र.सं.', 'कोड', 'विवरण', 'प्रकार', 'फोकस क्षेत्र', 'योजना', 'योजना घटक', 'लागत']
    : ['S.No', 'Code', 'Description', 'Type', 'Focus Area', 'Scheme', 'Scheme Component', 'Cost'];

  const rows = projects.map(p => [
    p.s_no,
    p.activity_code,
    `"${field(p, 'activity_description').replace(/"/g, '""')}"`,
    field(p, 'activity_type'),
    field(p, 'focus_area'),
    field(p, 'scheme_name'),
    field(p, 'scheme_component_name'),
    p.total_cost,
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

const EN_ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];
const EN_TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const HI_0_99 = [
  '', 'एक', 'दो', 'तीन', 'चार', 'पाँच', 'छह', 'सात', 'आठ', 'नौ', 'दस',
  'ग्यारह', 'बारह', 'तेरह', 'चौदह', 'पंद्रह', 'सोलह', 'सत्रह', 'अठारह', 'उन्नीस',
  'बीस', 'इक्कीस', 'बाईस', 'तेईस', 'चौबीस', 'पच्चीस', 'छब्बीस', 'सत्ताईस', 'अट्ठाईस', 'उनतीस',
  'तीस', 'इकतीस', 'बत्तीस', 'तैंतीस', 'चौंतीस', 'पैंतीस', 'छत्तीस', 'सैंतीस', 'अड़तीस', 'उनतालीस',
  'चालीस', 'इकतालीस', 'बयालीस', 'तैंतालीस', 'चवालीस', 'पैंतालीस', 'छियालीस', 'सैंतालीस', 'अड़तालीस', 'उनचास',
  'पचास', 'इक्यावन', 'बावन', 'तिरपन', 'चौवन', 'पचपन', 'छप्पन', 'सत्तावन', 'अट्ठावन', 'उनसठ',
  'साठ', 'इकसठ', 'बासठ', 'तिरसठ', 'चौंसठ', 'पैंसठ', 'छियासठ', 'सड़सठ', 'अड़सठ', 'उनहत्तर',
  'सत्तर', 'इकहत्तर', 'बहत्तर', 'तिहत्तर', 'चौहत्तर', 'पचहत्तर', 'छिहत्तर', 'सतहत्तर', 'अठहत्तर', 'उनासी',
  'अस्सी', 'इक्यासी', 'बयासी', 'तिरासी', 'चौरासी', 'पचासी', 'छियासी', 'सतासी', 'अट्ठासी', 'नवासी',
  'नब्बे', 'इक्यानवे', 'बानवे', 'तिरानवे', 'चौरानवे', 'पचानवे', 'छियानवे', 'सतानवे', 'अट्ठानवे', 'निन्यानवे',
];

function enUnder1000(n) {
  if (n === 0) return '';
  if (n < 100) {
    if (n < 20) return EN_ONES[n];
    const t = Math.floor(n / 10);
    const o = n % 10;
    return EN_TENS[t] + (o ? ' ' + EN_ONES[o] : '');
  }
  const h = Math.floor(n / 100);
  const r = n % 100;
  return EN_ONES[h] + ' Hundred' + (r ? ' ' + enUnder1000(r) : '');
}

function hiUnder1000(n) {
  if (n === 0) return '';
  const h = Math.floor(n / 100);
  const r = n % 100;
  let s = '';
  if (h) s = HI_0_99[h] + ' सौ';
  if (r) s += (s ? ' ' : '') + HI_0_99[r];
  return s;
}

function splitIndianAmount(amount) {
  const rounded = Math.round(Number(amount) * 100) / 100;
  if (!isFinite(rounded)) return { intPart: 0, paise: 0 };
  const intPart = Math.floor(rounded);
  const paise = Math.round((rounded - intPart) * 100);
  return { intPart, paise };
}

function buildIndianAmountWords(intPart, paise, under1000, chunk, scales, paiseLabel, suffix) {
  if (intPart === 0 && paise === 0) {
    return suffix.trim() === 'Only' ? 'Zero Only' : 'शून्य मात्र';
  }

  let n = intPart;
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const rest = n;

  const parts = [];
  if (crore) parts.push(chunk(crore, scales.crore));
  if (lakh) parts.push(chunk(lakh, scales.lakh));
  if (thousand) parts.push(chunk(thousand, scales.thousand));
  if (rest) parts.push(under1000(rest));

  let result = parts.join(' ').trim();
  if (paise > 0) {
    const paiseWords = under1000(paise);
    const joiner = result ? paiseLabel.joiner : '';
    result += joiner + paiseLabel.prefix + paiseWords;
  }
  return result + suffix;
}

function numberToWordsEn(amount) {
  const { intPart, paise } = splitIndianAmount(amount);
  return buildIndianAmountWords(intPart, paise, enUnder1000, (n, scale) => {
    if (n === 0) return '';
    const words = n < 1000 ? enUnder1000(n) : enUnder1000(n);
    return words + ' ' + scale;
  }, { crore: 'Crore', lakh: 'Lakh', thousand: 'Thousand' }, { prefix: 'Paise ', joiner: ' and ' }, ' Only');
}

function numberToWordsHi(amount) {
  const { intPart, paise } = splitIndianAmount(amount);
  return buildIndianAmountWords(intPart, paise, hiUnder1000, (n, scale) => {
    if (n === 0) return '';
    const words = n < 100 ? HI_0_99[n] : hiUnder1000(n);
    return words + ' ' + scale;
  }, { crore: 'करोड़', lakh: 'लाख', thousand: 'हज़ार' }, { prefix: 'पैसे ', joiner: ' और ' }, ' मात्र');
}

function formatPdfAmountLatin(amount, decimals = 2) {
  return formatPdfINR(amount, decimals) + '\n' + numberToWordsEn(amount);
}

function formatPdfAmountWithWords(amount, decimals = 2, includeHindi = true) {
  const lines = [
    formatPdfINR(amount, decimals),
    numberToWordsEn(amount),
  ];
  if (includeHindi) lines.push(numberToWordsHi(amount));
  return lines.join('\n');
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

const PDF_DEVANAGARI_FONT = 'NotoSansDevanagari';
const PDF_DEVANAGARI_FILE = 'NotoSansDevanagari-Regular.ttf';

async function ensurePdfDevanagariFont(doc) {
  if (doc.getFontList()[PDF_DEVANAGARI_FONT]) return true;
  try {
    if (!window.__pdfDevanagariFontBase64) {
      const res = await fetch('fonts/NotoSansDevanagari-Regular.ttf');
      if (!res.ok) throw new Error('Font fetch failed');
      window.__pdfDevanagariFontBase64 = arrayBufferToBase64(await res.arrayBuffer());
    }
    doc.addFileToVFS(PDF_DEVANAGARI_FILE, window.__pdfDevanagariFontBase64);
    doc.addFont(PDF_DEVANAGARI_FILE, PDF_DEVANAGARI_FONT, 'normal');
    return true;
  } catch (err) {
    console.warn('Hindi PDF font unavailable; amount words will be English only.', err);
    return false;
  }
}

function isPdfSummaryHindiCell(row, col, hindiRows) {
  if (!hindiRows.has(row)) return false;
  return col === 1 || col === 3;
}

function inferProjectStatus(project) {
  if (project.status) return project.status;
  const sNo = Number(project.s_no);
  if (sNo <= 60) return 'Completed';
  if (sNo <= 80) return 'In Progress';
  return 'Pending';
}

function sumCostsByStatus(projects) {
  const totals = {
    Completed: 0,
    'In Progress': 0,
    Pending: 0,
    count: { Completed: 0, 'In Progress': 0, Pending: 0 },
  };
  projects.forEach(p => {
    const status = inferProjectStatus(p);
    if (totals[status] === undefined) return;
    totals[status] += p.total_cost;
    totals.count[status]++;
  });
  return totals;
}

function pushPdfAmountPair(rows, hindiRowIndexes, leftLabel, leftAmount, rightLabel, rightAmount, hindiFontReady) {
  rows.push([
    leftLabel,
    formatPdfAmountLatin(leftAmount, 0),
    rightLabel || '',
    rightAmount != null ? formatPdfAmountLatin(rightAmount, 0) : '',
  ]);
  if (!hindiFontReady) return;
  hindiRowIndexes.add(rows.length);
  rows.push([
    '',
    numberToWordsHi(leftAmount),
    '',
    rightAmount != null ? numberToWordsHi(rightAmount) : '',
  ]);
}

const STATUS_PDF_THEMES = {
  Completed: {
    header: [22, 101, 52],
    bg: [240, 253, 244],
    border: [34, 197, 94],
    text: [20, 83, 45],
    muted: [74, 120, 86],
  },
  'In Progress': {
    header: [180, 83, 9],
    bg: [255, 251, 235],
    border: [245, 158, 11],
    text: [146, 64, 14],
    muted: [161, 98, 7],
  },
  Pending: {
    header: [185, 28, 28],
    bg: [254, 242, 242],
    border: [239, 68, 68],
    text: [153, 27, 27],
    muted: [185, 28, 28],
  },
};

function calcPdfStatusCardHeight(doc, w, amount, hindiFontReady) {
  const headerH = 8;
  const bodyPad = 3;
  let bodyH = 9;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  const enLines = doc.splitTextToSize(numberToWordsEn(amount), w - 8);
  bodyH += enLines.length * 3.2;

  if (hindiFontReady) {
    doc.setFontSize(6);
    const hiLines = doc.splitTextToSize(numberToWordsHi(amount), w - 8);
    bodyH += 1.5 + hiLines.length * 3;
  }

  return headerH + bodyH + bodyPad;
}

function drawPdfStatusCard(doc, x, y, w, h, theme, label, amount, hindiFontReady) {
  doc.setFillColor(...theme.bg);
  doc.setDrawColor(...theme.border);
  doc.setLineWidth(0.5);
  if (typeof doc.roundedRect === 'function') {
    doc.roundedRect(x, y, w, h, 2.5, 2.5, 'FD');
  } else {
    doc.rect(x, y, w, h, 'FD');
  }

  const headerH = 8;
  doc.setFillColor(...theme.header);
  doc.rect(x, y, w, headerH, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(label, x + 4, y + 5.5);

  doc.setTextColor(...theme.text);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(formatPdfINR(amount, 0), x + 4, y + headerH + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...theme.muted);
  const enLines = doc.splitTextToSize(numberToWordsEn(amount), w - 8);
  doc.text(enLines, x + 4, y + headerH + 10);

  if (hindiFontReady) {
    doc.setFont(PDF_DEVANAGARI_FONT, 'normal');
    doc.setFontSize(6);
    const hiY = y + headerH + 10 + enLines.length * 3.2 + 1;
    const hiLines = doc.splitTextToSize(numberToWordsHi(amount), w - 8);
    doc.text(hiLines, x + 4, hiY);
  }
}

function drawPdfProjectCountBar(doc, x, y, w, statusTotals) {
  const barH = 28;
  const headerH = 8;
  const pillH = 14;
  const items = [
    { key: 'Completed', short: 'C', label: 'Completed' },
    { key: 'In Progress', short: 'IP', label: 'In Progress' },
    { key: 'Pending', short: 'P', label: 'Pending' },
  ];

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);
  if (typeof doc.roundedRect === 'function') {
    doc.roundedRect(x, y, w, barH, 3, 3, 'FD');
  } else {
    doc.rect(x, y, w, barH, 'FD');
  }

  doc.setFillColor(51, 65, 85);
  doc.rect(x, y, w, headerH, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Projects (C / IP / P)', x + 4, y + 5.5);

  const pillW = (w - 24) / 3;
  items.forEach((item, i) => {
    const theme = STATUS_PDF_THEMES[item.key];
    const px = x + 8 + i * (pillW + 4);
    const py = y + headerH + 3;
    doc.setFillColor(...theme.bg);
    doc.setDrawColor(...theme.border);
    doc.setLineWidth(0.35);
    if (typeof doc.roundedRect === 'function') {
      doc.roundedRect(px, py, pillW, pillH, 2, 2, 'FD');
    } else {
      doc.rect(px, py, pillW, pillH, 'FD');
    }

    doc.setTextColor(...theme.header);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text(`${item.short} — ${item.label}`, px + 3, py + 4.5);

    doc.setTextColor(...theme.text);
    doc.setFontSize(12);
    doc.text(String(statusTotals.count[item.key]), px + 3, py + 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...theme.muted);
    doc.text('projects', px + pillW - 3, py + 11, { align: 'right' });
  });
}

function drawPdfStatusSummaryLastPage(doc, opts) {
  const {
    statusTotals, projectCount, totalCost, fyLabel, meta, hindiFontReady, margin, pageW,
  } = opts;

  doc.addPage();
  const pageH = doc.internal.pageSize.getHeight();

  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageW, 24, 'F');
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 22, pageW, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('Work Status & Amount Summary', margin, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(
    `Gram Panchayat ${meta.gram_panchayat}  |  ${fyLabel}  |  ${projectCount} projects in report`,
    margin,
    18,
  );

  const contentW = pageW - margin * 2;
  const gap = 8;
  const cardW = (contentW - gap * 2) / 3;
  const cardY = 30;

  const cards = [
    { key: 'Completed', label: 'Completed Amount' },
    { key: 'In Progress', label: 'In Progress Amount' },
    { key: 'Pending', label: 'Pending Amount' },
  ];

  const cardH = Math.max(
    ...cards.map(card => calcPdfStatusCardHeight(doc, cardW, statusTotals[card.key], hindiFontReady)),
  );

  cards.forEach((card, i) => {
    drawPdfStatusCard(
      doc,
      margin + i * (cardW + gap),
      cardY,
      cardW,
      cardH,
      STATUS_PDF_THEMES[card.key],
      card.label,
      statusTotals[card.key],
      hindiFontReady,
    );
  });

  drawPdfProjectCountBar(doc, margin, cardY + cardH + 8, contentW, statusTotals);

  const grandY = cardY + cardH + 8 + 28 + 8;
  drawPdfGrandTotalBlock(
    doc, margin, grandY, contentW, opts.totalCost, projectCount, hindiFontReady,
  );

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Amounts are based on projects included in this report. Status: Completed / In Progress / Pending.',
    margin,
    pageH - 14,
  );
}

function buildPdfFilename(fy, filters, maxCost) {
  const fySlug = String(fy).replace(/\//g, '-');
  const base = `purhara-gp-projects-FY${fySlug}`;
  if (!filters) return `${base}.pdf`;

  const parts = [];
  if (filters.village) parts.push(`village-${pdfSlug(filters.village)}`);
  if (filters.focusArea) parts.push(`focus-${pdfSlug(filters.focusArea)}`);
  if (filters.scheme) parts.push(`scheme-${pdfSlug(filters.scheme).slice(0, 28)}`);
  if (filters.search) parts.push(`search-${pdfSlug(filters.search).slice(0, 18)}`);
  const costFiltered = filters.costMin > 0
    || (Number.isFinite(filters.costMax) && filters.costMax < maxCost);
  if (costFiltered) parts.push('cost-range');

  if (parts.length === 0) return `${base}.pdf`;
  return `${base}-filtered-${parts.join('-')}.pdf`;
}

function pdfSlug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function describePdfFilters(filters, maxCost, filteredCount, totalCount) {
  if (!filters) return null;
  const parts = [];
  if (filters.village) parts.push(`Village = ${filters.village}`);
  if (filters.focusArea) parts.push(`Focus Area = ${filters.focusArea}`);
  if (filters.scheme) parts.push(`Scheme = ${filters.scheme}`);
  if (filters.search) parts.push(`Search = "${filters.search}"`);
  const costMax = filters.costMax === Infinity ? maxCost : filters.costMax;
  const costFiltered = filters.costMin > 0 || costMax < maxCost;
  if (costFiltered) {
    parts.push(`Cost = ${formatPdfINR(filters.costMin, 0)} to ${formatPdfINR(costMax, 0)}`);
  }
  if (parts.length === 0) return null;
  return `Active filters: ${parts.join(', ')} (${filteredCount} of ${totalCount} projects)`;
}

const PDF_SOURCE_HOST = 'purhara.panchayat.monadnocks.in';
const PDF_SOURCE_URL = `https://${PDF_SOURCE_HOST}`;
const PDF_MINI_HEADER_H = 10;

function addPdfTextLink(doc, text, x, y, url, options = {}) {
  const align = options.align || 'left';
  const fontSize = options.fontSize || doc.internal.getFontSize();
  doc.setFontSize(fontSize);
  const textW = doc.getTextWidth(text);
  const textH = fontSize * 0.352778;

  let linkX = x;
  if (align === 'right') linkX = x - textW;
  else if (align === 'center') linkX = x - textW / 2;

  if (options.color) doc.setTextColor(...options.color);

  if (typeof doc.textWithLink === 'function') {
    doc.textWithLink(text, linkX, y, { url });
    return;
  }

  if (align === 'right') doc.text(text, x, y, { align: 'right' });
  else if (align === 'center') doc.text(text, x, y, { align: 'center' });
  else doc.text(text, x, y);
  doc.link(linkX, y - textH * 0.85, textW, textH, { url });
}

function drawPdfMiniHeader(doc, pageW, margin, meta, fyLabel) {
  doc.setFillColor(20, 83, 45);
  doc.rect(0, 0, pageW, PDF_MINI_HEADER_H, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`Gram Panchayat ${meta.gram_panchayat}  |  ${fyLabel}`, margin, 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  addPdfTextLink(doc, PDF_SOURCE_HOST, pageW - margin, 6, PDF_SOURCE_URL, {
    align: 'right',
    fontSize: 6.5,
    color: [187, 247, 208],
  });
}

function drawPdfGrandTotalBlock(doc, x, y, w, totalCost, projectCount, hindiFontReady) {
  const latinBlock = formatPdfAmountLatin(totalCost, 0);
  const latinLines = doc.splitTextToSize(latinBlock, w - 4);
  const hiLines = hindiFontReady
    ? doc.splitTextToSize(numberToWordsHi(totalCost), w - 4)
    : [];
  const blockH = 8 + latinLines.length * 3.6 + hiLines.length * 3.2 + 4;

  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(34, 197, 94);
  doc.setLineWidth(0.3);
  if (typeof doc.roundedRect === 'function') {
    doc.roundedRect(x, y, w, blockH, 2, 2, 'FD');
  } else {
    doc.rect(x, y, w, blockH, 'FD');
  }

  doc.setTextColor(20, 83, 45);
  let cy = y + 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`Grand Total (${projectCount} projects)`, x + 3, cy);
  cy += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(latinLines, x + 3, cy);
  cy += latinLines.length * 3.6;
  if (hindiFontReady && hiLines.length) {
    doc.setFont(PDF_DEVANAGARI_FONT, 'normal');
    doc.setFontSize(6.5);
    doc.text(hiLines, x + 3, cy);
  }
  return blockH;
}

function drawPdfPageFooters(doc, margin, pageW) {
  const totalPages = doc.internal.getNumberOfPages();
  const pageH = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'italic');
    doc.text(
      'Source: Official Gram Panchayat records. Verify on https://egramswaraj.gov.in',
      margin,
      pageH - 7,
    );
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${i} of ${totalPages}`, pageW - margin, pageH - 7, { align: 'right' });
  }
}

function amountWordsHtml(amount, decimals = 2) {
  return `
    <div class="amount-block">
      <div class="amount-num">${formatPdfINR(amount, decimals)}</div>
      <div class="amount-words">${numberToWordsEn(amount)}</div>
      <div class="amount-words amount-words-hi">${numberToWordsHi(amount)}</div>
    </div>`;
}

function formatPdfINR(amount, decimals = 2) {
  const n = Number(amount);
  if (!isFinite(n)) return 'Rs. 0';
  const fixed = decimals > 0 ? n.toFixed(decimals) : String(Math.round(n));
  const parts = fixed.split('.');
  let intPart = parts[0];
  if (intPart.length > 3) {
    const last3 = intPart.slice(-3);
    let rest = intPart.slice(0, -3);
    const groups = [];
    while (rest.length > 2) {
      groups.unshift(rest.slice(-2));
      rest = rest.slice(0, -2);
    }
    if (rest) groups.unshift(rest);
    intPart = groups.join(',') + ',' + last3;
  }
  if (decimals > 0 && parts[1] !== undefined) {
    return 'Rs. ' + intPart + '.' + parts[1];
  }
  return 'Rs. ' + intPart;
}

async function exportToPDF(projects, title, exportOptions = {}) {
  const { filters, maxCost, totalInDataset } = exportOptions;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const hindiFontReady = await ensurePdfDevanagariFont(doc);
  const meta = getMeta();
  const fp = getFinancialProgress();
  const fy = meta.financial_year || getFinancialYear();
  const fyLabel = getYearLabelPdf(fy);
  const totalCost = projects.reduce((s, p) => s + p.total_cost, 0);
  const statusTotals = sumCostsByStatus(projects);
  const utilization = fp.receipt > 0 ? ((fp.expenditure / fp.receipt) * 100).toFixed(1) : '0';
  const datasetTotal = totalInDataset ?? projects.length;
  const filterNote = describePdfFilters(filters, maxCost ?? 0, projects.length, datasetTotal);

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 12;
  const headerStripH = 7;
  const headerMainH = 26;
  const headerTotalH = headerStripH + headerMainH;

  doc.setFillColor(15, 60, 35);
  doc.rect(0, 0, pageW, headerStripH, 'F');
  doc.setTextColor(187, 247, 208);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  const downloadPrefix = 'This PDF is downloaded from ';
  doc.text(downloadPrefix, margin, 4.5);
  addPdfTextLink(
    doc,
    PDF_SOURCE_HOST,
    margin + doc.getTextWidth(downloadPrefix),
    4.5,
    PDF_SOURCE_URL,
    { fontSize: 7, color: [187, 247, 208] },
  );
  doc.setFont('helvetica', 'normal');
  addPdfTextLink(doc, PDF_SOURCE_URL, pageW - margin, 4.5, PDF_SOURCE_URL, {
    align: 'right',
    fontSize: 6.5,
    color: [134, 239, 172],
  });

  doc.setFillColor(20, 83, 45);
  doc.rect(0, headerStripH, pageW, headerMainH, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(`Gram Panchayat ${meta.gram_panchayat}`, margin, headerStripH + 11);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const pdfTitle = title && /^[\x20-\x7E]+$/.test(title) ? title : 'All Development Projects';
  doc.text(pdfTitle, margin, headerStripH + 18);
  doc.setFontSize(8.5);
  doc.text(`${meta.block}, ${meta.district}, ${meta.state}  |  ${fyLabel}`, margin, headerStripH + 23);

  let summaryStartY = headerTotalH + 5;
  if (filterNote) {
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(147, 197, 253);
    doc.setLineWidth(0.2);
    const filterLines = doc.splitTextToSize(filterNote, pageW - margin * 2 - 6);
    const filterBoxH = filterLines.length * 3.8 + 5;
    doc.rect(margin, headerTotalH + 1, pageW - margin * 2, filterBoxH, 'FD');
    doc.setTextColor(30, 64, 175);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(filterLines, margin + 3, headerTotalH + 4.5);
    summaryStartY = headerTotalH + filterBoxH + 4;
  }

  const infoRows = [
    ['Financial Year', fyLabel, 'LGD Code', String(meta.localbody_code || '-')],
    ['Total Receipt', formatPdfAmountLatin(fp.receipt), 'Total Expenditure', formatPdfAmountLatin(fp.expenditure)],
  ];
  const hindiRowIndexes = new Set();
  if (hindiFontReady) {
    hindiRowIndexes.add(infoRows.length);
    infoRows.push(['', numberToWordsHi(fp.receipt), '', numberToWordsHi(fp.expenditure)]);
  }
  infoRows.push(
    ['Utilization', utilization + '%', 'Projects in Report', String(projects.length)],
  );
  pushPdfAmountPair(
    infoRows, hindiRowIndexes,
    'Total Cost (Report)', totalCost,
    '', null,
    hindiFontReady,
  );

  doc.autoTable({
    startY: summaryStartY,
    body: infoRows,
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 2.5,
      textColor: [40, 40, 40],
      lineColor: [210, 210, 210],
      lineWidth: 0.1,
      overflow: 'linebreak',
      valign: 'top',
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 34, fillColor: [245, 245, 245] },
      1: { cellWidth: 72 },
      2: { fontStyle: 'bold', cellWidth: 34, fillColor: [245, 245, 245] },
      3: { cellWidth: 72 },
    },
    didParseCell(data) {
      if (!hindiFontReady || !isPdfSummaryHindiCell(data.row.index, data.column.index, hindiRowIndexes)) return;
      data.cell.styles.font = PDF_DEVANAGARI_FONT;
      data.cell.styles.fontStyle = 'normal';
      data.cell.styles.fontSize = 6.5;
      data.cell.styles.cellPadding = { top: 0.5, bottom: 2.5, left: 2.5, right: 2.5 };
      if (data.column.index === 0 || data.column.index === 2) {
        data.cell.styles.fillColor = [245, 245, 245];
      }
    },
    margin: { left: margin, right: margin },
  });

  const tableStartY = doc.lastAutoTable.finalY + 5;

  const head = [[
    'S.No', 'Activity Code', 'Description', 'Type',
    'Focus Area', 'Scheme', 'Component', 'Status', 'Total Cost (Rs.)',
  ]];

  const body = projects.map(p => [
    p.s_no,
    String(p.activity_code),
    p.activity_description,
    p.activity_type,
    p.focus_area,
    p.scheme_name,
    p.scheme_component_name,
    inferProjectStatus(p),
    formatPdfINR(p.total_cost, 0),
  ]);

  const pdfHeaderCtx = { meta, fyLabel, pageW, margin };

  doc.autoTable({
    head,
    body,
    foot: [[
      {
        content: `Grand Total (${projects.length} projects)`,
        colSpan: 8,
        styles: {
          halign: 'right',
          fontStyle: 'bold',
          fillColor: [240, 253, 244],
          textColor: [20, 83, 45],
          fontSize: 7,
        },
      },
      {
        content: formatPdfINR(totalCost, 0),
        styles: {
          halign: 'right',
          fontStyle: 'bold',
          fillColor: [240, 253, 244],
          textColor: [20, 83, 45],
          fontSize: 7,
        },
      },
    ]],
    startY: tableStartY,
    theme: 'grid',
    styles: {
      fontSize: 6.5,
      cellPadding: 1.8,
      overflow: 'linebreak',
      valign: 'top',
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [20, 83, 45],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'center',
    },
    footStyles: {
      fillColor: [240, 253, 244],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 22, halign: 'center', fontSize: 6 },
      2: { cellWidth: 62 },
      3: { cellWidth: 18 },
      4: { cellWidth: 20 },
      5: { cellWidth: 38 },
      6: { cellWidth: 34 },
      7: { cellWidth: 16, halign: 'center', fontSize: 6 },
      8: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: margin, right: margin, top: PDF_MINI_HEADER_H + 4 },
    showHead: 'everyPage',
    didDrawPage(data) {
      if (data.pageNumber > 1) {
        drawPdfMiniHeader(doc, pdfHeaderCtx.pageW, pdfHeaderCtx.margin, pdfHeaderCtx.meta, pdfHeaderCtx.fyLabel);
      }
    },
  });

  drawPdfStatusSummaryLastPage(doc, {
    statusTotals,
    projectCount: projects.length,
    totalCost,
    fyLabel,
    meta,
    hindiFontReady,
    margin,
    pageW,
  });

  drawPdfPageFooters(doc, margin, pageW);

  doc.save(buildPdfFilename(fy, filters, maxCost));
}

function buildTableUrl(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, v);
  });
  const qs = params.toString();
  return 'table.html' + (qs ? '?' + qs : '');
}
