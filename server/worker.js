import 'dotenv/config';
import { Worker } from 'bullmq';
import Redis from 'ioredis';
import mongoose from 'mongoose';
import Job from './models/Job.js';
import Campaign from './models/Campaign.js';
import Subscriber from './models/Subscriber.js';
import emailService from './services/email/index.js';
import { emailQueue } from './queues/emailQueue.js';

const { REDIS_URL, MONGODB_URI, BASE_URL } = process.env;
if (!REDIS_URL || !MONGODB_URI) {
  console.error('Error: REDIS_URL and MONGODB_URI env vars are required');
  process.exit(1);
}

// ── Startup diagnostic ─────────────────────────────────────────────────────
console.log('='.repeat(60));
console.log('[Worker] Starting Mailtide Email Worker');
console.log(`[Worker] PID          : ${process.pid}`);
console.log(`[Worker] Concurrency  : 3`);
console.log(`[Worker] Limiter      : max=1, duration=600ms`);
console.log(`[Worker] SENDER_EMAIL : ${process.env.SENDER_EMAIL || '⚠️  NOT SET'}`);
console.log(`[Worker] NODE_ENV     : ${process.env.NODE_ENV}`);
console.log(`[Worker] BASE_URL     : ${BASE_URL}`);
console.log(`[Worker] RESEND KEY   : ${process.env.RESEND_API_KEY ? 're_***' + process.env.RESEND_API_KEY.slice(-4) : '⚠️  NOT SET'}`);
console.log('='.repeat(60));

// Connect to MongoDB
try {
  await mongoose.connect(MONGODB_URI);
  console.log('Worker connected to MongoDB successfully.');
} catch (err) {
  console.error(`Worker MongoDB connection error: ${err.message}`);
  process.exit(1);
}

const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  tls: REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined
});

connection.on('error', (err) => {
  console.error(`Redis email worker connection error: ${err.message}`);
});

const schedulerConnection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  tls: REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined
});

schedulerConnection.on('error', (err) => {
  console.error(`Redis scheduler worker connection error: ${err.message}`);
});

/**
 * Helper to check campaign completion and update campaign status
 */
const checkCampaignCompletion = async (campaignId) => {
  try {
    const remainingJobs = await Job.countDocuments({
      campaignId,
      status: 'queued'
    });

    if (remainingJobs === 0) {
      const updated = await Campaign.findOneAndUpdate(
        { _id: campaignId, status: { $in: ['sending', 'queued'] } },
        { $set: { status: 'sent' } },
        { returnDocument: 'after' }
      );
      if (updated) {
        console.log(`[Worker] Campaign ${campaignId} COMPLETED — status set to 'sent'.`);
      }
    } else {
      console.log(`[Worker] Campaign ${campaignId} still processing — ${remainingJobs} jobs remaining in queue.`);
    }
  } catch (err) {
    console.error(`[Worker] Failed to check campaign completion for campaign ${campaignId}: ${err.message}`);
  }
};

/**
 * Job processing function
 */
