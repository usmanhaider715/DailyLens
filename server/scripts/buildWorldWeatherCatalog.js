/**
 * Builds server/data/worldWeatherCatalog.json from all-the-cities (GeoNames).
 * Includes every country + cities with population >= 15,000 (min 1 per country).
 * US/UK use dedicated catalogs in weatherLocations.js — skipped here.
 *
 * Run: node scripts/buildWorldWeatherCatalog.js
 */
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cities from 'all-the-cities';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../data/worldWeatherCatalog.json');

const SKIP_COUNTRIES = new Set(['US', 'GB']); // handled as us / uk
const MIN_POP = 15000;
const MAX_PER_COUNTRY = 250;

const COUNTRY_NAMES = {
  AD: 'Andorra', AE: 'United Arab Emirates', AF: 'Afghanistan', AG: 'Antigua and Barbuda',
  AL: 'Albania', AM: 'Armenia', AO: 'Angola', AR: 'Argentina', AT: 'Austria', AU: 'Australia',
  AZ: 'Azerbaijan', BA: 'Bosnia and Herzegovina', BB: 'Barbados', BD: 'Bangladesh', BE: 'Belgium',
  BF: 'Burkina Faso', BG: 'Bulgaria', BH: 'Bahrain', BI: 'Burundi', BJ: 'Benin', BN: 'Brunei',
  BO: 'Bolivia', BR: 'Brazil', BS: 'Bahamas', BT: 'Bhutan', BW: 'Botswana', BY: 'Belarus',
  BZ: 'Belize', CA: 'Canada', CD: 'DR Congo', CF: 'Central African Republic', CG: 'Congo',
  CH: 'Switzerland', CI: 'Ivory Coast', CL: 'Chile', CM: 'Cameroon', CN: 'China', CO: 'Colombia',
  CR: 'Costa Rica', CU: 'Cuba', CV: 'Cape Verde', CY: 'Cyprus', CZ: 'Czech Republic', DE: 'Germany',
  DJ: 'Djibouti', DK: 'Denmark', DM: 'Dominica', DO: 'Dominican Republic', DZ: 'Algeria',
  EC: 'Ecuador', EE: 'Estonia', EG: 'Egypt', ER: 'Eritrea', ES: 'Spain', ET: 'Ethiopia',
  FI: 'Finland', FJ: 'Fiji', FR: 'France', GA: 'Gabon', GD: 'Grenada', GE: 'Georgia', GH: 'Ghana',
  GM: 'Gambia', GN: 'Guinea', GQ: 'Equatorial Guinea', GR: 'Greece', GT: 'Guatemala', GW: 'Guinea-Bissau',
  GY: 'Guyana', HN: 'Honduras', HR: 'Croatia', HT: 'Haiti', HU: 'Hungary', ID: 'Indonesia',
  IE: 'Ireland', IL: 'Israel', IN: 'India', IQ: 'Iraq', IR: 'Iran', IS: 'Iceland', IT: 'Italy',
  JM: 'Jamaica', JO: 'Jordan', JP: 'Japan', KE: 'Kenya', KG: 'Kyrgyzstan', KH: 'Cambodia',
  KM: 'Comoros', KN: 'Saint Kitts and Nevis', KP: 'North Korea', KR: 'South Korea', KW: 'Kuwait',
  KZ: 'Kazakhstan', LA: 'Laos', LB: 'Lebanon', LC: 'Saint Lucia', LK: 'Sri Lanka', LR: 'Liberia',
  LS: 'Lesotho', LT: 'Lithuania', LU: 'Luxembourg', LV: 'Latvia', LY: 'Libya', MA: 'Morocco',
  MC: 'Monaco', MD: 'Moldova', ME: 'Montenegro', MG: 'Madagascar', MK: 'North Macedonia', ML: 'Mali',
  MM: 'Myanmar', MN: 'Mongolia', MR: 'Mauritania', MT: 'Malta', MU: 'Mauritius', MV: 'Maldives',
  MW: 'Malawi', MX: 'Mexico', MY: 'Malaysia', MZ: 'Mozambique', NA: 'Namibia', NE: 'Niger',
  NG: 'Nigeria', NI: 'Nicaragua', NL: 'Netherlands', NO: 'Norway', NP: 'Nepal', NZ: 'New Zealand',
  OM: 'Oman', PA: 'Panama', PE: 'Peru', PG: 'Papua New Guinea', PH: 'Philippines', PK: 'Pakistan',
  PL: 'Poland', PR: 'Puerto Rico', PS: 'Palestine', PT: 'Portugal', PY: 'Paraguay', QA: 'Qatar',
  RO: 'Romania', RS: 'Serbia', RU: 'Russia', RW: 'Rwanda', SA: 'Saudi Arabia', SB: 'Solomon Islands',
  SC: 'Seychelles', SD: 'Sudan', SE: 'Sweden', SG: 'Singapore', SI: 'Slovenia', SK: 'Slovakia',
  SL: 'Sierra Leone', SN: 'Senegal', SO: 'Somalia', SR: 'Suriname', SS: 'South Sudan', ST: 'São Tomé and Príncipe',
  SV: 'El Salvador', SY: 'Syria', SZ: 'Eswatini', TD: 'Chad', TG: 'Togo', TH: 'Thailand', TJ: 'Tajikistan',
  TL: 'Timor-Leste', TM: 'Turkmenistan', TN: 'Tunisia', TR: 'Turkey', TT: 'Trinidad and Tobago',
  TW: 'Taiwan', TZ: 'Tanzania', UA: 'Ukraine', UG: 'Uganda', UY: 'Uruguay', UZ: 'Uzbekistan',
  VE: 'Venezuela', VN: 'Vietnam', VU: 'Vanuatu', YE: 'Yemen', ZA: 'South Africa', ZM: 'Zambia', ZW: 'Zimbabwe',
  HK: 'Hong Kong', MO: 'Macau', XK: 'Kosovo',
};

