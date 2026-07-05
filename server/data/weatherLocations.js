import { findUsCityBySlug, US_MAJOR_CITIES } from './weatherCitiesUs.js';
import {
  getWorldCountriesSummary,
  getWorldCountryDetail,
  findWorldCity,
  resolveWorldLocationBySlug,
  getAllWorldSeoLocations,
  getAllWorldPoints,
  isWorldCountry,
  getWorldCountryLabel,
} from './worldWeatherIndex.js';

/** US state capitals + UK cities grouped for forecast dropdowns. */
export const US_STATES = [
  { code: 'AL', name: 'Alabama', capital: 'Montgomery', lat: 32.3792, lon: -86.3077 },
  { code: 'AK', name: 'Alaska', capital: 'Juneau', lat: 58.3019, lon: -134.4197 },
  { code: 'AZ', name: 'Arizona', capital: 'Phoenix', lat: 33.4484, lon: -112.074 },
  { code: 'AR', name: 'Arkansas', capital: 'Little Rock', lat: 34.7465, lon: -92.2896 },
  { code: 'CA', name: 'California', capital: 'Sacramento', lat: 38.5816, lon: -121.4944 },
  { code: 'CO', name: 'Colorado', capital: 'Denver', lat: 39.7392, lon: -104.9903 },
  { code: 'CT', name: 'Connecticut', capital: 'Hartford', lat: 41.7658, lon: -72.6734 },
  { code: 'DE', name: 'Delaware', capital: 'Dover', lat: 39.1582, lon: -75.5244 },
  { code: 'FL', name: 'Florida', capital: 'Tallahassee', lat: 30.4383, lon: -84.2807 },
  { code: 'GA', name: 'Georgia', capital: 'Atlanta', lat: 33.749, lon: -84.388 },
  { code: 'HI', name: 'Hawaii', capital: 'Honolulu', lat: 21.3069, lon: -157.8583 },
  { code: 'ID', name: 'Idaho', capital: 'Boise', lat: 43.615, lon: -116.2023 },
  { code: 'IL', name: 'Illinois', capital: 'Springfield', lat: 39.7817, lon: -89.6501 },
  { code: 'IN', name: 'Indiana', capital: 'Indianapolis', lat: 39.7684, lon: -86.1581 },
  { code: 'IA', name: 'Iowa', capital: 'Des Moines', lat: 41.5868, lon: -93.625 },
  { code: 'KS', name: 'Kansas', capital: 'Topeka', lat: 39.0473, lon: -95.6752 },
  { code: 'KY', name: 'Kentucky', capital: 'Frankfort', lat: 38.2009, lon: -84.8733 },
  { code: 'LA', name: 'Louisiana', capital: 'Baton Rouge', lat: 30.4515, lon: -91.1871 },
  { code: 'ME', name: 'Maine', capital: 'Augusta', lat: 44.3106, lon: -69.7795 },
  { code: 'MD', name: 'Maryland', capital: 'Annapolis', lat: 38.9784, lon: -76.4922 },
  { code: 'MA', name: 'Massachusetts', capital: 'Boston', lat: 42.3601, lon: -71.0589 },
  { code: 'MI', name: 'Michigan', capital: 'Lansing', lat: 42.7325, lon: -84.5555 },
  { code: 'MN', name: 'Minnesota', capital: 'Saint Paul', lat: 44.9537, lon: -93.09 },
  { code: 'MS', name: 'Mississippi', capital: 'Jackson', lat: 32.2988, lon: -90.1848 },
  { code: 'MO', name: 'Missouri', capital: 'Jefferson City', lat: 38.5767, lon: -92.1735 },
  { code: 'MT', name: 'Montana', capital: 'Helena', lat: 46.5891, lon: -112.0391 },
  { code: 'NE', name: 'Nebraska', capital: 'Lincoln', lat: 40.8136, lon: -96.7026 },
  { code: 'NV', name: 'Nevada', capital: 'Carson City', lat: 39.1638, lon: -119.7674 },
  { code: 'NH', name: 'New Hampshire', capital: 'Concord', lat: 43.2081, lon: -71.5376 },
  { code: 'NJ', name: 'New Jersey', capital: 'Trenton', lat: 40.2206, lon: -74.7597 },
  { code: 'NM', name: 'New Mexico', capital: 'Santa Fe', lat: 35.687, lon: -105.9378 },
  { code: 'NY', name: 'New York', capital: 'Albany', lat: 42.6526, lon: -73.7562 },
  { code: 'NC', name: 'North Carolina', capital: 'Raleigh', lat: 35.7796, lon: -78.6382 },
  { code: 'ND', name: 'North Dakota', capital: 'Bismarck', lat: 46.8083, lon: -100.7837 },
  { code: 'OH', name: 'Ohio', capital: 'Columbus', lat: 39.9612, lon: -82.9988 },
  { code: 'OK', name: 'Oklahoma', capital: 'Oklahoma City', lat: 35.4676, lon: -97.5164 },
  { code: 'OR', name: 'Oregon', capital: 'Salem', lat: 44.9429, lon: -123.0351 },
  { code: 'PA', name: 'Pennsylvania', capital: 'Harrisburg', lat: 40.2732, lon: -76.8867 },
  { code: 'RI', name: 'Rhode Island', capital: 'Providence', lat: 41.824, lon: -71.4128 },
  { code: 'SC', name: 'South Carolina', capital: 'Columbia', lat: 34.0007, lon: -81.0348 },
  { code: 'SD', name: 'South Dakota', capital: 'Pierre', lat: 44.3683, lon: -100.351 },
  { code: 'TN', name: 'Tennessee', capital: 'Nashville', lat: 36.1627, lon: -86.7816 },
  { code: 'TX', name: 'Texas', capital: 'Austin', lat: 30.2672, lon: -97.7431 },
  { code: 'UT', name: 'Utah', capital: 'Salt Lake City', lat: 40.7608, lon: -111.891 },
  { code: 'VT', name: 'Vermont', capital: 'Montpelier', lat: 44.2601, lon: -72.5754 },
  { code: 'VA', name: 'Virginia', capital: 'Richmond', lat: 37.5407, lon: -77.436 },
  { code: 'WA', name: 'Washington', capital: 'Olympia', lat: 47.0379, lon: -122.9007 },
  { code: 'WV', name: 'West Virginia', capital: 'Charleston', lat: 38.3498, lon: -81.6326 },
  { code: 'WI', name: 'Wisconsin', capital: 'Madison', lat: 43.0731, lon: -89.4012 },
  { code: 'WY', name: 'Wyoming', capital: 'Cheyenne', lat: 41.14, lon: -104.8202 },
  { code: 'DC', name: 'Washington D.C.', capital: 'Washington', lat: 38.9072, lon: -77.0369 },
];

