import { Queue } from 'bullmq';
import { connection } from './emailQueue.js';

const schedulerQueue = new Queue('mailtide-campaign-scheduler', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: 10,
    removeOnFail: 100
  }
});

export { schedulerQueue };
