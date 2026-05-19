import { getSiteSettings } from '../models/SiteSettings.js';
import { getCricketScores, findCricketGameById } from '../services/cricketScoresService.js';
import { getLiveScores } from '../services/liveScoresService.js';
import { getWeatherForecast, getWeatherRegions } from '../services/weatherService.js';

export async function getHomepage(req, res, next) {
  try {
    const settings = await getSiteSettings();
    const heroMode = settings.homepageHeroMode || 'featured';
    const liveMatchId = settings.homepageLiveMatchId || null;
    const liveMatchLeague = settings.homepageLiveMatchLeague || 'cricket';

    let liveMatch = null;
    let competitions = [];
    let weather = null;

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
      weather = await getWeatherForecast({
        lat: req.query.lat,
        lon: req.query.lon,
        country: req.query.country,
        state: req.query.state,
        cityId: req.query.cityId,
      });
    }

    res.json({
      heroMode,
      liveMatchId,
      liveMatchLeague,
      liveMatch,
      competitions,
      weather,
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
