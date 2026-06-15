import { Worker } from 'bullmq';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Job from './models/Job.js';
import Campaign from './models/Campaign.js';
import Subscriber from './models/Subscriber.js';
import emailService from './services/email/index.js';
import { emailQueue } from './queues/emailQueue.js';

dotenv.config();

const { REDIS_URL, MONGODB_URI, BASE_URL } = process.env;
if (!REDIS_URL || !MONGODB_URI) {
  console.error('Error: REDIS_URL and MONGODB_URI env vars are required');
  process.exit(1);
}

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
  enableReadyCheck: false
});

connection.on('error', (err) => {
  console.error(`Redis worker connection error: ${err.message}`);
});

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
      return;
    }

    // Check if campaign is in draft/failed (should not be sending)
    if (campaign.status === 'draft') {
      job.status = 'skipped';
      await job.save();
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
      return;
    }

    // Personalize email body
    let htmlBody = campaign.body;
    htmlBody = htmlBody.replace(/\{\{\s*name\s*\}\}/g, subscriber.name);
    htmlBody = htmlBody.replace(/\{\{\s*email\s*\}\}/g, subscriber.email);

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
      htmlBody = htmlBody.replace(/\{\{\s*unsubscribe\s*\}\}/g, unsubscribeLink);
    } else {
      htmlBody += unsubscribeFooter;
    }

    // Send email using the unified EmailService abstraction layer
    const result = await emailService.sendCampaignEmail(subscriber.email, campaign.subject, htmlBody);

    if (!result.success) {
      throw new Error(result.error?.message || 'Email delivery failed.');
    }

    // Update job status
    job.resendId = result.messageId;
    job.status = 'sent';
    await job.save();

    // Increment Campaign totals
    await Campaign.updateOne(
      { _id: campaign._id },
      { $inc: { totalSent: 1 } }
    );

    // Check if all campaign jobs have completed
    const remainingJobs = await Job.countDocuments({
      campaignId: campaign._id,
      status: 'queued'
    });

    if (remainingJobs === 0) {
      await Campaign.updateOne({ _id: campaign._id }, { status: 'sent' });
      console.log(`Campaign ${campaign._id} sending completed.`);
    }

  } catch (err) {
    console.error(`Error processing job ${jobId}: ${err.message}`);
    // Update job status to failed
    await Job.updateOne({ _id: jobId }, { status: 'failed' });
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
  console.log(`Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id ?? 'unknown'} failed: ${err.message}`);
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
  connection,
  concurrency: 2
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
