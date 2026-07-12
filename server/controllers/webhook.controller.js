import { Webhook } from 'standardwebhooks';
import * as webhookService from '../services/webhook.service.js';

/**
 * Handle incoming Resend webhook events.
 * Performs Svix-compatible signature verification, validates payload,
 * returns HTTP 200 immediately, and delegates processing to service layer.
 */
export const handleResendWebhook = async (req, res) => {
  console.log('[Webhook] Webhook request received');

  // Log incoming request headers (temporary debugging only, excluding secrets)
  console.log('[Webhook Debug] Incoming Request Headers:');
  Object.keys(req.headers).forEach(key => {
    const isSecret = key.toLowerCase().includes('authorization') || key.toLowerCase().includes('secret') || key.toLowerCase().includes('cookie') || key.toLowerCase().includes('key');
    console.log(`  - ${key}: ${isSecret ? '***hidden***' : req.headers[key]}`);
  });

  const svixId = req.headers['svix-id'];
  const svixTimestamp = req.headers['svix-timestamp'];
  const svixSignature = req.headers['svix-signature'];

  console.log(`[Webhook Debug] Presence of signature headers:`);
  console.log(`  - svix-id: ${!!svixId}`);
  console.log(`  - svix-timestamp: ${!!svixTimestamp}`);
  console.log(`  - svix-signature: ${!!svixSignature}`);
  console.log(`  - Webhook ID: ${svixId}`);
  console.log(`  - Timestamp: ${svixTimestamp}`);

  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[Webhook] RESEND_WEBHOOK_SECRET is not configured on the server');
    return res.status(500).json({ error: 'Webhook secret is not configured' });
  }

  const payload = req.rawBody;

  if (!payload) {
    console.warn('[Webhook] Missing raw body required for signature verification');
    return res.status(400).json({ error: 'Missing raw request body required for signature verification' });
  }

  // 1. Verify signature using standardwebhooks package mapped headers
  const webhookHeaders = {
    'webhook-id': svixId || req.headers['webhook-id'],
    'webhook-timestamp': svixTimestamp || req.headers['webhook-timestamp'],
    'webhook-signature': svixSignature || req.headers['webhook-signature']
  };

  try {
    const wh = new Webhook(webhookSecret);
    wh.verify(payload, webhookHeaders);
    console.log('[Webhook] Signature verified');
  } catch (err) {
    console.error(`[Webhook] Signature verification failed: ${err.message}`);
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  const body = req.body;
  if (!body || !body.type || !body.data) {
    console.warn('[Webhook] Malformed webhook payload structure');
    return res.status(400).json({ error: 'Malformed webhook payload' });
  }

  const eventId = body.id || headers['svix-id'];
  if (!eventId) {
    console.warn('[Webhook] Webhook event ID missing');
    return res.status(400).json({ error: 'Missing event ID' });
  }

  // Handle only specified events
  const supportedEvents = [
    'email.sent',
    'email.delivered',
    'email.opened',
    'email.clicked',
    'email.bounced',
    'email.complained'
  ];

  if (!supportedEvents.includes(body.type)) {
    console.log(`[Webhook] Event type ignored: ${body.type}`);
    return res.status(200).json({ message: 'Event ignored' });
  }

  // 2. Acknowledge receipt 200 OK immediately
  res.status(200).json({ message: 'Webhook received' });

  // 3. Process business logic asynchronously
  try {
    webhookService.processResendWebhook(eventId, body.type, body.data).catch((err) => {
      console.error(`[Webhook] Error in async service processing: ${err.message}`);
    });
  } catch (err) {
    console.error(`[Webhook] Async service call failed: ${err.message}`);
  }
};
