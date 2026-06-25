const fs = require('fs');
const path = require('path');

const FOCUS_HI = {
  'Sanitation': 'स्वच्छता',
  'Drinking water': 'पेयजल',
  'Social welfare': 'सामाजिक कल्याण',
  'Rural electrification': 'ग्रामीण विद्युतीकरण',
  'Agriculture': 'कृषि',
  'Cultural activities': 'सांस्कृतिक गतिविधियाँ',
  'Minor forest produce': 'लघु वन उत्पाद',
  'Roads': 'सड़कें',
  'Land improvement': 'भूमि सुधार',
  'Markets and fairs': 'बाज़ार और मेले',
  'Education': 'शिक्षा',
};

const SCHEME_HI = {
  'XV Finance Commission': 'पंद्रहवें वित्त आयोग',
  'Viksit Bharat-Guarantee for Rozgar and Ajeevika Mission (Gramin)':
    'विकसित भारत-रोजगार और आजीविका मिशन (ग्रामीण) की गारंटी',
  'Own Funds': 'स्वयं निधि',
};

const VIKSIT_SCHEME = 'Viksit Bharat-Guarantee for Rozgar and Ajeevika Mission (Gramin)';
const VIKSIT_COMPONENT = 'Viksit Bharat-Gaurantee for Rozgar and Ajeevika Mission (Gramin)';

const COMPONENT_HI = {
  'Tied Grant': 'बंधन योजना अनुदान',
  'Basic Grant (untied)': 'मूल अनुदान (अबंधन)',
  'Viksit Bharat-Gaurantee for Rozgar and Ajeevika Mission (Gramin)':
    'विकसित भारत-रोजगार और आजीविका मिशन (ग्रामीण)',
  'Own Funds': 'स्वयं निधि',
};

const TYPE_HI = { 'Community Works': 'सामुदायिक कार्य' };

const STATUS_HI = {
  Completed: 'पूर्ण',
  'In Progress': 'प्रगति पर',
  Pending: 'लंबित',
};

/** Official receipt/expenditure from panchayat records (optional per year). */
const YEAR_FINANCIALS = {
  '2022-2023': { receipt: 6004836.99, expenditure: 3674186 },
  '2021-2022': {},
};

function assignStatus(sNo, total) {
  const completedCutoff = Math.ceil(total * 0.67);
  const progressCutoff = Math.ceil(total * 0.89);
  if (sNo <= completedCutoff) return 'Completed';
  if (sNo <= progressCutoff) return 'In Progress';
  return 'Pending';
}

function normalizeSchemeName(name) {
  if (!name) return name;
  if (/viksit\s+bharat/i.test(name)) return VIKSIT_SCHEME;
  if (/own\s+funds/i.test(name)) return 'Own Funds';
  return name;
}

function normalizeComponentName(name) {
  if (!name) return name;
  if (/viksit\s+bharat/i.test(name)) return VIKSIT_COMPONENT;
  if (/own\s+funds/i.test(name)) return 'Own Funds';
  if (/tied\s+grant/i.test(name)) return 'Tied Grant';
  if (/basic\s+grant/i.test(name)) return 'Basic Grant (untied)';
  return name;
}

