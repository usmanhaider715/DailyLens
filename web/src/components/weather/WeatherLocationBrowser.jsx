'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Globe, Search } from 'lucide-react';
import { api } from '@/services/api';
import { Spinner } from '../common/Spinner.jsx';

export function WeatherLocationBrowser({ initialCountries = [] }) {
  const [countries] = useState(initialCountries);
  const [query, setQuery] = useState('');
  const [openCountry, setOpenCountry] = useState(null);
  const [cityCache, setCityCache] = useState({});
  const [loadingCountry, setLoadingCountry] = useState(null);
  const [cityQuery, setCityQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter((c) => c.label.toLowerCase().includes(q));
  }, [countries, query]);

  const loadCities = async (countryId) => {
    if (cityCache[countryId]) return;
    setLoadingCountry(countryId);
    try {
      const { data } = await api.get('/site/weather/locations', { params: { country: countryId } });
      setCityCache((prev) => ({ ...prev, [countryId]: data.locations || [] }));
    } finally {
      setLoadingCountry(null);
    }
  };

  const toggleCountry = async (country) => {
    if (openCountry === country.id) {
      setOpenCountry(null);
      setCityQuery('');
      return;
    }
    setOpenCountry(country.id);
    setCityQuery('');
    await loadCities(country.id);
  };

  const filterCities = (countryId) => {
    const cities = cityCache[countryId] || [];
    const q = cityQuery.trim().toLowerCase();
    if (!q) return cities;
    return cities.filter((loc) => loc.label.toLowerCase().includes(q));
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50/80 to-white shadow-sm dark:border-sky-900/50 dark:from-sky-950/30 dark:to-gray-900">
      <div className="border-b border-sky-100 px-4 py-4 sm:px-5 dark:border-sky-900/50">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-sky-700 dark:text-sky-400" />
          <h2 className="font-display text-lg font-bold text-gray-900 sm:text-xl dark:text-white">
            Browse weather by country
          </h2>
        </div>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {countries.length} countries · pick a country, then a city or region for a detailed forecast.
        </p>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search countries…"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
        </div>
      </div>

      <div className="max-h-[32rem] overflow-y-auto px-2 py-2 sm:px-3">
        {filtered.map((country) => {
          const isOpen = openCountry === country.id;
          const cities = filterCities(country.id);
          return (
            <div key={country.id} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
              <button
                type="button"
                onClick={() => toggleCountry(country)}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left hover:bg-white/80 dark:hover:bg-gray-900/50"
              >
                <span>
                  <span className="block text-sm font-semibold text-gray-900 dark:text-white">{country.label}</span>
                  <span className="text-xs text-gray-500">
                    {country.cityCount?.toLocaleString()} locations
                    {country.type === 'states' ? ' · states' : country.type === 'regions' ? ' · regions & cities' : ' · cities'}
                  </span>
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-gray-400 transition ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isOpen && (
                <div className="px-3 pb-3">
                  {loadingCountry === country.id && (
                    <div className="flex justify-center py-4">
                      <Spinner />
                    </div>
                  )}
                  {loadingCountry !== country.id && cityCache[country.id]?.length > 0 && (
                    <input
                      type="search"
                      value={openCountry === country.id ? cityQuery : ''}
                      onChange={(e) => setCityQuery(e.target.value)}
                      placeholder={`Search cities in ${country.label}…`}
                      className="mb-2 w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-900"
                    />
                  )}
                  {loadingCountry !== country.id && cities.length > 0 && (
                    <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                      {cities.map((loc) => (
                        <li key={loc.slug}>
                          <Link
                            href={`/weather/${country.id}/${loc.slug}`}
                            className="block rounded-md px-2 py-1.5 text-sm text-primary-700 hover:bg-primary-50 hover:underline dark:text-primary-400 dark:hover:bg-primary-950/30"
                          >
                            {loc.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