function slugify(name, adminCode = '') {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return adminCode ? `${base}-${adminCode.toLowerCase()}` : base;
}

function countryId(iso2) {
  if (iso2 === 'GB') return 'uk';
  return iso2.toLowerCase();
}

function countryLabel(iso2) {
  return COUNTRY_NAMES[iso2] || iso2;
}

const byCountry = new Map();
for (const c of cities) {
  if (SKIP_COUNTRIES.has(c.country)) continue;
  if (!byCountry.has(c.country)) byCountry.set(c.country, []);
  byCountry.get(c.country).push(c);
}

const catalog = [];

for (const [iso2, list] of [...byCountry.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  list.sort((a, b) => b.population - a.population);
  let picked = list.filter((c) => c.population >= MIN_POP);
  if (picked.length === 0) picked = [list[0]];
  picked = picked.slice(0, MAX_PER_COUNTRY);

  const id = countryId(iso2);
  const usedSlugs = new Set();
  const cityEntries = picked.map((c) => {
    let slug = slugify(c.name, c.adminCode);
    let n = 2;
    while (usedSlugs.has(slug)) {
      slug = `${slugify(c.name, c.adminCode)}-${n++}`;
    }
    usedSlugs.add(slug);
    const lon = c.loc.coordinates[0];
    const lat = c.loc.coordinates[1];
    return {
      id: slug,
      slug,
      name: c.name,
      lat,
      lon,
      population: c.population,
      timezone: 'auto',
    };
  });

  catalog.push({
    id,
    iso2,
    label: countryLabel(iso2),
    type: 'cities',
    timezone: 'auto',
    cities: cityEntries,
  });
}

const payload = {
  generatedAt: new Date().toISOString(),
  minPopulation: MIN_POP,
  countryCount: catalog.length,
  cityCount: catalog.reduce((n, c) => n + c.cities.length, 0),
  countries: catalog,
};

writeFileSync(OUT, JSON.stringify(payload));
console.log(`Wrote ${OUT}`);
console.log(`Countries: ${payload.countryCount}, Cities: ${payload.cityCount}`);