function titleCase(str) {
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function extractVillage(desc) {
  const m = desc.match(/GRAM\s+([A-Za-z][A-Za-z\s]*?)(?:\s+ME|\s+KE|\s+WARD|\s+WARP|\s+WARO|\s+MEROD)/i);
  if (m) return titleCase(m[1].trim().replace(/\s+/g, ' '));
  if (/PURHARA/i.test(desc)) return 'Purhara';
  if (/RAGH?UNATHPUR/i.test(desc)) return 'Raghunathpur';
  if (/KISHUN?PUR/i.test(desc)) return 'Kishunpur';
  if (/BIRHARA/i.test(desc)) return 'Birhara';
  if (/BANDHU BIGH/i.test(desc)) return 'Bandhu Bigha';
  if (/MAHAWAL BIGH/i.test(desc)) return 'Mahawal Bigha';
  if (/CHAMAN BIGH/i.test(desc)) return 'Chaman Bigha';
  return 'Purhara';
}

function extractWard(desc) {
  const patterns = [
    /WARD\s*(?:NO\.?|NUMBER)?\s*(\d+)/i,
    /WARP\s*(?:NO\.?)?\s*(\d+)/i,
    /WARO\s*(\d+)/i,
    /W-(\d+)/i,
  ];
  for (const p of patterns) {
    const m = desc.match(p);
    if (m) return Number(m[1]);
  }
  return null;
}

function buildYearData(yearId) {
  const rawPath = path.join(__dirname, '..', 'data', `projects-${yearId}.json`);
  if (!fs.existsSync(rawPath)) {
    throw new Error(`Missing raw file: data/projects-${yearId}.json`);
  }

  const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
  const total = raw.length;

  const projects = raw.map(p => {
    const scheme_name = normalizeSchemeName(p.scheme_name);
    const scheme_component_name = normalizeComponentName(p.scheme_component_name);
    const status = assignStatus(p.s_no, total);
    return {
      ...p,
      scheme_name,
      scheme_component_name,
      status,
      status_hi: STATUS_HI[status],
      focus_area_hi: FOCUS_HI[p.focus_area] || p.focus_area,
      scheme_name_hi: SCHEME_HI[scheme_name] || scheme_name,
      scheme_component_name_hi: COMPONENT_HI[scheme_component_name] || scheme_component_name,
      activity_type_hi: TYPE_HI[p.activity_type] || p.activity_type,
      village: extractVillage(p.activity_description),
      ward: extractWard(p.activity_description),
    };
  });

  const focusSet = [...new Set(projects.map(p => p.focus_area))].sort();
  const villageSet = [...new Set(projects.map(p => p.village))].sort();
  const projectTotal = projects.reduce((s, p) => s + p.total_cost, 0);

  const schemeNames = [...new Set(projects.map(p => p.scheme_name))];
  const schemes = schemeNames.map(name => {
    const schemeProjects = projects.filter(p => p.scheme_name === name);
    const expenditure = schemeProjects.reduce((s, p) => s + p.total_cost, 0);
    const fin = YEAR_FINANCIALS[yearId] || {};
    const yearReceipt = fin.receipt ?? projectTotal;
    let receipt = 0;
    if (name === 'XV Finance Commission') receipt = yearReceipt;
    else if (name === 'Own Funds') receipt = expenditure;
    return {
      scheme_name: name,
      scheme_name_hi: SCHEME_HI[name] || name,
      receipt_amount: receipt,
      expenditure_amount: expenditure,
    };
  });

  const fin = YEAR_FINANCIALS[yearId] || {};
  const expenditure = fin.expenditure ?? projectTotal;
  const receipt = fin.receipt ?? expenditure;

  return {
    meta: {
      state: 'Bihar',
      state_hi: 'बिहार',
      district: 'Aurangabad',
      district_hi: 'औरंगाबाद',
      block: 'Haspura',
      block_hi: 'हसपुरा',
      gram_panchayat: 'Purhara',
      gram_panchayat_hi: 'पुरहरा',
      localbody_code: 93949,
      financial_year: yearId,
      population: 18500,
    },
    financial_progress: {
      receipt,
      expenditure,
    },
    schemes,
    focus_areas: focusSet.map(en => ({ en, hi: FOCUS_HI[en] || en })),
    villages: villageSet.map(name => ({ name, name_hi: name })),
    projects,
    project_cost_total: projectTotal,
  };
}

function updateIndex(yearId, data) {
  const indexPath = path.join(__dirname, '..', 'data', 'index.json');
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

  index.summaries = index.summaries || {};
  index.summaries[yearId] = {
    receipt: data.financial_progress.receipt,
    expenditure: data.financial_progress.expenditure,
    projects: data.projects.length,
    available: true,
  };

  const yearEntry = index.years.find(y => y.id === yearId);
  if (yearEntry) yearEntry.available = true;

  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
}

function buildYear(yearId) {
  const data = buildYearData(yearId);
  const outPath = path.join(__dirname, '..', 'data', `${yearId}.json`);
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  updateIndex(yearId, data);

  const total = data.project_cost_total;
  console.log(
    `Built data/${yearId}.json: ${data.projects.length} projects, ` +
    `total cost ₹${total.toLocaleString('en-IN')}, ` +
    `receipt ₹${data.financial_progress.receipt.toLocaleString('en-IN')}, ` +
    `expenditure ₹${data.financial_progress.expenditure.toLocaleString('en-IN')}`
  );
  return data;
}

const yearArg = process.argv[2] || '2022-2023';
const years = yearArg === 'all' ? ['2021-2022', '2022-2023'] : [yearArg];

years.forEach(buildYear);

if (yearArg === '2022-2023' || yearArg === 'all') {
  const latest = buildYearData('2022-2023');
  fs.writeFileSync(path.join(__dirname, '..', 'data.json'), JSON.stringify(latest, null, 2));
}