const processJob = async (bullJob) => {
  const { jobId } = bullJob.data;
  if (!jobId) {
    throw new Error('Missing jobId in queue message');
  }

  try {
    const job = await Job.findById(jobId);
    if (!job) {
      console.warn(`Job ${jobId} not found in DB`);
      return;
    }

    // Skip if job already processed
    if (job.status !== 'queued') {
      return;
    }

    const campaign = await Campaign.findById(job.campaignId);
    const subscriber = await Subscriber.findById(job.subscriberId);

    if (!campaign || !subscriber) {
      job.status = 'failed';
      await job.save();
      await checkCampaignCompletion(job.campaignId);
      return;
    }

    // Check if campaign is in draft/failed (should not be sending)
    if (campaign.status === 'draft') {
      job.status = 'skipped';
      await job.save();
      await checkCampaignCompletion(job.campaignId);
      return;
    }

    // Mark campaign as sending if still queued
    if (campaign.status === 'queued') {
      await Campaign.updateOne({ _id: campaign._id }, { status: 'sending' });
    }

    // Check if subscriber is bounced or unsubscribed
    if (subscriber.status !== 'active' || subscriber.bounced || subscriber.unsubscribed) {
      job.status = 'skipped';
      await job.save();
      console.log(`[Worker] Job ${jobId} SKIPPED — subscriber ${subscriber.email} is ${subscriber.status}`);
      await checkCampaignCompletion(job.campaignId);
      return;
    }

    // Personalize email body
    let htmlBody = campaign.body;
    htmlBody = htmlBody.replace(/(\{\{\s*name\s*\}\})/g, subscriber.name);
    htmlBody = htmlBody.replace(/(\{\{\s*email\s*\}\})/g, subscriber.email);

    // Build and inject unsubscribe link
    const unsubscribeLink = `${BASE_URL}/api/unsubscribe?token=${subscriber.unsubscribeToken}`;
    const unsubscribeFooter = `
      <br/>
      <hr style="border: 0; border-top: 1px solid #ffffff15; margin: 30px 0 15px 0;" />
      <p style="font-size: 11px; font-family: 'Inter', sans-serif; color: #8888aa; text-align: center; line-height: 1.5;">
        You are receiving this because you subscribed to updates from ${subscriber.name || 'our mailing list'}.<br/>
        If you wish to stop receiving these emails, you can 
        <a href="${unsubscribeLink}" style="color: #7c6aff; text-decoration: underline;">unsubscribe here</a>.
      </p>
    `;

    // Append unsubscribe link or replace placeholder
    if (htmlBody.includes('{{unsubscribe}}') || htmlBody.includes('{{ unsubscribe }}')) {
      htmlBody = htmlBody.replace(/(\{\{\s*unsubscribe\s*\}\})/g, unsubscribeLink);
    } else {
      htmlBody += unsubscribeFooter;
    }

    // ── Diagnostic: log every send attempt ──────────────────────────────────
    const sender = process.env.SENDER_EMAIL;
    console.log(`[Worker] SEND ATTEMPT`);
    console.log(`  Job ID       : ${jobId}`);
    console.log(`  Campaign ID  : ${campaign._id}`);
    console.log(`  Subscriber ID: ${subscriber._id}`);
    console.log(`  From         : ${sender}`);
    console.log(`  To           : ${subscriber.email}`);
    console.log(`  Subject      : ${campaign.subject}`);

    // Send email using the unified EmailService abstraction layer
    const result = await emailService.sendCampaignEmail(subscriber.email, campaign.subject, htmlBody);

    // ── Diagnostic: log send result ─────────────────────────────────────────
    if (!result.success) {
      console.error(`[Worker] SEND FAILED  — Job: ${jobId} | To: ${subscriber.email} | Error: ${result.error?.message} (${result.error?.code})`);
      throw new Error(result.error?.message || 'Email delivery failed.');
    }

    console.log(`[Worker] SEND SUCCESS — Job: ${jobId} | To: ${subscriber.email} | Resend ID: ${result.messageId}`);

    // Update job status
    job.resendId = result.messageId;
    job.status = 'sent';
    await job.save();

    // Increment Campaign totals
    await Campaign.updateOne(
      { _id: campaign._id },
      { $inc: { totalSent: 1 } }
    );

    // Check campaign completion on success
    await checkCampaignCompletion(job.campaignId);

  } catch (err) {
    console.error(`[Worker] ERROR processing job ${jobId}: ${err.message}`);
    throw err;
  }
};

const worker = new Worker('mailtide-emails', processJob, {
  connection,
  concurrency: 3,
  limiter: {
    max: 1,       // 1 job per duration window
    duration: 600 // 600ms → ~1.6 emails/sec → safely under Resend 2 req/sec
  },
  drainDelay: 30,
  stalledInterval: 300000
});

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

