/** @param {unknown} catalog from /site/weather/regions */
export function inferUkRegionIdFromCityComposite(catalog, compositeCityId) {
  if (!compositeCityId || !catalog?.countries) return '';
  const uk = catalog.countries.find((c) => c.id === 'uk');
  if (!uk?.regions?.length) return '';
  const ids = [...uk.regions.map((r) => r.id)].sort((a, b) => b.length - a.length);
  for (const regionId of ids) {
    if (String(compositeCityId).startsWith(`${regionId}-`)) return regionId;
  }
  return '';
}
