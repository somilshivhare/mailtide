import { Resend } from 'resend';
import BaseEmailProvider from './base.provider.js';

/**
 * Utility to strip HTML tags and generate readable plain-text fallback.
 */
function stripHtml(html) {
  if (!html) return '';
  
  let text = html;
  
  // Remove head, script, style tags and their contents
  text = text.replace(/<(head|script|style|title)[^>]*>[\s\S]*?<\/\1>/gi, '');
  
  // Replace block tags with newlines
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');
  
  // Strip remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');
  
  // Decode common HTML entities
  const entities = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'"
  };
  
  text = text.replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;|&apos;/g, (match) => entities[match] || match);
  
  // Normalize whitespace (trim, and reduce multiple newlines)
  text = text.trim()
             .replace(/[ \t]+/g, ' ')      // reduce multiple spaces/tabs to a single space
             .replace(/\n\s*\n\s*\n+/g, '\n\n'); // reduce 3+ newlines to 2 newlines
             
  return text;
}

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

    const maxRetries = 5;
    let attempt = 0;
    let delay = 1000; // base delay of 1 second

    while (attempt < maxRetries) {
      try {
        const sendParams = {
          from,
          to,
          subject,
          html,
          text: options.text || stripHtml(html)
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

        // Map optional file attachments.
        // Resend expects: [{ filename: 'file.pdf', content: Buffer }]
        if (options.attachments && Array.isArray(options.attachments) && options.attachments.length > 0) {
          sendParams.attachments = options.attachments;
          console.log(`[ResendProvider] Attaching ${options.attachments.length} file(s): ${options.attachments.map(a => a.filename).join(', ')}`);
        }

        // ── Diagnostic: log the API call with timestamp ──
        const requestTimestamp = new Date().toISOString();
        console.log(`[ResendProvider] [${requestTimestamp}] Sending request to Resend | attempt=${attempt + 1}/${maxRetries} | from="${from}" to="${to}" subject="${subject}"`);

        // Send the email (SDK returns { data, error })
        const { data, error } = await this.client.emails.send(sendParams);

        if (error) {
          const isRateLimit = 
            error.statusCode === 429 || 
            error.name === 'rate_limit_exceeded' || 
            (error.message && error.message.toLowerCase().includes('rate limit')) ||
            (error.message && error.message.toLowerCase().includes('too many requests'));

          if (isRateLimit && attempt < maxRetries - 1) {
            attempt++;
            const backoffDelay = delay * Math.pow(2, attempt) + Math.random() * 100;
            console.warn(`[ResendProvider] [${new Date().toISOString()}] RATE LIMIT HIT (429) | attempt=${attempt}/${maxRetries} | retrying in ${backoffDelay.toFixed(0)}ms | error="${error.message}"`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
            continue;
          }

          console.error(`[ResendProvider] [${new Date().toISOString()}] API error → ${error.message} (${error.name})`);
          return {
            messageId: null,
            success: false,
            error: {
              message: error.message,
              code: error.name || 'RESEND_API_ERROR'
            }
          };
        }

        console.log(`[ResendProvider] [${new Date().toISOString()}] API success → Resend message ID: ${data.id}`);
        return {
          messageId: data.id,
          success: true
        };
      } catch (networkError) {
        const isRateLimit = 
          networkError.status === 429 || 
          networkError.statusCode === 429 ||
          networkError.response?.status === 429 ||
          (networkError.message && networkError.message.toLowerCase().includes('rate limit')) ||
          (networkError.message && networkError.message.toLowerCase().includes('429'));

        if (isRateLimit && attempt < maxRetries - 1) {
          attempt++;
          const backoffDelay = delay * Math.pow(2, attempt) + Math.random() * 100;
          console.warn(`[ResendProvider] [${new Date().toISOString()}] RATE LIMIT NETWORK ERROR (429) | attempt=${attempt}/${maxRetries} | retrying in ${backoffDelay.toFixed(0)}ms | error="${networkError.message}"`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          continue;
        }

        // Capture unexpected network-level failures (e.g. DNS failure, connection timeout)
        console.error(`[ResendProvider] [${new Date().toISOString()}] Network error → ${networkError.message}`);
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
}

export default ResendProvider;
