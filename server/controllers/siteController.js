import { getSiteSettings } from '../models/SiteSettings.js';
import { getCricketScores, findCricketGameById } from '../services/cricketScoresService.js';
import { getLiveScores } from '../services/liveScoresService.js';
import { getWeatherForecast, getWeatherRegions, getWeatherRegionCountry } from '../services/weatherService.js';
import { getWeatherAnalysis } from '../services/weatherAnalysisService.js';
import { getAllWeatherSeoLocations, resolveLocationBySlug, weatherQueryFromPoint, getLocationCatalog, getLocationCatalogCountry } from '../data/weatherLocations.js';

export async function getHomepage(req, res, next) {
  try {
    const settings = await getSiteSettings();
    const heroMode = settings.homepageHeroMode || 'featured';
    const liveMatchId = settings.homepageLiveMatchId || null;
    const liveMatchLeague = settings.homepageLiveMatchLeague || 'cricket';

    let liveMatch = null;
    let competitions = [];
    let weather = null;

    const weatherPrefs = {
      useVisitorLocation: settings.homepageWeatherUseVisitorLocation !== false,
      country: settings.homepageWeatherCountry || 'us',
      state: settings.homepageWeatherState || 'NY',
      cityId: settings.homepageWeatherCityId || '',
    };

    const refresh = req.query.refresh === '1' || req.query.refresh === 'true';

    if (heroMode === 'live_match' && liveMatchId) {
      if (liveMatchLeague === 'cricket') {
        const board = await getCricketScores({ refresh });
        competitions = board.competitions || [];
        liveMatch =
          board.games?.find((g) => g.id === liveMatchId) || (await findCricketGameById(liveMatchId));
      } else if (liveMatchLeague === 'soccer') {
        const board = await getLiveScores('soccer', { refresh });
        competitions = board.competitions || [];
        liveMatch = board.games?.find((g) => g.id === liveMatchId) || null;
      } else {
        const board = await getLiveScores(liveMatchLeague, { refresh });
        liveMatch = (board.games || []).find((g) => g.id === liveMatchId) || null;
      }
    }

    if (heroMode === 'weather') {
      const geoLat =
        req.query.lat !== undefined && req.query.lat !== '' ? Number(req.query.lat) : undefined;
      const geoLon =
        req.query.lon !== undefined && req.query.lon !== '' ? Number(req.query.lon) : undefined;
      const hasGeo = geoLat != null && geoLon != null && !Number.isNaN(geoLat) && !Number.isNaN(geoLon);

      if (hasGeo) {
        weather = await getWeatherForecast({
          lat: geoLat,
          lon: geoLon,
          country: req.query.country,
          state: req.query.state,
          cityId: req.query.cityId,
        });
      } else if (!weatherPrefs.useVisitorLocation) {
        weather =
          weatherPrefs.country === 'uk' && weatherPrefs.cityId
            ? await getWeatherForecast({ country: 'uk', cityId: weatherPrefs.cityId })
            : await getWeatherForecast({ country: 'us', state: weatherPrefs.state || 'NY' });
      }
      /** Visitor-geolocation mode: no coords → omit forecast until browser resolves lat/lon */
    }

    res.json({
      heroMode,
      liveMatchId,
      liveMatchLeague,
      liveMatch,
      competitions,
      weather,
      weatherPrefs,
      showCryptoChart: settings.homepageShowCryptoChart !== false,
      defaultCryptoCoinId: settings.homepageCryptoCoinId || 'bitcoin',
    });
  } catch (e) {
    next(e);
  }
}

export async function getWeather(req, res, next) {
  try {
    const forecast = await getWeatherForecast({
      lat: req.query.lat,
      lon: req.query.lon,
      country: req.query.country,
      state: req.query.state,
      cityId: req.query.cityId,
    });
    res.json(forecast);
  } catch (e) {
    next(e);
  }
}

export async function listWeatherRegions(req, res, next) {
  try {
    res.json(getWeatherRegions());
  } catch (e) {
    next(e);
  }
}

export async function getWeatherRegionCountryHandler(req, res, next) {
  try {
    const detail = getWeatherRegionCountry(req.params.countryId);
    if (!detail) return res.status(404).json({ message: 'Country not found' });
    res.json(detail);
  } catch (e) {
    next(e);
  }
}

export async function getWeatherAnalysisHandler(req, res, next) {
  try {
    const analysis = await getWeatherAnalysis({
      country: req.query.country,
      state: req.query.state,
      cityId: req.query.cityId,
      lat: req.query.lat,
      lon: req.query.lon,
      refresh: req.query.refresh,
    });
    res.json(analysis);
  } catch (e) {
    next(e);
  }
}

export async function getWeatherBySlug(req, res, next) {
  try {
    const { country, slug } = req.params;
    const point = resolveLocationBySlug(country, slug);
    if (!point) return res.status(404).json({ message: 'Weather location not found' });

    const analysis = await getWeatherAnalysis(weatherQueryFromPoint(point));

    res.json({ location: point, analysis });
  } catch (e) {
    next(e);
  }
}

export async function listWeatherSeoLocations(req, res, next) {
  try {
    if (req.query.summary === '1') {
      return res.json({ countries: getLocationCatalog().countries });
    }
    if (req.query.country) {
      const detail = getLocationCatalogCountry(req.query.country);
      if (!detail) return res.status(404).json({ message: 'Country not found' });
      let locations = [];
      if (detail.type === 'states') {
        locations = (detail.states || []).map((s) => ({
          country: 'us',
          slug: s.id.toLowerCase(),
          label: s.label,
          name: s.label,
        }));
      } else if (detail.type === 'regions') {
        locations = (detail.regions || []).flatMap((r) =>
          (r.cities || []).map((c) => ({
            country: 'uk',
            slug: c.id,
            label: `${c.name}, ${r.name}`,
            name: `${c.name}, ${r.name}`,
          })),
        );
      } else {
        locations = (detail.cities || []).map((c) => ({
          country: detail.id,
          slug: c.slug || c.id,
          label: `${c.name}, ${detail.label}`,
          name: `${c.name}, ${detail.label}`,
        }));
      }
      return res.json({ country: detail, locations });
    }
    res.json({ locations: getAllWeatherSeoLocations() });
  } catch (e) {
    next(e);
  }
}
