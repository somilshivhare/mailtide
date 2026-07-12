import { Router } from 'express';
import mongoose from 'mongoose';
import Campaign from '../models/Campaign.js';
import Subscriber from '../models/Subscriber.js';
import Job from '../models/Job.js';
import auth from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/analytics/overview
 * Overview stats for the creator's dashboard.
 */
router.get('/overview', auth, async (req, res) => {
  const creatorId = req.user.id;

  try {
    // Total counts
    const totalCampaigns = await Campaign.countDocuments({ creatorId });
    const totalSubscribers = await Subscriber.countDocuments({ creatorId, status: 'active' });

    // Aggregate rates and totals from all campaigns
    const campaigns = await Campaign.find({ creatorId });

    let totalSent = 0;
    let totalDelivered = 0;
    let totalOpened = 0;
    let totalClicked = 0;
    let totalBounced = 0;
    let totalComplained = 0;
    let totalUnsubscribed = 0;

    campaigns.forEach((campaign) => {
      totalSent += campaign.totalSent || 0;
      totalDelivered += campaign.totalDelivered || 0;
      totalOpened += campaign.totalOpened || 0;
      totalClicked += campaign.totalClicked || 0;
      totalBounced += campaign.totalBounced || 0;
      totalComplained += campaign.totalComplained || 0;
      totalUnsubscribed += campaign.totalUnsubscribed || 0;
    });

    const avgOpenRate = totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0;
    const avgClickRate = totalDelivered > 0 ? (totalClicked / totalDelivered) * 100 : 0;

    res.status(200).json({
      avgOpenRate: Math.round(avgOpenRate * 10) / 10,
      avgClickRate: Math.round(avgClickRate * 10) / 10,
      totalCampaigns,
      totalSubscribers,
      totalSent,
      totalDelivered,
      totalOpened,
      totalClicked,
      totalBounced,
      totalComplained,
      totalUnsubscribed
    });
  } catch (err) {
    console.error(`Get analytics overview error: ${err.message}`);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/analytics/campaigns/:id
 * Detailed stats break down and hourly/daily activity timeline for a campaign.
 */
router.get('/campaigns/:id', auth, async (req, res) => {
  const { id } = req.params;
  const creatorId = req.user.id;

  try {
    const campaign = await Campaign.findOne({ _id: id, creatorId });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Build timeline from Job records
    const timelineData = await Job.aggregate([
      { $match: { campaignId: campaign._id, status: { $ne: 'queued' } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          sent: { $sum: 1 },
          delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          opened: { $sum: { $cond: ['$opened', 1, 0] } },
          clicked: { $sum: { $cond: ['$clicked', 1, 0] } },
          bounced: { $sum: { $cond: ['$bounced', 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const formattedTimeline = timelineData.map((d) => ({
      date: d._id,
      sent: d.sent,
      delivered: d.delivered,
      opened: d.opened,
      clicked: d.clicked,
      bounced: d.bounced
    }));

    res.status(200).json({
      campaign,
      timeline: formattedTimeline
    });
  } catch (err) {
    console.error(`Get campaign analytics error: ${err.message}`);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/analytics/subscribers/growth
 * Subscriber count growth over the last 30 days.
 */
router.get('/subscribers/growth', auth, async (req, res) => {
  const creatorId = req.user.id;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  try {
    // 1. Get initial total count prior to 30 days ago
    const initialCount = await Subscriber.countDocuments({
      creatorId,
      createdAt: { $lt: thirtyDaysAgo }
    });

    // 2. Get daily signups over the last 30 days
    const dailySignups = await Subscriber.aggregate([
      {
        $match: {
          creatorId: new mongoose.Types.ObjectId(creatorId),
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const signupMap = {};
    dailySignups.forEach((d) => {
      signupMap[d._id] = d.count;
    });

    // 3. Construct 30-day timeline with running total
    const growthTimeline = [];
    let cumulativeCount = initialCount;

    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];

      const newSignups = signupMap[dateString] || 0;
      cumulativeCount += newSignups;

      growthTimeline.push({
        date: dateString,
        newSubscribers: newSignups,
        totalSubscribers: cumulativeCount
      });
    }

    res.status(200).json(growthTimeline);
  } catch (err) {
    console.error(`Get subscriber growth error: ${err.message}`);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
