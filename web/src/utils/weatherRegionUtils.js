const UK_REGION_IDS = ['northern_ireland', 'england', 'scotland', 'wales'];

/** @param {unknown} catalog from /site/weather/regions */
export function inferUkRegionIdFromCityComposite(catalog, compositeCityId) {
  if (!compositeCityId) return '';
  const uk = catalog?.countries?.find((c) => c.id === 'uk');
  if (uk?.regions?.length) {
    const ids = [...uk.regions.map((r) => r.id)].sort((a, b) => b.length - a.length);
    for (const regionId of ids) {
      if (String(compositeCityId).startsWith(`${regionId}-`)) return regionId;
    }
  }
  for (const regionId of [...UK_REGION_IDS].sort((a, b) => b.length - a.length)) {
    if (String(compositeCityId).startsWith(`${regionId}-`)) return regionId;
  }
  return '';
}