export const UK_REGIONS = [
  {
    id: 'england',
    name: 'England',
    cities: [
      { id: 'london', name: 'London', lat: 51.5074, lon: -0.1278 },
      { id: 'birmingham', name: 'Birmingham', lat: 52.4862, lon: -1.8904 },
      { id: 'manchester', name: 'Manchester', lat: 53.4808, lon: -2.2426 },
      { id: 'leeds', name: 'Leeds', lat: 53.8008, lon: -1.5491 },
      { id: 'liverpool', name: 'Liverpool', lat: 53.4084, lon: -2.9916 },
      { id: 'bristol', name: 'Bristol', lat: 51.4545, lon: -2.5879 },
      { id: 'sheffield', name: 'Sheffield', lat: 53.3811, lon: -1.4701 },
      { id: 'newcastle', name: 'Newcastle upon Tyne', lat: 54.9783, lon: -1.6178 },
      { id: 'nottingham', name: 'Nottingham', lat: 52.9548, lon: -1.1581 },
      { id: 'southampton', name: 'Southampton', lat: 50.9097, lon: -1.4044 },
      { id: 'plymouth', name: 'Plymouth', lat: 50.3755, lon: -4.1427 },
      { id: 'brighton', name: 'Brighton', lat: 50.8225, lon: -0.1372 },
      { id: 'oxford', name: 'Oxford', lat: 51.752, lon: -1.2577 },
      { id: 'cambridge', name: 'Cambridge', lat: 52.2053, lon: 0.1218 },
      { id: 'york', name: 'York', lat: 53.96, lon: -1.0873 },
      { id: 'leicester', name: 'Leicester', lat: 52.6369, lon: -1.1398 },
      { id: 'coventry', name: 'Coventry', lat: 52.4068, lon: -1.5197 },
      { id: 'hull', name: 'Hull', lat: 53.7457, lon: -0.3367 },
      { id: 'stoke', name: 'Stoke-on-Trent', lat: 53.0027, lon: -2.1794 },
      { id: 'derby', name: 'Derby', lat: 52.9225, lon: -1.4746 },
      { id: 'sunderland', name: 'Sunderland', lat: 54.9069, lon: -1.3838 },
      { id: 'bolton', name: 'Bolton', lat: 53.5785, lon: -2.4299 },
      { id: 'bournemouth', name: 'Bournemouth', lat: 50.7192, lon: -1.8808 },
      { id: 'reading', name: 'Reading', lat: 51.4543, lon: -0.9781 },
      { id: 'northampton', name: 'Northampton', lat: 52.2405, lon: -0.9027 },
      { id: 'luton', name: 'Luton', lat: 51.8787, lon: -0.4200 },
      { id: 'preston', name: 'Preston', lat: 53.7632, lon: -2.7031 },
      { id: 'milton_keynes', name: 'Milton Keynes', lat: 52.0406, lon: -0.7594 },
      { id: 'middlesbrough', name: 'Middlesbrough', lat: 54.5742, lon: -1.2350 },
      { id: 'huddersfield', name: 'Huddersfield', lat: 53.6458, lon: -1.7850 },
      { id: 'ipswich', name: 'Ipswich', lat: 52.0567, lon: 1.1482 },
      { id: 'norwich', name: 'Norwich', lat: 52.6309, lon: 1.2974 },
      { id: 'exeter', name: 'Exeter', lat: 50.7184, lon: -3.5339 },
      { id: 'bath', name: 'Bath', lat: 51.3811, lon: -2.3590 },
      { id: 'canterbury', name: 'Canterbury', lat: 51.2802, lon: 1.0789 },
      { id: 'chester', name: 'Chester', lat: 53.1934, lon: -2.8931 },
      { id: 'durham', name: 'Durham', lat: 54.7761, lon: -1.5733 },
      { id: 'lincoln', name: 'Lincoln', lat: 53.2307, lon: -0.5406 },
      { id: 'wolverhampton', name: 'Wolverhampton', lat: 52.5869, lon: -2.1288 },
      { id: 'portsmouth', name: 'Portsmouth', lat: 50.8198, lon: -1.0880 },
      { id: 'peterborough', name: 'Peterborough', lat: 52.5695, lon: -0.2405 },
      { id: 'swindon', name: 'Swindon', lat: 51.5558, lon: -1.7797 },
      { id: 'gloucester', name: 'Gloucester', lat: 51.8642, lon: -2.2382 },
      { id: 'worcester', name: 'Worcester', lat: 52.1936, lon: -2.2216 },
      { id: 'carlisle', name: 'Carlisle', lat: 54.8951, lon: -2.9382 },
      { id: 'blackpool', name: 'Blackpool', lat: 53.8175, lon: -3.0357 },
      { id: 'torquay', name: 'Torquay', lat: 50.4619, lon: -3.5253 },
      { id: 'colchester', name: 'Colchester', lat: 51.8892, lon: 0.9042 },
      { id: 'guildford', name: 'Guildford', lat: 51.2362, lon: -0.5704 },
    ],
  },
  {
    id: 'scotland',
    name: 'Scotland',
    cities: [
      { id: 'edinburgh', name: 'Edinburgh', lat: 55.9533, lon: -3.1883 },
      { id: 'glasgow', name: 'Glasgow', lat: 55.8642, lon: -4.2518 },
      { id: 'aberdeen', name: 'Aberdeen', lat: 57.1497, lon: -2.0943 },
      { id: 'dundee', name: 'Dundee', lat: 56.462, lon: -2.9707 },
      { id: 'inverness', name: 'Inverness', lat: 57.4778, lon: -4.2247 },
      { id: 'stirling', name: 'Stirling', lat: 56.1165, lon: -3.9369 },
      { id: 'perth', name: 'Perth', lat: 56.3950, lon: -3.4308 },
      { id: 'ayr', name: 'Ayr', lat: 55.4586, lon: -4.6292 },
      { id: 'paisley', name: 'Paisley', lat: 55.8456, lon: -4.4239 },
      { id: 'falkirk', name: 'Falkirk', lat: 56.0019, lon: -3.7839 },
    ],
  },
  {
    id: 'wales',
    name: 'Wales',
    cities: [
      { id: 'cardiff', name: 'Cardiff', lat: 51.4816, lon: -3.1791 },
      { id: 'swansea', name: 'Swansea', lat: 51.6214, lon: -3.9436 },
      { id: 'newport', name: 'Newport', lat: 51.5842, lon: -2.9977 },
      { id: 'wrexham', name: 'Wrexham', lat: 53.046, lon: -2.993 },
      { id: 'bangor', name: 'Bangor', lat: 53.2274, lon: -4.1293 },
      { id: 'aberystwyth', name: 'Aberystwyth', lat: 52.4153, lon: -4.0829 },
      { id: 'llanelli', name: 'Llanelli', lat: 51.6808, lon: -4.1614 },
      { id: 'rhyl', name: 'Rhyl', lat: 53.3191, lon: -3.4912 },
    ],
  },
  {
    id: 'northern_ireland',
    name: 'Northern Ireland',
    cities: [
      { id: 'belfast', name: 'Belfast', lat: 54.5973, lon: -5.9301 },
      { id: 'derry', name: 'Derry', lat: 54.9966, lon: -7.3086 },
      { id: 'lisburn', name: 'Lisburn', lat: 54.5162, lon: -6.058 },
      { id: 'newry', name: 'Newry', lat: 54.1751, lon: -6.3402 },
      { id: 'armagh', name: 'Armagh', lat: 54.3503, lon: -6.6528 },
      { id: 'omagh', name: 'Omagh', lat: 54.5977, lon: -7.3099 },
    ],
  },
];

