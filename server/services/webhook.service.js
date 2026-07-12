import Job from '../models/Job.js';
import Campaign from '../models/Campaign.js';
import Subscriber from '../models/Subscriber.js';
import WebhookEvent from '../models/WebhookEvent.js';

/**
 * Process verified Resend webhook events.
 * Implements strict idempotency using WebhookEvent collection.
 */
export const processResendWebhook = async (eventId, type, data) => {
  console.log(`[Webhook] Event type: ${type}`);

  // 1. Idempotency Check: Save eventId to DB. If it fails with duplicate key error, ignore.
  try {
    await WebhookEvent.create({ eventId });
    console.log(`[Webhook] Signature verified & event recorded. Event ID: ${eventId}`);
  } catch (err) {
    if (err.code === 11000) {
      console.log(`[Webhook] Duplicate event ignored. Event ID: ${eventId}`);
      return;
    }
    throw err;
  }

  const emailId = data?.email_id;
  if (!emailId) {
    console.warn(`[Webhook] Missing email_id in event data. Event ID: ${eventId}`);
    return;
  }
  console.log(`[Webhook] Resend Email ID: ${emailId}`);

  // 2. Correlation: Find the job using the Resend Email ID (resendId)
  const job = await Job.findOne({ resendId: emailId });
  if (!job) {
    console.warn(`[Webhook] Job not found for resendId: ${emailId}`);
    return;
  }
  console.log(`[Webhook] Job found. Job ID: ${job._id} | Campaign: ${job.campaignId} | Subscriber: ${job.subscriberId}`);

  const campaignId = job.campaignId;
  console.log(`[Webhook] Campaign found: ${campaignId}`);

  // 3. Process events
  switch (type) {
    case 'email.sent': {
      if (job.status === 'queued') {
        job.status = 'sent';
        await job.save();

        await Campaign.findByIdAndUpdate(campaignId, {
          $inc: { totalSent: 1 }
        });
        console.log(`[Webhook] Analytics updated: email.sent. Campaign: ${campaignId} | Subscriber: ${job.subscriberId}`);
      }
      break;
    }

    case 'email.delivered': {
      if (job.status !== 'delivered' && job.status !== 'opened' && job.status !== 'clicked') {
        job.status = 'delivered';
        await job.save();

        await Campaign.findByIdAndUpdate(campaignId, {
          $inc: { totalDelivered: 1 }
        });
        console.log(`[Webhook] Analytics updated: email.delivered. Campaign: ${campaignId} | Subscriber: ${job.subscriberId}`);
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
        console.log(`[Webhook] Analytics updated: email.opened. Campaign: ${campaignId} | Subscriber: ${job.subscriberId}`);
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
        console.log(`[Webhook] Analytics updated: email.clicked. Campaign: ${campaignId} | Subscriber: ${job.subscriberId}`);

        // If the email wasn't opened, mark it as opened
        if (!job.opened) {
          job.opened = true;
          job.openedAt = new Date();
          await job.save();
          await Campaign.findByIdAndUpdate(campaignId, {
            $inc: { totalOpened: 1 }
          });
          console.log(`[Webhook] Analytics updated: email.opened (via Clicked). Campaign: ${campaignId} | Subscriber: ${job.subscriberId}`);
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
        console.log(`[Webhook] Analytics updated: email.bounced. Campaign: ${campaignId} | Subscriber: ${job.subscriberId}`);

        // Update subscriber status as single source of truth
        const subscriber = await Subscriber.findById(job.subscriberId);
        if (subscriber) {
          console.log(`[Webhook] Subscriber found: ${job.subscriberId}`);
          subscriber.status = 'bounced';
          subscriber.bounced = true;
          await subscriber.save();
          console.log(`[Webhook] Subscriber status updated: bounced. Subscriber: ${job.subscriberId}`);
        } else {
          console.warn(`[Webhook] Subscriber not found: ${job.subscriberId}`);
        }
      }
      break;
    }

    case 'email.complained': {
      // Complaints update Campaign analytics and Subscriber status, keeping Job status unchanged
      await Campaign.findByIdAndUpdate(campaignId, {
        $inc: { totalComplained: 1 }
      });
      console.log(`[Webhook] Analytics updated: email.complained. Campaign: ${campaignId} | Subscriber: ${job.subscriberId}`);

      // Update subscriber status as single source of truth
      const subscriber = await Subscriber.findById(job.subscriberId);
      if (subscriber) {
        console.log(`[Webhook] Subscriber found: ${job.subscriberId}`);
        subscriber.status = 'complained';
        await subscriber.save();
        console.log(`[Webhook] Subscriber status updated: complained. Subscriber: ${job.subscriberId}`);
      } else {
        console.warn(`[Webhook] Subscriber not found: ${job.subscriberId}`);
      }
      break;
    }

    default:
      console.log(`[Webhook] Unhandled event type: ${type}`);
  }
};
