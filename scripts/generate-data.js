const fs = require('fs');
const path = require('path');

const villages = [
  { en: 'Purhara', hi: 'पुरहरा', wards: 8 },
  { en: 'Raghunathpur', hi: 'रघुनाथपुर', wards: 6 },
  { en: 'Birhara', hi: 'बिरहरा', wards: 5 },
  { en: 'Haspura', hi: 'हसपुरा', wards: 7 },
  { en: 'Karsara', hi: 'करसारा', wards: 4 },
  { en: 'Dumari', hi: 'डुमरी', wards: 5 },
  { en: 'Sikaria', hi: 'सिकारिया', wards: 6 },
  { en: 'Mahuari', hi: 'महुआरी', wards: 4 },
  { en: 'Nawadih', hi: 'नवादीह', wards: 5 },
  { en: 'Baruna', hi: 'बरुना', wards: 4 },
];

const focusAreas = [
  { en: 'Sanitation', hi: 'स्वच्छता' },
  { en: 'Drinking Water', hi: 'पेयजल' },
  { en: 'Roads & Connectivity', hi: 'सड़क एवं संपर्क' },
  { en: 'Education', hi: 'शिक्षा' },
  { en: 'Health', hi: 'स्वास्थ्य' },
  { en: 'Agriculture', hi: 'कृषि' },
  { en: 'Housing', hi: 'आवास' },
  { en: 'Electrification', hi: 'विद्युतीकरण' },
  { en: 'Rural Livelihood', hi: 'ग्रामीण आजीविका' },
  { en: 'Environment', hi: 'पर्यावरण' },
];

const schemes = [
  {
    en: 'Viksit Bharat-Guarantee for Rozgar and Ajeevika Mission (Gramin)',
    hi: 'विकसित भारत-रोजगार और आजीविका मिशन (ग्रामीण) की गारंटी',
    component: { en: 'Viksit Bharat-Gaurantee for Rozgar and Ajeevika Mission (Gramin)', hi: 'विकसित भारत-रोजगार और आजीविका मिशन (ग्रामीण)' },
  },
  {
    en: 'XV Finance Commission',
    hi: 'पंद्रहवें वित्त आयोग',
    component: { en: 'Tied Grant', hi: 'बंधन योजना अनुदान' },
  },
];

const statuses = [
  { en: 'Completed', hi: 'पूर्ण' },
  { en: 'In Progress', hi: 'प्रगति पर' },
  { en: 'Pending', hi: 'लंबित' },
];