export function weatherQueryFromPoint(point) {
  if (!point) return {};
  if (point.country === 'us') {
    if (point.id?.length === 2) return { country: 'us', state: point.id };
    return { country: 'us', cityId: point.id };
  }
  return { country: point.country, cityId: point.id };
}

/** Major Asian cities for forecasts and geo-location snapping. */
export const ASIA_COUNTRIES = [
  {
    id: 'in',
    name: 'India',
    timezone: 'Asia/Kolkata',
    cities: [
      { id: 'mumbai', name: 'Mumbai', lat: 19.076, lon: 72.8777 },
      { id: 'delhi', name: 'New Delhi', lat: 28.6139, lon: 77.209 },
      { id: 'bangalore', name: 'Bangalore', lat: 12.9716, lon: 77.5946 },
      { id: 'chennai', name: 'Chennai', lat: 13.0827, lon: 80.2707 },
      { id: 'kolkata', name: 'Kolkata', lat: 22.5726, lon: 88.3639 },
      { id: 'hyderabad', name: 'Hyderabad', lat: 17.385, lon: 78.4867 },
      { id: 'pune', name: 'Pune', lat: 18.5204, lon: 73.8567 },
      { id: 'ahmedabad', name: 'Ahmedabad', lat: 23.0225, lon: 72.5714 },
    ],
  },
  {
    id: 'pk',
    name: 'Pakistan',
    timezone: 'Asia/Karachi',
    cities: [
      { id: 'karachi', name: 'Karachi', lat: 24.8607, lon: 67.0011 },
      { id: 'lahore', name: 'Lahore', lat: 31.5497, lon: 74.3436 },
      { id: 'islamabad', name: 'Islamabad', lat: 33.6844, lon: 73.0479 },
      { id: 'faisalabad', name: 'Faisalabad', lat: 31.4504, lon: 73.135 },
      { id: 'rawalpindi', name: 'Rawalpindi', lat: 33.5651, lon: 73.0169 },
    ],
  },
  {
    id: 'bd',
    name: 'Bangladesh',
    timezone: 'Asia/Dhaka',
    cities: [
      { id: 'dhaka', name: 'Dhaka', lat: 23.8103, lon: 90.4125 },
      { id: 'chittagong', name: 'Chittagong', lat: 22.3569, lon: 91.7832 },
      { id: 'sylhet', name: 'Sylhet', lat: 24.8949, lon: 91.8687 },
    ],
  },
  {
    id: 'jp',
    name: 'Japan',
    timezone: 'Asia/Tokyo',
    cities: [
      { id: 'tokyo', name: 'Tokyo', lat: 35.6762, lon: 139.6503 },
      { id: 'osaka', name: 'Osaka', lat: 34.6937, lon: 135.5023 },
      { id: 'kyoto', name: 'Kyoto', lat: 35.0116, lon: 135.7681 },
      { id: 'nagoya', name: 'Nagoya', lat: 35.1815, lon: 136.9066 },
      { id: 'sapporo', name: 'Sapporo', lat: 43.0618, lon: 141.3545 },
      { id: 'fukuoka', name: 'Fukuoka', lat: 33.5904, lon: 130.4017 },
    ],
  },
  {
    id: 'cn',
    name: 'China',
    timezone: 'Asia/Shanghai',
    cities: [
      { id: 'beijing', name: 'Beijing', lat: 39.9042, lon: 116.4074 },
      { id: 'shanghai', name: 'Shanghai', lat: 31.2304, lon: 121.4737 },
      { id: 'guangzhou', name: 'Guangzhou', lat: 23.1291, lon: 113.2644 },
      { id: 'shenzhen', name: 'Shenzhen', lat: 22.5431, lon: 114.0579 },
      { id: 'chengdu', name: 'Chengdu', lat: 30.5728, lon: 104.0668 },
      { id: 'hongkong', name: 'Hong Kong', lat: 22.3193, lon: 114.1694 },
    ],
  },
  {
    id: 'ae',
    name: 'United Arab Emirates',
    timezone: 'Asia/Dubai',
    cities: [
      { id: 'dubai', name: 'Dubai', lat: 25.2048, lon: 55.2708 },
      { id: 'abudhabi', name: 'Abu Dhabi', lat: 24.4539, lon: 54.3773 },
      { id: 'sharjah', name: 'Sharjah', lat: 25.3463, lon: 55.4209 },
    ],
  },
  {
    id: 'sg',
    name: 'Singapore',
    timezone: 'Asia/Singapore',
    cities: [{ id: 'singapore', name: 'Singapore', lat: 1.3521, lon: 103.8198 }],
  },
  {
    id: 'th',
    name: 'Thailand',
    timezone: 'Asia/Bangkok',
    cities: [
      { id: 'bangkok', name: 'Bangkok', lat: 13.7563, lon: 100.5018 },
      { id: 'chiangmai', name: 'Chiang Mai', lat: 18.7883, lon: 98.9853 },
      { id: 'phuket', name: 'Phuket', lat: 7.8804, lon: 98.3923 },
    ],
  },
  {
    id: 'id',
    name: 'Indonesia',
    timezone: 'Asia/Jakarta',
    cities: [
      { id: 'jakarta', name: 'Jakarta', lat: -6.2088, lon: 106.8456 },
      { id: 'surabaya', name: 'Surabaya', lat: -7.2575, lon: 112.7521 },
      { id: 'bali', name: 'Denpasar (Bali)', lat: -8.6705, lon: 115.2126 },
    ],
  },
  {
    id: 'my',
    name: 'Malaysia',
    timezone: 'Asia/Kuala_Lumpur',
    cities: [
      { id: 'kualalumpur', name: 'Kuala Lumpur', lat: 3.139, lon: 101.6869 },
      { id: 'penang', name: 'George Town (Penang)', lat: 5.4141, lon: 100.3288 },
      { id: 'johor', name: 'Johor Bahru', lat: 1.4927, lon: 103.7414 },
    ],
  },
  {
    id: 'ph',
    name: 'Philippines',
    timezone: 'Asia/Manila',
    cities: [
      { id: 'manila', name: 'Manila', lat: 14.5995, lon: 120.9842 },
      { id: 'cebu', name: 'Cebu', lat: 10.3157, lon: 123.8854 },
      { id: 'davao', name: 'Davao', lat: 7.1907, lon: 125.4553 },
    ],
  },
  {
    id: 'kr',
    name: 'South Korea',
    timezone: 'Asia/Seoul',
    cities: [
      { id: 'seoul', name: 'Seoul', lat: 37.5665, lon: 126.978 },
      { id: 'busan', name: 'Busan', lat: 35.1796, lon: 129.0756 },
      { id: 'incheon', name: 'Incheon', lat: 37.4563, lon: 126.7052 },
    ],
  },
  {
    id: 'sa',
    name: 'Saudi Arabia',
    timezone: 'Asia/Riyadh',
    cities: [
      { id: 'riyadh', name: 'Riyadh', lat: 24.7136, lon: 46.6753 },
      { id: 'jeddah', name: 'Jeddah', lat: 21.4858, lon: 39.1925 },
      { id: 'mecca', name: 'Mecca', lat: 21.3891, lon: 39.8579 },
    ],
  },
];

