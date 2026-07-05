import { Router } from 'express';
import * as site from '../controllers/siteController.js';
import * as crypto from '../controllers/cryptoController.js';

const router = Router();

router.get('/homepage', site.getHomepage);
router.get('/weather', site.getWeather);
router.get('/weather/regions', site.listWeatherRegions);
router.get('/weather/regions/:countryId', site.getWeatherRegionCountryHandler);
router.get('/weather/analysis', site.getWeatherAnalysisHandler);
router.get('/weather/locations', site.listWeatherSeoLocations);
router.get('/weather/:country/:slug', site.getWeatherBySlug);
router.get('/crypto/coins', crypto.getCoins);
router.get('/crypto/chart', crypto.getChart);

export default router;