const activityTemplates = [
  { en: 'Public toilet construction at Ward {w}', hi: 'वार्ड {w} में सार्वजनिक शौचालय का निर्माण', type: 'Community Works', focus: 'Sanitation' },
  { en: 'Pond deepening work near {v}', hi: '{v} के पास तालाब की गहराईकरण कार्य', type: 'Community Works', focus: 'Sanitation' },
  { en: 'Hand pump installation at Ward {w}', hi: 'वार्ड {w} में हैंडपंप की स्थापना', type: 'Community Works', focus: 'Drinking Water' },
  { en: 'Water tank construction in {v}', hi: '{v} में जल टंकी का निर्माण', type: 'Community Works', focus: 'Drinking Water' },
  { en: 'CC road construction Ward {w} to main road', hi: 'वार्ड {w} से मुख्य सड़क तक सीसी सड़क निर्माण', type: 'Community Works', focus: 'Roads & Connectivity' },
  { en: 'Drainage channel lining at {v}', hi: '{v} में नाला लाइनिंग कार्य', type: 'Community Works', focus: 'Roads & Connectivity' },
  { en: 'Anganwadi centre renovation Ward {w}', hi: 'वार्ड {w} में आंगनबाड़ी केंद्र का नवीनीकरण', type: 'Community Works', focus: 'Education' },
  { en: 'School boundary wall construction at {v}', hi: '{v} में विद्यालय परिसर की दीवार निर्माण', type: 'Community Works', focus: 'Education' },
  { en: 'Health sub-centre repair Ward {w}', hi: 'वार्ड {w} में स्वास्थ्य उप-केंद्र की मरम्मत', type: 'Community Works', focus: 'Health' },
  { en: 'Community health camp infrastructure at {v}', hi: '{v} में सामुदायिक स्वास्थ्य शिविर अवसंरचना', type: 'Community Works', focus: 'Health' },
  { en: 'Vermicompost unit setup Ward {w}', hi: 'वार्ड {w} में वर्मीकम्पोस्ट इकाई की स्थापना', type: 'Community Works', focus: 'Agriculture' },
  { en: 'Irrigation channel desilting at {v}', hi: '{v} में सिंचाई नहर की गाद निकासी', type: 'Community Works', focus: 'Agriculture' },
  { en: 'PMAY house completion support Ward {w}', hi: 'वार्ड {w} में पीएमएवाई आवास पूर्णता सहायता', type: 'Individual Works', focus: 'Housing' },
  { en: 'Street light installation at {v}', hi: '{v} में स्ट्रीट लाइट की स्थापना', type: 'Community Works', focus: 'Electrification' },
  { en: 'Solar street light Ward {w}', hi: 'वार्ड {w} में सोलर स्ट्रीट लाइट', type: 'Community Works', focus: 'Electrification' },
  { en: 'SHG training centre setup at {v}', hi: '{v} में स्वयं सहायता समूह प्रशिक्षण केंद्र', type: 'Community Works', focus: 'Rural Livelihood' },
  { en: 'Goat rearing unit support Ward {w}', hi: 'वार्ड {w} में बकरी पालन इकाई सहायता', type: 'Individual Works', focus: 'Rural Livelihood' },
  { en: 'Plantation drive along roadside at {v}', hi: '{v} में सड़क किनारे वृक्षारोपण अभियान', type: 'Community Works', focus: 'Environment' },
  { en: 'Waste segregation shed Ward {w}', hi: 'वार्ड {w} में कचरा पृथक्करण शेड', type: 'Community Works', focus: 'Environment' },
  { en: 'Community hall flooring Ward {w}', hi: 'वार्ड {w} में सामुदायिक भवन फर्श कार्य', type: 'Community Works', focus: 'Housing' },
];

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const projects = [];
let code = 61600000;

// Intentional duplicates for discrepancy detection
const duplicatePairs = [
  { desc: 'GRAM PURHARA WARD 03 ME HAND PUMP KA NIRMAN', village: 'Purhara', ward: 3, focus: 'Drinking Water', cost: 75000 },
];

for (let i = 1; i <= 95; i++) {
  const village = villages[(i - 1) % villages.length];
  const ward = ((i - 1) % village.wards) + 1;
  const template = activityTemplates[(i - 1) % activityTemplates.length];
  const focus = focusAreas.find(f => f.en === template.focus);
  const scheme = i % 3 === 0 ? schemes[1] : schemes[0];
  const status = i <= 60 ? statuses[0] : i <= 80 ? statuses[1] : statuses[2];
  const month = String(((i % 12) + 1)).padStart(2, '0');
  const day = String((i % 28) + 1).padStart(2, '0');

  let cost = randomBetween(40000, 500000);
  // High cost outlier
  if (i === 42) cost = 980000;
  // Cost mismatch pair
  if (i === 55) cost = 250000;

  const descEn = template.en.replace('{w}', ward).replace('{v}', village.en).toUpperCase();
  const descHi = template.hi.replace('{w}', ward).replace('{v}', village.hi);

  projects.push({
    s_no: i,
    activity_code: code + i,
    activity_description: `GRAM ${village.en.toUpperCase()} WARD ${String(ward).padStart(2, '0')} - ${descEn}`,
    activity_description_hi: `ग्राम ${village.hi} वार्ड ${String(ward).padStart(2, '0')} - ${descHi}`,
    activity_type: template.type,
    activity_type_hi: template.type === 'Community Works' ? 'सामुदायिक कार्य' : 'व्यक्तिगत कार्य',
    focus_area: focus.en,
    focus_area_hi: focus.hi,
    scheme_name: scheme.en,
    scheme_name_hi: scheme.hi,
    scheme_component_name: scheme.component.en,
    scheme_component_name_hi: scheme.component.hi,
    village: village.en,
    village_hi: village.hi,
    ward: ward,
    total_cost: cost,
    status: status.en,
    status_hi: status.hi,
    completion_date: `2023-${month}-${day}`,
    before_photo: `https://picsum.photos/seed/before${i}/600/400`,
    after_photo: status.en === 'Completed' ? `https://picsum.photos/seed/after${i}/600/400` : null,
  });
}

