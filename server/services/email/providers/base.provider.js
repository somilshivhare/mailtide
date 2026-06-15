/**
 * Abstract Base Class for Email Providers.
 * Establishes the standard interface that all Low-Level Providers must satisfy.
 */
class BaseEmailProvider {
  /**
   * Send an email. Must be implemented by subclasses.
   * @param {Object} params - The send request parameters
   * @param {string} params.to - Recipient email address
   * @param {string} params.subject - Email subject line
   * @param {string} params.html - HTML content of the email
   * @param {string} [params.from] - Sender email address
   * @param {Object} [params.options] - Extensible configuration options (tags, idempotency, etc.)
   * @returns {Promise<{ messageId: string, success: boolean }>} Unified internal response shape
   */
  async send(params) {
    throw new Error('Method "send()" must be implemented by concrete email provider subclasses.');
  }
}

export default BaseEmailProvider;
