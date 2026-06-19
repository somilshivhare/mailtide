import 'dotenv/config';
import mongoose from 'mongoose';
import Redis from 'ioredis';
import { Queue } from 'bullmq';
import Campaign from './models/Campaign.js';
import Job from './models/Job.js';
import Subscriber from './models/Subscriber.js';

const { REDIS_URL, MONGODB_URI } = process.env;

const run = async () => {
  console.log('=== MailTide Queue & Campaign Audit ===');
  console.log(`Connecting to MongoDB...`);
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected successfully.\n');

    // 1. Fetch the 3 most recent campaigns
    console.log('--- 1. Latest Campaigns ---');
    const campaigns = await Campaign.find().sort({ createdAt: -1 }).limit(3);
    
    if (campaigns.length === 0) {
      console.log('No campaigns found in the database.');
    }

    for (const c of campaigns) {
      console.log(`Campaign ID: ${c._id}`);
      console.log(`  Title:      "${c.title}"`);
      console.log(`  Subject:    "${c.subject}"`);
      console.log(`  Status:     ${c.status}`);
      console.log(`  Subscribers:${c.totalSubscribers} total`);
      console.log(`  Processed:  ${c.totalSent} sent`);
      
      // Count Job documents in MongoDB for this campaign
      const jobCounts = await Job.aggregate([
        { $match: { campaignId: c._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);

      console.log('  MongoDB Jobs Breakdown:');
      if (jobCounts.length === 0) {
        console.log('    (No MongoDB Job documents found for this campaign)');
      } else {
        jobCounts.forEach(jc => {
          console.log(`    - ${jc._id}: ${jc.count}`);
        });
      }
      console.log();
    }

    // 2. Query Redis & BullMQ Queues
    console.log('--- 2. BullMQ Queue Counts in Redis ---');
    console.log(`Connecting to Redis URL: ${REDIS_URL.split('@')[1] || REDIS_URL}`);
    
    const connection = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      connectTimeout: 5000
    });

    connection.on('error', (err) => {
      console.error(`[Redis Error] Connection failed: ${err.message}`);
    });

    const emailQueue = new Queue('mailtide-emails', { connection });
    const schedulerQueue = new Queue('mailtide-campaign-scheduler', { connection });

    try {
      const emailCounts = await emailQueue.getJobCounts();
      console.log('Email Queue (mailtide-emails):');
      console.log(`  waiting:   ${emailCounts.waiting}`);
      console.log(`  active:    ${emailCounts.active}`);
      console.log(`  delayed:   ${emailCounts.delayed}`);
      console.log(`  completed: ${emailCounts.completed}`);
      console.log(`  failed:    ${emailCounts.failed}`);
      console.log(`  paused:    ${emailCounts.paused}`);
    } catch (qErr) {
      console.error(`  Could not read emailQueue counts: ${qErr.message}`);
    }

    try {
      const schedCounts = await schedulerQueue.getJobCounts();
      console.log('\nScheduler Queue (mailtide-campaign-scheduler):');
      console.log(`  waiting:   ${schedCounts.waiting}`);
      console.log(`  active:    ${schedCounts.active}`);
      console.log(`  delayed:   ${schedCounts.delayed}`);
      console.log(`  completed: ${schedCounts.completed}`);
      console.log(`  failed:    ${schedCounts.failed}`);
      console.log(`  paused:    ${schedCounts.paused}`);
    } catch (qErr) {
      console.error(`  Could not read schedulerQueue counts: ${qErr.message}`);
    }

    await connection.quit();

  } catch (err) {
    console.error('Audit Execution Error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nAudit complete.');
    process.exit(0);
  }
};

run();