worker.on('failed', async (job, err) => {
  console.error(`Job ${job?.id ?? 'unknown'} failed: ${err.message}`);
  if (job && job.attemptsMade >= job.opts.attempts) {
    const { jobId } = job.data;
    try {
      const dbJob = await Job.findByIdAndUpdate(
        jobId,
        { status: 'failed' },
        { returnDocument: 'after' }
      );
      if (dbJob) {
        console.log(`[Worker] Job ${jobId} failed permanently after ${job.attemptsMade} attempts.`);
        await checkCampaignCompletion(dbJob.campaignId);
      }
    } catch (dbErr) {
      console.error(`[Worker] Failed to update job ${jobId} to failed status in DB: ${dbErr.message}`);
    }
  } else if (job) {
    console.log(`[Worker] Job ${job.id} failed, will retry. Attempt ${job.attemptsMade} of ${job.opts.attempts}`);
  }
});

worker.on('error', (err) => {
  console.error(`Worker error: ${err.message}`);
});

/**
 * Scheduler Queue processing function
 */
const processScheduleJob = async (bullJob) => {
  const { campaignId } = bullJob.data;
  if (!campaignId) {
    throw new Error('Missing campaignId in scheduler job');
  }

  try {
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      console.warn(`Scheduler: Campaign ${campaignId} not found`);
      return;
    }

    if (campaign.status !== 'scheduled') {
      console.warn(`Scheduler: Campaign ${campaignId} is in status ${campaign.status}, skipping dispatch`);
      return;
    }

    // Retrieve active subscribers
    const subscribers = await Subscriber.find({ creatorId: campaign.creatorId, status: 'active' });
    if (subscribers.length === 0) {
      campaign.status = 'failed';
      await campaign.save();
      console.warn(`Scheduler: Campaign ${campaignId} failed to dispatch - no active subscribers`);
      return;
    }

    // Double check jobs to avoid duplicate execution
    const existingJobCount = await Job.countDocuments({ campaignId: campaign._id });
    if (existingJobCount > 0) {
      console.warn(`Scheduler: Campaign ${campaignId} already has jobs allocated, skipping`);
      return;
    }

    // Allocate Jobs
    const jobsData = subscribers.map((sub) => ({
      campaignId: campaign._id,
      subscriberId: sub._id,
      email: sub.email,
      name: sub.name,
      status: 'queued'
    }));

    const createdJobs = await Job.insertMany(jobsData);

    // Bulk queue into emailQueue
    const queueJobs = createdJobs.map((job) => ({
      name: 'send-email',
      data: { jobId: job._id.toString() }
    }));

    await emailQueue.addBulk(queueJobs);

    // Update campaign status
    campaign.status = 'queued';
    campaign.totalSubscribers = subscribers.length;
    campaign.sentAt = new Date();
    campaign.scheduledAt = undefined;
    await campaign.save();

    console.log(`Scheduler: Dispatched campaign ${campaignId} immediately to ${subscribers.length} subscribers.`);
  } catch (err) {
    console.error(`Scheduler failed to process campaign ${campaignId}: ${err.message}`);
    throw err;
  }
};

const schedulerWorker = new Worker('mailtide-campaign-scheduler', processScheduleJob, {
  connection: schedulerConnection,
  concurrency: 2,
  drainDelay: 30,
  stalledInterval: 300000
});

schedulerWorker.on('completed', (job) => {
  console.log(`Scheduler Job ${job.id} completed successfully`);
});

schedulerWorker.on('failed', (job, err) => {
  console.error(`Scheduler Job ${job?.id ?? 'unknown'} failed: ${err.message}`);
});

schedulerWorker.on('error', (err) => {
  console.error(`Scheduler Worker error: ${err.message}`);
});

const shutdown = async () => {
  try {
    await worker.close();
    await schedulerWorker.close();
    await connection.quit();
    await schedulerConnection.quit();
    await mongoose.disconnect();
    console.log('Worker and Scheduler shutdown successfully.');
    process.exit(0);
  } catch (err) {
    console.error(`Shutdown error: ${err.message}`);
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export { worker, schedulerWorker, shutdown };
