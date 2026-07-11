import cron from 'node-cron';
import { logger } from '../utils/logger.js';
import { tickEvergreenScheduler } from '../services/evergreenPipelineService.js';

let scheduled = false;

export function scheduleEvergreenPipeline() {
  if (scheduled) return;
  scheduled = true;
  cron.schedule('* * * * *', () => {
    tickEvergreenScheduler().catch((err) => logger.error('Evergreen tick error', err.message));
  });
  logger.info('Evergreen pipeline scheduler enabled (minute check)');
}
