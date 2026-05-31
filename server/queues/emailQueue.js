import { Queue } from 'bullmq';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const { REDIS_URL } = process.env;
if (!REDIS_URL) {
  console.error('Error: REDIS_URL env var is missing');
  process.exit(1);
}

const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

connection.on('error', (err) => {
  console.error(`Redis connection error: ${err.message}`);
});

const emailQueue = new Queue('mailtide-emails', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: 100,
    removeOnFail: 500
  }
});

export { emailQueue, connection };