export function isAsiaCountry(countryId) {
  return ASIA_COUNTRIES.some((c) => c.id === countryId);
}

export function getWeatherRegionLabel(countryId) {
  if (countryId === 'us') return 'US weather';
  if (countryId === 'uk') return 'UK weather';
  const world = getWorldCountryLabel(countryId);
  return world ? `${world} weather` : 'weather';
}

function usCatalogEntry() {
  return {
    id: 'us',
    label: 'United States',
    type: 'states',
    cityCount: US_STATES.length + US_MAJOR_CITIES.length,
    states: US_STATES.map((s) => ({
      id: s.code,
      name: s.name,
      label: `${s.name} (${s.capital})`,
      lat: s.lat,
      lon: s.lon,
      timezone: 'America/New_York',
    })),
  };
}

function ukCatalogEntry() {
  const cityCount = UK_REGIONS.reduce((n, r) => n + r.cities.length, 0);
  return {
    id: 'uk',
    label: 'United Kingdom',
    type: 'regions',
    cityCount,
    regions: UK_REGIONS.map((r) => ({
      id: r.id,
      name: r.name,
      cities: r.cities.map((c) => ({
        id: `${r.id}-${c.id}`,
        name: c.name,
        lat: c.lat,
        lon: c.lon,
        timezone: 'Europe/London',
      })),
    })),
  };
}

