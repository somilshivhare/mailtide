import { Router } from 'express';
import mongoose from 'mongoose';
import Campaign from '../models/Campaign.js';
import Subscriber from '../models/Subscriber.js';
import Job from '../models/Job.js';
import { emailQueue } from '../queues/emailQueue.js';
import { schedulerQueue } from '../queues/schedulerQueue.js';
import auth from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/campaigns
 * Paginated list of campaigns. Filters: status.
 */
router.get('/', auth, async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const creatorId = req.user.id;

  try {
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

    res.status(200).json({
      campaigns,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error(`Get campaigns error: ${err.message}`);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/campaigns
 * Create a campaign draft.
 */
router.post('/', auth, async (req, res) => {
  const { title, subject, body } = req.body;
  const creatorId = req.user.id;

  if (!title || !subject || !body) {
    return res.status(400).json({ error: 'Title, subject, and body are required' });
  }

  try {
    const campaign = await Campaign.create({
      creatorId,
      title: title.trim(),
      subject: subject.trim(),
      body,
      status: 'draft'
    });

    res.status(201).json(campaign);
  } catch (err) {
    console.error(`Create campaign error: ${err.message}`);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/campaigns/:id
 * Retrieve details for a single campaign.
 */
router.get('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const creatorId = req.user.id;

  try {
    const campaign = await Campaign.findOne({ _id: id, creatorId });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    res.status(200).json(campaign);
  } catch (err) {
    console.error(`Get campaign detail error: ${err.message}`);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * PUT /api/campaigns/:id
 * Update a campaign draft. Allowed only if the campaign is in 'draft' status.
 */
router.put('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const creatorId = req.user.id;
  const { title, subject, body } = req.body;

  try {
    const campaign = await Campaign.findOne({ _id: id, creatorId });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.status !== 'draft') {
      return res.status(400).json({ error: 'Only campaign drafts can be updated' });
    }

    if (title) campaign.title = title.trim();
    if (subject) campaign.subject = subject.trim();
    if (body) campaign.body = body;

    await campaign.save();
    res.status(200).json(campaign);
  } catch (err) {
    console.error(`Update campaign error: ${err.message}`);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * DELETE /api/campaigns/:id
 * Delete a campaign. Allowed only if the campaign is in 'draft' status.
 */
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const creatorId = req.user.id;

  try {
    const campaign = await Campaign.findOne({ _id: id, creatorId });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.status !== 'draft') {
      return res.status(400).json({ error: 'Only campaign drafts can be deleted' });
    }

    await Campaign.deleteOne({ _id: id });
    res.status(200).json({ message: 'Campaign deleted successfully' });
  } catch (err) {
    console.error(`Delete campaign error: ${err.message}`);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/campaigns/:id/send
 * Launch or schedule a bulk email campaign.
 * If scheduledAt is provided (in the future), schedules the campaign via schedulerQueue.
 * Otherwise, dispatches immediately (creates Jobs and pushes to emailQueue).
 */
router.post('/:id/send', auth, async (req, res) => {
  const { id } = req.params;
  const creatorId = req.user.id;
  const { scheduledAt } = req.body;

  try {
    const campaign = await Campaign.findOne({ _id: id, creatorId });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // A campaign can be sent immediately or scheduled if it is in 'draft' or 'scheduled' status
    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      return res.status(400).json({ error: 'Campaign has already been queued or sent' });
    }

    // Handle campaign scheduling
    if (scheduledAt) {
      const scheduleTime = new Date(scheduledAt).getTime();
      const delay = scheduleTime - Date.now();

      if (isNaN(scheduleTime)) {
        return res.status(400).json({ error: 'Invalid scheduled date format' });
      }

      if (delay > 0) {
        // If rescheduling, clean up the previous scheduled job first
        if (campaign.status === 'scheduled') {
          const prevJob = await schedulerQueue.getJob(campaign._id.toString());
          if (prevJob) {
            await prevJob.remove();
          }
        }

        // Add delayed job to scheduler queue
        await schedulerQueue.add(
          'send-campaign',
          { campaignId: campaign._id.toString() },
          { delay, jobId: campaign._id.toString() } // Ensure 1 job per campaign (idempotency)
        );

        campaign.status = 'scheduled';
        campaign.scheduledAt = new Date(scheduledAt);
        await campaign.save();

        return res.status(200).json({ status: 'scheduled', scheduledAt: campaign.scheduledAt });
      }
    }

    // Dispatch immediately: Retrieve active subscribers
    const subscribers = await Subscriber.find({ creatorId, status: 'active' });
    if (subscribers.length === 0) {
      return res.status(400).json({ error: 'No active subscribers found. Please add or import subscribers.' });
    }

    // Check if jobs already exist for this campaign (prevent double dispatches)
    const existingJobCount = await Job.countDocuments({ campaignId: campaign._id });
    if (existingJobCount > 0) {
      return res.status(400).json({ error: 'Sending jobs already scheduled for this campaign' });
    }

    // Create Job records
    const jobsData = subscribers.map((sub) => ({
      campaignId: campaign._id,
      subscriberId: sub._id,
      email: sub.email,
      name: sub.name,
      status: 'queued'
    }));

    const createdJobs = await Job.insertMany(jobsData);

    // Queue in BullMQ
    const queueJobs = createdJobs.map((job) => ({
      name: 'send-email',
      data: { jobId: job._id.toString() }
    }));

    await emailQueue.addBulk(queueJobs);

    // Update campaign status
    campaign.status = 'queued';
    campaign.totalSubscribers = subscribers.length;
    campaign.sentAt = new Date();
    campaign.scheduledAt = undefined; // Clear schedule time on sending
    await campaign.save();

    return res.status(200).json({ queued: subscribers.length });
  } catch (err) {
    console.error(`Send campaign error: ${err.message}`);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/campaigns/:id/cancel
 * Cancel a scheduled campaign and revert it to draft.
 */
router.post('/:id/cancel', auth, async (req, res) => {
  const { id } = req.params;
  const creatorId = req.user.id;

  try {
    const campaign = await Campaign.findOne({ _id: id, creatorId });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.status !== 'scheduled') {
      return res.status(400).json({ error: 'Only scheduled campaigns can be cancelled' });
    }

    // Remove the scheduled job from BullMQ
    const scheduledJob = await schedulerQueue.getJob(campaign._id.toString());
    if (scheduledJob) {
      await scheduledJob.remove();
    }

    // Revert status to draft
    campaign.status = 'draft';
    campaign.scheduledAt = undefined;
    await campaign.save();

    res.status(200).json({ message: 'Campaign schedule cancelled successfully and reverted to draft' });
  } catch (err) {
    console.error(`Cancel campaign error: ${err.message}`);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/campaigns/:id/status
 * Check live progress counts for a campaign.
 */
router.get('/:id/status', auth, async (req, res) => {
  const { id } = req.params;
  const creatorId = req.user.id;

  try {
    const campaign = await Campaign.findOne({ _id: id, creatorId });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Aggregate counts by status
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

    res.status(200).json({
      status: campaign.status,
      totalSubscribers: campaign.totalSubscribers,
      stats
    });
  } catch (err) {
    console.error(`Get campaign status error: ${err.message}`);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/campaigns/:id/resend-non-openers
 * Resend the campaign specifically to subscribers who didn't open it.
 */
router.post('/:id/resend-non-openers', auth, async (req, res) => {
  const { id } = req.params;
  const creatorId = req.user.id;

  try {
    const campaign = await Campaign.findOne({ _id: id, creatorId });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.status !== 'sent') {
      return res.status(400).json({ error: 'Can only resend for fully sent campaigns' });
    }

    // Find delivered but not opened jobs.
    // Also skip invalid/unsubscribed accounts by checking subscriber status.
    const nonOpenerJobs = await Job.find({
      campaignId: campaign._id,
      status: { $in: ['sent', 'delivered'] },
      opened: false
    }).populate('subscriberId');

    const validNonOpeners = nonOpenerJobs.filter(job => job.subscriberId?.status === 'active');

    if (validNonOpeners.length === 0) {
      return res.status(400).json({ error: 'No eligible unopened subscribers found' });
    }

    // Create fresh Job records
    const jobsData = validNonOpeners.map((job) => ({
      campaignId: campaign._id,
      subscriberId: job.subscriberId._id,
      email: job.email,
      name: job.name,
      status: 'queued'
    }));

    const createdJobs = await Job.insertMany(jobsData);

    // Queue in BullMQ
    const queueJobs = createdJobs.map((job) => ({
      name: 'send-email',
      data: { jobId: job._id.toString() }
    }));

    await emailQueue.addBulk(queueJobs);

    // Increment totalSubscribers on campaign and change status to queued
    campaign.status = 'queued';
    campaign.totalSubscribers += validNonOpeners.length;
    await campaign.save();

    res.status(200).json({ queued: validNonOpeners.length });
  } catch (err) {
    console.error(`Resend campaign non-openers error: ${err.message}`);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
