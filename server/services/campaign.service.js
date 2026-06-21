import mongoose from 'mongoose';
import Campaign from '../models/Campaign.js';
import Subscriber from '../models/Subscriber.js';
import Job from '../models/Job.js';
import { emailQueue } from '../queues/emailQueue.js';
import { schedulerQueue } from '../queues/schedulerQueue.js';
import emailService from './email/index.js';

class CampaignService {
  async getCampaigns({ creatorId, page = 1, limit = 10, status }) {
    const query = { creatorId };
    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [campaigns, total] = await Promise.all([
      Campaign.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Campaign.countDocuments(query)
    ]);

    return {
      campaigns,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    };
  }

  async createCampaign({ creatorId, title, subject, body }) {
    return await Campaign.create({
      creatorId,
      title: title.trim(),
      subject: subject.trim(),
      body,
      status: 'draft'
    });
  }

  async getCampaignById({ id, creatorId }) {
    const campaign = await Campaign.findOne({ _id: id, creatorId });
    if (!campaign) {
      const err = new Error('Campaign not found');
      err.statusCode = 404;
      throw err;
    }
    return campaign;
  }

  async updateCampaign({ id, creatorId, title, subject, body }) {
    const campaign = await Campaign.findOne({ _id: id, creatorId });
    if (!campaign) {
      const err = new Error('Campaign not found');
      err.statusCode = 404;
      throw err;
    }

    if (campaign.status !== 'draft') {
      const err = new Error('Only campaign drafts can be updated');
      err.statusCode = 400;
      throw err;
    }

    if (title) campaign.title = title.trim();
    if (subject) campaign.subject = subject.trim();
    if (body) campaign.body = body;

    await campaign.save();
    return campaign;
  }

  async deleteCampaign({ id, creatorId }) {
    const campaign = await Campaign.findOne({ _id: id, creatorId });
    if (!campaign) {
      const err = new Error('Campaign not found');
      err.statusCode = 404;
      throw err;
    }

    if (campaign.status !== 'draft') {
      const err = new Error('Only campaign drafts can be deleted');
      err.statusCode = 400;
      throw err;
    }

    await Campaign.deleteOne({ _id: id });
    return { message: 'Campaign deleted successfully' };
  }

  async sendCampaign({ id, creatorId, scheduledAt }) {
    console.log(`[Diagnostic] API REQUEST RECEIVED for campaign ${id}`);

    const campaign = await Campaign.findOne({ _id: id, creatorId });
    if (!campaign) {
      console.log(`[Diagnostic] CAMPAIGN NOT FOUND: ${id}`);
      const err = new Error('Campaign not found');
      err.statusCode = 404;
      throw err;
    }
    console.log(`[Diagnostic] CAMPAIGN FOUND: ${campaign.title}`);

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      console.log(`[Diagnostic] INVALID CAMPAIGN STATUS: ${campaign.status}`);
      const err = new Error('Campaign has already been queued or sent');
      err.statusCode = 400;
      throw err;
    }

    // Handle scheduling
    if (scheduledAt) {
      console.log(`[Diagnostic] SCHEDULING CAMPAIGN at ${scheduledAt}`);
      const scheduleTime = new Date(scheduledAt).getTime();
      const delay = scheduleTime - Date.now();

      if (isNaN(scheduleTime)) {
        console.log(`[Diagnostic] INVALID SCHEDULE DATE FORMAT: ${scheduledAt}`);
        const err = new Error('Invalid scheduled date format');
        err.statusCode = 400;
        throw err;
      }

      if (delay > 0) {
        if (campaign.status === 'scheduled') {
          console.log(`[Diagnostic] CLEANING PREVIOUS SCHEDULED JOB for campaign ${id}`);
          const prevJob = await schedulerQueue.getJob(campaign._id.toString());
          if (prevJob) {
            await prevJob.remove();
          }
        }

        console.log(`[Diagnostic] ADDING TO SCHEDULER QUEUE with delay ${delay}`);
        await schedulerQueue.add(
          'send-campaign',
          { campaignId: campaign._id.toString() },
          { delay, jobId: campaign._id.toString() }
        );

        campaign.status = 'scheduled';
        campaign.scheduledAt = new Date(scheduledAt);
        await campaign.save();

        console.log(`[Diagnostic] SCHEDULING SUCCESSFUL`);
        return { status: 'scheduled', scheduledAt: campaign.scheduledAt };
      }
    }

    // Dispatch immediately
    console.log(`[Diagnostic] FETCHING ACTIVE SUBSCRIBERS`);
    const subscribers = await Subscriber.find({ creatorId, status: 'active' });
    if (subscribers.length === 0) {
      console.log(`[Diagnostic] NO ACTIVE SUBSCRIBERS FOUND`);
      const err = new Error('No active subscribers found. Please add or import subscribers.');
      err.statusCode = 400;
      throw err;
    }

    console.log(`[Diagnostic] CHECKING FOR EXISTING JOBS`);
    const existingJobCount = await Job.countDocuments({ campaignId: campaign._id });
    if (existingJobCount > 0) {
      console.log(`[Diagnostic] JOBS ALREADY EXIST`);
      const err = new Error('Sending jobs already scheduled for this campaign');
      err.statusCode = 400;
      throw err;
    }

    console.log(`[Diagnostic] CREATING DB JOB RECORDS`);
    const jobsData = subscribers.map((sub) => ({
      campaignId: campaign._id,
      subscriberId: sub._id,
      email: sub.email,
      name: sub.name,
      status: 'queued'
    }));

