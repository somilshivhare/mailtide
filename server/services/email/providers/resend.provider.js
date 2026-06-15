import { Resend } from 'resend';
import BaseEmailProvider from './base.provider.js';

/**
 * Concrete implementation of the Email Provider using the Resend SDK.
 */
class ResendProvider extends BaseEmailProvider {
  constructor() {
    super();
    const apiKey = process.env.RESEND_API_KEY;
    // Check if we should fall back to mock mode
    this.isMockMode = !apiKey || apiKey.includes('...') || apiKey === 're_';
    this.client = null;

    if (!this.isMockMode) {
      try {
        this.client = new Resend(apiKey);
      } catch (err) {
        console.warn(`Resend failed to initialize: ${err.message}. Running in mock mode.`);
        this.isMockMode = true;
      }
    } else {
      console.log('RESEND_API_KEY is not set or is a placeholder. Resend Provider running in MOCK mode.');
    }
  }

  /**
   * Sends an email via Resend SDK or Mock fallback.
   */
  async send({ to, subject, html, from, options = {} }) {
    if (this.isMockMode || !this.client) {
      console.log(`[MOCK EMAIL] From: ${from} | To: ${to} | Subject: ${subject}`);
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 100));
      return {
        messageId: `mock_re_${Math.random().toString(36).substr(2, 9)}`,
        success: true
      };
    }

    try {
      const sendParams = {
        from,
        to,
        subject,
        html
      };

      // Map optional idempotency key
      if (options.idempotencyKey) {
        sendParams.idempotencyKey = options.idempotencyKey;
      }

      // Map optional tracking tags.
      // Resend expects tags in shape: [{ name: 'key', value: 'val' }]
      if (options.tags) {
        if (Array.isArray(options.tags)) {
          sendParams.tags = options.tags;
        } else if (typeof options.tags === 'object') {
          sendParams.tags = Object.entries(options.tags).map(([name, value]) => ({
            name,
            value: String(value)
          }));
        }
      }

      // Send the email (SDK returns { data, error })
      const { data, error } = await this.client.emails.send(sendParams);

      if (error) {
        console.error(`Resend API Error: ${error.message} (${error.name})`);
        return {
          messageId: null,
          success: false,
          error: {
            message: error.message,
            code: error.name || 'RESEND_API_ERROR'
          }
        };
      }

      return {
        messageId: data.id,
        success: true
      };
    } catch (networkError) {
      // Capture unexpected network-level failures (e.g. DNS failure, connection timeout)
      console.error(`Resend Provider Network Error: ${networkError.message}`);
      return {
        messageId: null,
        success: false,
        error: {
          message: networkError.message,
          code: 'NETWORK_ERROR'
        }
      };
    }
  }
}

export default ResendProvider;