/** Lightweight country list for dropdowns (no full city lists). */
export function getLocationCatalog() {
  const world = getWorldCountriesSummary();
  const countries = [
    {
      id: 'us',
      label: 'United States',
      type: 'states',
      cityCount: US_STATES.length + US_MAJOR_CITIES.length,
    },
    {
      id: 'uk',
      label: 'United Kingdom',
      type: 'regions',
      cityCount: UK_REGIONS.reduce((n, r) => n + r.cities.length, 0),
    },
    ...world.sort((a, b) => a.label.localeCompare(b.label)),
  ];
  return { countries };
}

/** Full subcategories for one country (states, regions, or cities). */
export function getLocationCatalogCountry(countryId) {
  const id = (countryId || '').toLowerCase();
  if (id === 'us') return usCatalogEntry();
  if (id === 'uk') return ukCatalogEntry();
  return getWorldCountryDetail(id);
}

export function findNearestLocation(lat, lon) {
  let best = null;
  let bestDist = Infinity;

  for (const s of US_STATES) {
    const d = haversineKm(lat, lon, s.lat, s.lon);
    if (d < bestDist) {
      bestDist = d;
      best = {
        country: 'us',
        id: s.code,
        name: `${s.capital}, ${s.name}`,
        lat: s.lat,
        lon: s.lon,
        timezone: 'America/New_York',
      };
    }
  }

  for (const c of US_MAJOR_CITIES) {
    const d = haversineKm(lat, lon, c.lat, c.lon);
    if (d < bestDist) {
      bestDist = d;
      best = {
        country: 'us',
        id: c.slug,
        name: `${c.name}, ${c.stateName}`,
        lat: c.lat,
        lon: c.lon,
        timezone: c.timezone,
      };
    }
  }

  for (const region of UK_REGIONS) {
    for (const c of region.cities) {
      const d = haversineKm(lat, lon, c.lat, c.lon);
      if (d < bestDist) {
        bestDist = d;
        best = {
          country: 'uk',
          id: `${region.id}-${c.id}`,
          name: `${c.name}, ${region.name}`,
          lat: c.lat,
          lon: c.lon,
          timezone: 'Europe/London',
        };
      }
    }
  }

  for (const p of getAllWorldPoints()) {
    const d = haversineKm(lat, lon, p.lat, p.lon);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }

  return best;
}

