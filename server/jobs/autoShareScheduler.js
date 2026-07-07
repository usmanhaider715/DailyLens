import cron from 'node-cron';
import { getSiteSettings } from '../models/SiteSettings.js';
import { runAutoSharePeriod, defaultPeriods } from '../services/autoShareService.js';
import { periodMatchesNow } from '../utils/usEasternTime.js';
import { logger } from '../utils/logger.js';

let running = false;

async function tickAutoShare() {
  if (running) return;
  running = true;
  try {
    const settings = await getSiteSettings();
    if (!settings.autoShareEnabled) return;

    const periods = settings.autoSharePeriods?.length
      ? settings.autoSharePeriods
      : defaultPeriods();

    for (const period of periods) {
      if (!periodMatchesNow(period)) continue;
      try {
        const result = await runAutoSharePeriod(period, { triggeredBy: 'schedule' });
        if (!result.skipped) {
          logger.info(`Auto-share ${period.label || period.id}: ${result.summary || result.status}`);
        }
      } catch (err) {
        logger.error(`Auto-share period ${period.id} failed`, err);
      }
    }
  } finally {
    running = false;
  }
}

/** Every minute — match scheduled slots in US Eastern time */
export function scheduleAutoShare() {
  cron.schedule('* * * * *', () => {
    tickAutoShare().catch((e) => logger.error('Auto-share scheduler tick failed', e));
  });
  logger.info('Auto-share scheduler enabled (America/New_York)');
}
