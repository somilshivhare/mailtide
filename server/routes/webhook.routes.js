import { Router } from 'express';
import * as webhookController from '../controllers/webhook.controller.js';

const router = Router();

// Endpoint will be exposed at /api/webhooks/resend
router.post('/resend', webhookController.handleResendWebhook);

export default router;