/** All locations for SEO sitemap and landing pages. */
export function getAllWeatherSeoLocations() {
  const us = US_STATES.map((s) => ({
    country: 'us',
    slug: s.code.toLowerCase(),
    state: s.code,
    cityId: null,
    name: `${s.capital}, ${s.name}`,
    label: `${s.name} (${s.capital})`,
  }));
  const usCities = US_MAJOR_CITIES.map((c) => ({
    country: 'us',
    slug: c.slug,
    state: c.stateCode,
    cityId: c.slug,
    name: `${c.name}, ${c.stateName}`,
    label: `${c.name}, ${c.stateName}`,
  }));
  const uk = UK_REGIONS.flatMap((r) =>
    r.cities.map((c) => ({
      country: 'uk',
      slug: `${r.id}-${c.id}`,
      state: null,
      cityId: `${r.id}-${c.id}`,
      name: `${c.name}, ${r.name}`,
      label: `${c.name}, ${r.name}`,
    }))
  );
  const world = getAllWorldSeoLocations();
  return [...us, ...usCities, ...uk, ...world];
}

export function resolveLocationBySlug(country, slug) {
  const c = (country || '').toLowerCase();
  const s = (slug || '').toLowerCase();
  if (c === 'us') {
    const city = findUsCityBySlug(s);
    if (city) return resolveLocation({ country: 'us', cityId: city.slug });
    if (s.length === 2) return resolveLocation({ country: 'us', state: s.toUpperCase() });
  }
  if (c === 'uk') {
    return resolveLocation({ country: 'uk', cityId: slug });
  }
  if (isWorldCountry(c)) {
    const point = resolveWorldLocationBySlug(c, s);
    if (point) return point;
  }
  return null;
}

