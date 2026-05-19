import { Router } from 'express';
import * as site from '../controllers/siteController.js';

const router = Router();

router.get('/homepage', site.getHomepage);
router.get('/weather', site.getWeather);
router.get('/weather/regions', site.listWeatherRegions);

export default router;
