import { Router } from 'express';
import Job from '../models/Job.js';
import Campaign from '../models/Campaign.js';
import Subscriber from '../models/Subscriber.js';
import { processResendWebhook } from '../services/webhook.service.js';

const router = Router();

/**
 * POST /api/webhooks/simulate
 * Simulates a Resend webhook event locally for development and dashboard testing.
 * Disabled in production environments.
 */
router.post('/api/webhooks/simulate', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Webhook simulation is disabled in production environments.' });
  }

  const { type, emailId, bounceType } = req.body;
  if (!type || !emailId) {
    return res.status(400).json({ error: 'type and emailId parameters are required' });
  }

  try {
    const job = await Job.findOne({ resendId: emailId });
    if (!job) {
      return res.status(404).json({ error: `Simulated Webhook: Job with resendId ${emailId} not found.` });
    }

    const mockData = {
      email_id: emailId,
      bounce_type: bounceType || 'Permanent'
    };

    const mockEventId = `sim_evt_${Date.now()}_${Math.round(Math.random() * 1e9)}`;
    await processResendWebhook(mockEventId, type, mockData);

    const updatedJob = await Job.findById(job._id);
    res.status(200).json({
      message: `Simulated event '${type}' processed successfully.`,
      jobStatus: updatedJob.status
    });
  } catch (err) {
    console.error(`Simulated webhook processing error: ${err.message}`);
    res.status(500).json({ error: `Simulation failed: ${err.message}` });
  }
});

/**
 * GET /api/unsubscribe
 * Confirms unsubscribing a subscriber via their unique token.
 * Renders a dark-themed confirmation HTML page.
 */
router.get('/api/unsubscribe', async (req, res) => {
  const { token, campaignId } = req.query;

  if (!token) {
    return res.status(400).send('<h1>Invalid Link</h1><p>Missing unsubscribe token.</p>');
  }

  try {
    const subscriber = await Subscriber.findOne({ unsubscribeToken: token });
    if (!subscriber) {
      return res.status(404).send('<h1>Not Found</h1><p>Subscriber unsubscribe link is invalid or expired.</p>');
    }

    // Mark as unsubscribed
    subscriber.status = 'unsubscribed';
    subscriber.unsubscribed = true;
    await subscriber.save();
    console.log(`[Webhook] Unsubscribed. Subscriber: ${subscriber._id}`);

    if (campaignId) {
      const campaign = await Campaign.findByIdAndUpdate(campaignId, {
        $inc: { totalUnsubscribed: 1 }
      });
      if (campaign) {
        console.log(`[Webhook] Unsubscribed (Campaign Updated). Campaign: ${campaignId} | Subscriber: ${subscriber._id}`);
      } else {
        console.warn(`[Webhook] Campaign not found for unsubscribe update: ${campaignId}`);
      }
    }

    // Render a high-quality confirmation page
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Unsubscribed Successfully - Mailtide</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
        <style>
          body {
            background-color: #0a0a0f;
            color: #e8e8f0;
            font-family: 'Inter', sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
          }
          .card {
            background-color: #111118;
            border: 1px solid #ffffff10;
            border-radius: 12px;
            padding: 40px;
            text-align: center;
            max-width: 400px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          }
          .icon {
            color: #7c6aff;
            font-size: 48px;
            margin-bottom: 20px;
          }
          h1 {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 12px;
            color: #e8e8f0;
          }
          p {
            color: #8888aa;
            font-size: 15px;
            line-height: 1.5;
            margin-bottom: 24px;
          }
          .badge {
            background-color: rgba(124, 106, 255, 0.1);
            color: #7c6aff;
            border: 1px solid rgba(124, 106, 255, 0.2);
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 500;
            display: inline-block;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✉️</div>
          <h1>Unsubscribed</h1>
          <p>You have been successfully removed from <strong>${subscriber.email}</strong>'s subscription list. You will no longer receive campaigns from this creator.</p>
          <div class="badge">Unsubscribed</div>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error(`Unsubscribe error: ${err.message}`);
    res.status(500).send('<h1>Server Error</h1><p>There was a problem processing your request. Please try again later.</p>');
  }
});

export default router;