export function resolveLocation({ country, state, cityId, lat, lon }) {
  if (lat != null && lon != null) {
    return findNearestLocation(Number(lat), Number(lon));
  }
  if (country === 'us' && cityId) {
    const city = findUsCityBySlug(cityId);
    if (city) {
      return {
        country: 'us',
        id: city.slug,
        name: `${city.name}, ${city.stateName}`,
        lat: city.lat,
        lon: city.lon,
        timezone: city.timezone,
      };
    }
  }
  if (country === 'us' && state) {
    const s = US_STATES.find((x) => x.code === state);
    if (s) {
      return {
        country: 'us',
        id: s.code,
        name: `${s.capital}, ${s.name}`,
        lat: s.lat,
        lon: s.lon,
        timezone: 'America/New_York',
      };
    }
  }
  if (country === 'uk' && cityId) {
    for (const region of UK_REGIONS) {
      const c = region.cities.find((x) => `${region.id}-${x.id}` === cityId);
      if (c) {
        return {
          country: 'uk',
          id: cityId,
          name: `${c.name}, ${region.name}`,
          lat: c.lat,
          lon: c.lon,
          timezone: 'Europe/London',
        };
      }
    }
  }
  const asia = ASIA_COUNTRIES.find((x) => x.id === country);
  if (asia && cityId) {
    const cityKey = cityId.startsWith(`${country}-`) ? cityId.slice(country.length + 1) : cityId;
    const c = asia.cities.find((x) => x.id === cityKey || `${country}-${x.id}` === cityId);
    if (c) {
      const compositeId = `${country}-${c.id}`;
      return {
        country: asia.id,
        id: compositeId,
        name: `${c.name}, ${asia.name}`,
        lat: c.lat,
        lon: c.lon,
        timezone: asia.timezone,
      };
    }
  }
  if (isWorldCountry(country) && cityId) {
    const point = findWorldCity(country, cityId);
    if (point) return point;
  }
  return US_STATES[0]
    ? {
        country: 'us',
        id: US_STATES[0].code,
        name: `${US_STATES[0].capital}, ${US_STATES[0].name}`,
        lat: US_STATES[0].lat,
        lon: US_STATES[0].lon,
        timezone: 'America/New_York',
      }
    : null;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
