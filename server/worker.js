import { Worker } from 'bullmq';
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
  console.error(`Redis worker connection error: ${err.message}`);
});

const processJob = async (job) => {
  try {
    console.log(`Processing job ${job.id}:`, job.data);
  } catch (err) {
    console.error(`Error processing job ${job.id}: ${err.message}`);
    throw err;
  }
};

const worker = new Worker('mailtide-emails', processJob, {
  connection,
  concurrency: 5,
  limiter: {
    max: 50,
    duration: 1000
  }
});

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id ?? 'unknown'} failed: ${err.message}`);
});

worker.on('error', (err) => {
  console.error(`Worker error: ${err.message}`);
});

const shutdown = async () => {
  try {
    await worker.close();
    await connection.quit();
    process.exit(0);
  } catch (err) {
    console.error(`Shutdown error: ${err.message}`);
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export { worker, shutdown };
