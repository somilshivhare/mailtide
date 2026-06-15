import { Router } from 'express';
import Campaign from '../models/Campaign.js';
import { writeCampaign, optimizeSubject, analyzeCampaign, rewriteCampaign, suggestSubjects } from '../services/ai.js';
import auth from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/ai/write-campaign
 * Generates an email campaign topic, subject, and body using Claude.
 */
router.post('/write-campaign', auth, async (req, res) => {
  const { topic, tone, audience } = req.body;

  if (!topic || !tone || !audience) {
    return res.status(400).json({ error: 'Topic, tone, and audience are required' });
  }

  try {
    const result = await writeCampaign(topic, tone, audience);
    res.status(200).json(result);
  } catch (err) {
    console.error(`AI Campaign Generation error: ${err.message}`);
    res.status(500).json({ error: 'AI processing failed' });
  }
});

/**
 * POST /api/ai/optimize-subject
 * Grades a subject line and gives suggestions.
 */
router.post('/optimize-subject', auth, async (req, res) => {
  const { subjectLine } = req.body;

  if (!subjectLine) {
    return res.status(400).json({ error: 'Subject line is required' });
  }

  try {
    const result = await optimizeSubject(subjectLine);
    res.status(200).json(result);
  } catch (err) {
    console.error(`AI Subject Optimization error: ${err.message}`);
    res.status(500).json({ error: 'AI processing failed' });
  }
});

/**
 * POST /api/ai/analyze-campaign
 * Loads campaign metrics and analyzes performance using Claude.
 */
router.post('/analyze-campaign', auth, async (req, res) => {
  const { campaignId } = req.body;

  if (!campaignId) {
    return res.status(400).json({ error: 'Campaign ID is required' });
  }

  try {
    const campaign = await Campaign.findOne({ _id: campaignId, creatorId: req.user.id });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const stats = {
      title: campaign.title,
      subject: campaign.subject,
      totalSubscribers: campaign.totalSubscribers,
      totalSent: campaign.totalSent,
      totalDelivered: campaign.totalDelivered,
      totalOpened: campaign.totalOpened,
      totalClicked: campaign.totalClicked,
      totalBounced: campaign.totalBounced
    };

    const result = await analyzeCampaign(stats);
    res.status(200).json(result);
  } catch (err) {
    console.error(`AI Campaign Analysis error: ${err.message}`);
    res.status(500).json({ error: 'AI processing failed' });
  }
});

/**
 * POST /api/ai/rewrite
 * Rewrites a campaign body with a specific tone option.
 */
router.post('/rewrite', auth, async (req, res) => {
  const { body, option } = req.body;

  if (!body || !option) {
    return res.status(400).json({ error: 'Body and option are required' });
  }

  try {
    const result = await rewriteCampaign(body, option);
    res.status(200).json(result);
  } catch (err) {
    console.error(`AI Campaign Rewrite error: ${err.message}`);
    res.status(500).json({ error: 'AI processing failed' });
  }
});

/**
 * POST /api/ai/suggest-subjects
 * Suggests alternative subject lines and reasoning.
 */
router.post('/suggest-subjects', auth, async (req, res) => {
  const { topic, body } = req.body;

  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  try {
    const result = await suggestSubjects(topic, body);
    res.status(200).json(result);
  } catch (err) {
    console.error(`AI Subject Suggestions error: ${err.message}`);
    res.status(500).json({ error: 'AI processing failed' });
  }
});

export default router;
