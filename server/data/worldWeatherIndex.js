import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = join(__dirname, 'worldWeatherCatalog.json');

let _catalog = null;
let _byCountryId = null;
let _cityByComposite = null;
let _allPoints = null;

function loadCatalog() {
  if (_catalog) return _catalog;
  _catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));
  _byCountryId = new Map(_catalog.countries.map((c) => [c.id, c]));

  _cityByComposite = new Map();
  _allPoints = [];
  for (const country of _catalog.countries) {
    for (const city of country.cities) {
      const compositeId = `${country.id}-${city.id}`;
      const point = {
        country: country.id,
        id: compositeId,
        slug: compositeId,
        name: `${city.name}, ${country.label}`,
        lat: city.lat,
        lon: city.lon,
        timezone: city.timezone || 'auto',
        cityName: city.name,
        countryLabel: country.label,
      };
      _cityByComposite.set(compositeId, point);
      _cityByComposite.set(`${country.id}:${city.id}`, point);
      _allPoints.push(point);
    }
  }
  return _catalog;
}

export function getWorldCatalogMeta() {
  const cat = loadCatalog();
  return {
    generatedAt: cat.generatedAt,
    countryCount: cat.countryCount,
    cityCount: cat.cityCount,
  };
}

export function getWorldCountriesSummary() {
  loadCatalog();
  return _catalog.countries.map((c) => ({
    id: c.id,
    label: c.label,
    type: 'cities',
    timezone: c.timezone || 'auto',
    cityCount: c.cities.length,
  }));
}

export function getWorldCountryDetail(countryId) {
  loadCatalog();
  const c = _byCountryId.get(countryId);
  if (!c) return null;
  return {
    id: c.id,
    label: c.label,
    type: 'cities',
    timezone: c.timezone || 'auto',
    cities: c.cities.map((city) => ({
      id: `${c.id}-${city.id}`,
      slug: `${c.id}-${city.id}`,
      name: city.name,
      lat: city.lat,
      lon: city.lon,
      timezone: city.timezone || 'auto',
    })),
  };
}

export function findWorldCity(countryId, cityIdOrSlug) {
  loadCatalog();
  if (!countryId || !cityIdOrSlug) return null;
  const key = cityIdOrSlug.includes('-') ? cityIdOrSlug : `${countryId}-${cityIdOrSlug}`;
  return _cityByComposite.get(key) || null;
}

export function resolveWorldLocationBySlug(countryId, slug) {
  return findWorldCity(countryId, slug);
}

export function getAllWorldSeoLocations() {
  loadCatalog();
  return _allPoints.map((p) => ({
    country: p.country,
    slug: p.slug,
    state: null,
    cityId: p.id,
    name: p.name,
    label: p.name,
  }));
}

export function getAllWorldPoints() {
  loadCatalog();
  return _allPoints;
}

export function isWorldCountry(countryId) {
  loadCatalog();
  return _byCountryId.has(countryId);
}

export function getWorldCountryLabel(countryId) {
  loadCatalog();
  return _byCountryId.get(countryId)?.label || null;
}
