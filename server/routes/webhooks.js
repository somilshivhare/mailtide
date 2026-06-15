import { Router } from 'express';
import { Webhook } from 'standardwebhooks';
import Job from '../models/Job.js';
import Campaign from '../models/Campaign.js';
import Subscriber from '../models/Subscriber.js';

const router = Router();

/**
 * Shared helper to process Resend webhook events.
 */
const processWebhookEvent = async (type, data) => {
  const emailId = data?.email_id;
  if (!emailId) {
    return;
  }

  const job = await Job.findOne({ resendId: emailId });
  if (!job) {
    console.warn(`Webhook: Job not found for resendId: ${emailId}`);
    return;
  }

  const campaignId = job.campaignId;

  switch (type) {
    case 'email.delivered': {
      if (job.status !== 'delivered' && job.status !== 'opened' && job.status !== 'clicked') {
        job.status = 'delivered';
        await job.save();
        
        await Campaign.findByIdAndUpdate(campaignId, {
          $inc: { totalDelivered: 1 }
        });
      }
      break;
    }

    case 'email.opened': {
      if (!job.opened) {
        job.status = 'opened';
        job.opened = true;
        job.openedAt = new Date();
        await job.save();

        await Campaign.findByIdAndUpdate(campaignId, {
          $inc: { totalOpened: 1 }
        });
      }
      break;
    }

    case 'email.clicked': {
      const isFirstClick = !job.clicked;
      
      job.status = 'clicked';
      job.clicked = true;
      job.clickedAt = new Date();
      await job.save();

      if (isFirstClick) {
        await Campaign.findByIdAndUpdate(campaignId, {
          $inc: { totalClicked: 1 }
        });
        
        // Also set opened if it wasn't already (clicked implies opened)
        if (!job.opened) {
          job.opened = true;
          job.openedAt = new Date();
          await job.save();
          await Campaign.findByIdAndUpdate(campaignId, {
            $inc: { totalOpened: 1 }
          });
        }
      }
      break;
    }

    case 'email.bounced': {
      if (!job.bounced) {
        job.status = 'bounced';
        job.bounced = true;
        await job.save();

        await Campaign.findByIdAndUpdate(campaignId, {
          $inc: { totalBounced: 1 }
        });

        // Process subscriber bounce status
        const subscriber = await Subscriber.findById(job.subscriberId);
        if (subscriber) {
          const isSoftBounce = data?.bounce_type === 'Transient'; // Resend soft-bounce indicator
          
          if (!isSoftBounce) {
            // Hard bounce: mark invalid permanently
            subscriber.status = 'invalid';
            subscriber.bounced = true;
          } else {
            // Soft bounce: increment
            subscriber.softBounces += 1;
            if (subscriber.softBounces >= 3) {
              subscriber.status = 'invalid';
              subscriber.bounced = true;
            }
          }
          await subscriber.save();
        }
      }
      break;
    }

    default:
      console.log(`Webhook: Unhandled event type: ${type}`);
  }
};

/**
 * POST /api/webhooks/resend
 * Resend event webhooks.
 * Performs Svix signature validation if WEBHOOK_SECRET is set.
 */
router.post('/api/webhooks/resend', async (req, res) => {
  const webhookSecret = process.env.WEBHOOK_SECRET;

  if (webhookSecret) {
    const headers = req.headers;
    const payload = req.rawBody;

    if (!payload) {
      return res.status(400).json({ error: 'Missing raw request body required for signature verification' });
    }

    try {
      const wh = new Webhook(webhookSecret);
      wh.verify(payload, headers);
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }
  } else {
    console.warn('Warning: WEBHOOK_SECRET env var is missing. Webhooks are running in UNVERIFIED mode.');
  }

  // Acknowledge receipt 200 OK immediately
  res.sendStatus(200);

  const payload = req.body;
  if (!payload || !payload.type) {
    return;
  }

  // Process in the background
  try {
    await processWebhookEvent(payload.type, payload.data);
  } catch (err) {
    console.error(`Error processing webhook event in background: ${err.message}`);
  }
});

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

    await processWebhookEvent(type, mockData);

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
  const { token } = req.query;

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