// Add duplicate works
duplicatePairs.forEach((dup, idx) => {
  const v = villages.find(x => x.en === dup.village);
  projects.push({
    s_no: 96 + idx,
    activity_code: 62108999 + idx,
    activity_description: dup.desc,
    activity_description_hi: `ग्राम ${v.hi} वार्ड ${String(dup.ward).padStart(2, '0')} में हैंडपंप का निर्माण`,
    activity_type: 'Community Works',
    activity_type_hi: 'सामुदायिक कार्य',
    focus_area: dup.focus,
    focus_area_hi: 'पेयजल',
    scheme_name: schemes[1].en,
    scheme_name_hi: schemes[1].hi,
    scheme_component_name: schemes[1].component.en,
    scheme_component_name_hi: schemes[1].component.hi,
    village: dup.village,
    village_hi: v.hi,
    ward: dup.ward,
    total_cost: dup.cost,
    status: 'Completed',
    status_hi: 'पूर्ण',
    completion_date: '2023-06-15',
    before_photo: 'https://picsum.photos/seed/dupbefore/600/400',
    after_photo: 'https://picsum.photos/seed/dupafter/600/400',
  });
});

// Incomplete work without after photo but marked completed
projects.push({
  s_no: 98,
  activity_code: 62109001,
  activity_description: 'GRAM HASPURA WARD 02 ME NALA NIRMAN KARYA',
  activity_description_hi: 'ग्राम हसपुरा वार्ड 02 में नाला निर्माण कार्य',
  activity_type: 'Community Works',
  activity_type_hi: 'सामुदायिक कार्य',
  focus_area: 'Roads & Connectivity',
  focus_area_hi: 'सड़क एवं संपर्क',
  scheme_name: schemes[0].en,
  scheme_name_hi: schemes[0].hi,
  scheme_component_name: schemes[0].component.en,
  scheme_component_name_hi: schemes[0].component.hi,
  village: 'Haspura',
  village_hi: 'हसपुरा',
  ward: 2,
  total_cost: 180000,
  status: 'Completed',
  status_hi: 'पूर्ण',
  completion_date: '2023-11-20',
  before_photo: 'https://picsum.photos/seed/incomplete/600/400',
  after_photo: null,
});

const totalExpenditure = projects.reduce((s, p) => s + p.total_cost, 0);
const receipt = Math.round(totalExpenditure * 1.35 * 100) / 100;

const data = {
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
    financial_year: '2022-2023',
    population: 18500,
    population_hi: '१८,५००',
  },
  financial_progress: {
    receipt,
    expenditure: totalExpenditure,
  },
  schemes: [
    {
      scheme_name: 'XV Finance Commission',
      scheme_name_hi: 'पंद्रहवें वित्त आयोग',
      receipt_amount: receipt * 0.45,
      expenditure_amount: projects.filter(p => p.scheme_name.includes('XV')).reduce((s, p) => s + p.total_cost, 0),
    },
    {
      scheme_name: 'Viksit Bharat-Guarantee for Rozgar and Ajeevika Mission (Gramin)',
      scheme_name_hi: 'विकसित भारत-रोजगार और आजीविका मिशन (ग्रामीण) की गारंटी',
      receipt_amount: receipt * 0.55,
      expenditure_amount: projects.filter(p => p.scheme_name.includes('Viksit')).reduce((s, p) => s + p.total_cost, 0),
    },
  ],
  focus_areas: focusAreas,
  villages: villages.map(v => ({ name: v.en, name_hi: v.hi, wards: v.wards })),
  projects,
};

const outPath = path.join(__dirname, '..', 'data.json');
fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
console.log(`Generated ${projects.length} projects -> ${outPath}`);
