import Job from '../models/Job.js';
import Campaign from '../models/Campaign.js';
import Subscriber from '../models/Subscriber.js';
import WebhookEvent from '../models/WebhookEvent.js';

/**
 * Process verified Resend webhook events.
 * Implements strict idempotency using WebhookEvent collection.
 */
export const processResendWebhook = async (eventId, type, data) => {
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

  // 2. Correlation: Find the job using the Resend Email ID (resendId)
  const job = await Job.findOne({ resendId: emailId });
  if (!job) {
    console.warn(`[Webhook] Job not found for resendId: ${emailId}`);
    return;
  }

  const campaignId = job.campaignId;

  // 3. Process events
  switch (type) {
    case 'email.sent': {
      if (job.status === 'queued') {
        job.status = 'sent';
        await job.save();

        await Campaign.findByIdAndUpdate(campaignId, {
          $inc: { totalSent: 1 }
        });
        console.log(`[Webhook] Sent. Campaign: ${campaignId} | Subscriber: ${job.subscriberId}`);
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
        console.log(`[Webhook] Delivered. Campaign: ${campaignId} | Subscriber: ${job.subscriberId}`);
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
        console.log(`[Webhook] Opened. Campaign: ${campaignId} | Subscriber: ${job.subscriberId}`);
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
        console.log(`[Webhook] Clicked. Campaign: ${campaignId} | Subscriber: ${job.subscriberId}`);

        // If the email wasn't opened, mark it as opened
        if (!job.opened) {
          job.opened = true;
          job.openedAt = new Date();
          await job.save();
          await Campaign.findByIdAndUpdate(campaignId, {
            $inc: { totalOpened: 1 }
          });
          console.log(`[Webhook] Opened (via Clicked). Campaign: ${campaignId} | Subscriber: ${job.subscriberId}`);
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

        // Update subscriber status as single source of truth
        const subscriber = await Subscriber.findById(job.subscriberId);
        if (subscriber) {
          subscriber.status = 'bounced';
          subscriber.bounced = true;
          await subscriber.save();
          console.log(`[Webhook] Bounced. Campaign: ${campaignId} | Subscriber: ${job.subscriberId} (Subscriber status updated to bounced)`);
        } else {
          console.log(`[Webhook] Bounced. Campaign: ${campaignId} | Subscriber: ${job.subscriberId}`);
        }
      }
      break;
    }

    case 'email.complained': {
      // Complaints update Campaign analytics and Subscriber status, keeping Job status unchanged
      await Campaign.findByIdAndUpdate(campaignId, {
        $inc: { totalComplained: 1 }
      });
      console.log(`[Webhook] Complained (Campaign Updated). Campaign: ${campaignId} | Subscriber: ${job.subscriberId}`);

      // Update subscriber status as single source of truth
      const subscriber = await Subscriber.findById(job.subscriberId);
      if (subscriber) {
        subscriber.status = 'complained';
        await subscriber.save();
        console.log(`[Webhook] Complained. Campaign: ${campaignId} | Subscriber: ${job.subscriberId} (Subscriber status updated to complained)`);
      } else {
        console.log(`[Webhook] Complained. Campaign: ${campaignId} | Subscriber: ${job.subscriberId}`);
      }
      break;
    }

    default:
      console.log(`[Webhook] Unhandled event type: ${type}`);
  }
};