    const createdJobs = await Job.insertMany(jobsData);
    console.log(`[Diagnostic] QUEUE JOB CREATED: ${createdJobs.length} jobs created in MongoDB`);

    const queueJobs = createdJobs.map((job) => ({
      name: 'send-email',
      data: { jobId: job._id.toString() }
    }));

    console.log(`[Diagnostic] PUSHING TO emailQueue (BULLMQ)...`);
    await emailQueue.addBulk(queueJobs);
    console.log(`[Diagnostic] REDIS SUCCESS: Pushed to BullMQ successfully`);

    campaign.status = 'queued';
    campaign.totalSubscribers = subscribers.length;
    campaign.sentAt = new Date();
    campaign.scheduledAt = undefined;
    await campaign.save();

    console.log(`[Diagnostic] RESPONSE SENT`);
    return { queued: subscribers.length };
  }

  async cancelCampaign({ id, creatorId }) {
    const campaign = await Campaign.findOne({ _id: id, creatorId });
    if (!campaign) {
      const err = new Error('Campaign not found');
      err.statusCode = 404;
      throw err;
    }

    if (campaign.status !== 'scheduled') {
      const err = new Error('Only scheduled campaigns can be cancelled');
      err.statusCode = 400;
      throw err;
    }

    const scheduledJob = await schedulerQueue.getJob(campaign._id.toString());
    if (scheduledJob) {
      await scheduledJob.remove();
    }

    campaign.status = 'draft';
    campaign.scheduledAt = undefined;
    await campaign.save();

    return { message: 'Campaign schedule cancelled successfully and reverted to draft' };
  }

  async getCampaignStatus({ id, creatorId }) {
    const campaign = await Campaign.findOne({ _id: id, creatorId });
    if (!campaign) {
      const err = new Error('Campaign not found');
      err.statusCode = 404;
      throw err;
    }

    const statusCounts = await Job.aggregate([
      { $match: { campaignId: new mongoose.Types.ObjectId(id) } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const stats = {
      queued: 0,
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      failed: 0,
      skipped: 0
    };

    statusCounts.forEach((sc) => {
      if (stats[sc._id] !== undefined) {
        stats[sc._id] = sc.count;
      }
    });

    return {
      status: campaign.status,
      totalSubscribers: campaign.totalSubscribers,
      stats
    };
  }

  async resendNonOpeners({ id, creatorId }) {
    const campaign = await Campaign.findOne({ _id: id, creatorId });
    if (!campaign) {
      const err = new Error('Campaign not found');
      err.statusCode = 404;
      throw err;
    }

    if (campaign.status !== 'sent') {
      const err = new Error('Can only resend for fully sent campaigns');
      err.statusCode = 400;
      throw err;
    }

    const nonOpenerJobs = await Job.find({
      campaignId: campaign._id,
      status: { $in: ['sent', 'delivered'] },
      opened: false
    }).populate('subscriberId');

    const validNonOpeners = nonOpenerJobs.filter(job => job.subscriberId?.status === 'active');

    if (validNonOpeners.length === 0) {
      const err = new Error('No eligible unopened subscribers found');
      err.statusCode = 400;
      throw err;
    }

    const jobsData = validNonOpeners.map((job) => ({
      campaignId: campaign._id,
      subscriberId: job.subscriberId._id,
      email: job.email,
      name: job.name,
      status: 'queued'
    }));

    const createdJobs = await Job.insertMany(jobsData);

    const queueJobs = createdJobs.map((job) => ({
      name: 'send-email',
      data: { jobId: job._id.toString() }
    }));

    await emailQueue.addBulk(queueJobs);

    campaign.status = 'queued';
    campaign.totalSubscribers += validNonOpeners.length;
    await campaign.save();

    return { queued: validNonOpeners.length };
  }

  async sendTestEmail({ id, creatorId, email }) {
    const campaign = await Campaign.findOne({ _id: id, creatorId });
    if (!campaign) {
      const err = new Error('Campaign not found');
      err.statusCode = 404;
      throw err;
    }

    const subject = `[Test] ${campaign.subject}`;
    
    let htmlBody = campaign.body;
    htmlBody = htmlBody.replace(/(\{\{\s*name\s*\}\})/g, 'Test Recipient');
    htmlBody = htmlBody.replace(/(\{\{\s*email\s*\}\})/g, email);
    
    const dummyUnsubscribe = `${process.env.BASE_URL || 'http://localhost:5001'}/api/unsubscribe?token=test-token`;
    htmlBody = htmlBody.replace(/(\{\{\s*unsubscribe\s*\}\})/g, dummyUnsubscribe);

    console.log(`[TestEmail] Campaign: ${id} | From: ${process.env.SENDER_EMAIL} | To: ${email} | Subject: ${subject}`);

    const result = await emailService.sendCampaignEmail(email, subject, htmlBody);

    if (!result.success) {
      console.error(`[TestEmail] FAILED — To: ${email} | Error: ${result.error?.message}`);
      const err = new Error(result.error?.message || 'Failed to send test email');
      err.statusCode = 500;
      throw err;
    }

    console.log(`[TestEmail] SUCCESS — To: ${email} | Resend ID: ${result.messageId}`);
    return { message: 'Test email sent successfully', messageId: result.messageId };
  }
}

export default new CampaignService();
