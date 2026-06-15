/**
 * High-Level Domain Email Service.
 * Decoupled from lower-level provider implementations using Dependency Injection.
 */
class EmailService {
  /**
   * @param {BaseEmailProvider} provider - Concrete email provider implementation
   */
  constructor(provider) {
    if (!provider) {
      throw new Error('EmailService must be initialized with a concrete Email Provider.');
    }
    this.provider = provider;
  }

  /**
   * Gets the default sender email address configured in the environment.
   * @returns {string} Sender email string
   */
  getSender() {
    return process.env.SENDER_EMAIL || 'MailFlow <onboarding@resend.dev>';
  }

  /**
   * Sends a bulk email campaign.
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject line
   * @param {string} html - Personalised email body
   * @param {Object} [options] - Scheduling, tags, or idempotency keys
   * @returns {Promise<{ messageId: string, success: boolean, error?: Object }>}
   */
  async sendCampaignEmail(to, subject, html, options = {}) {
    return this.provider.send({
      from: this.getSender(),
      to,
      subject,
      html,
      options
    });
  }

  /**
   * Sends a welcome email to a new subscriber or user.
   * @param {string} to - Recipient email
   * @param {string} name - Subscriber's name
   * @returns {Promise<{ messageId: string, success: boolean, error?: Object }>}
   */
  async sendWelcomeEmail(to, name) {
    const subject = `Welcome to MailFlow, ${name}!`;
    const html = `
      <div style="font-family: 'Inter', sans-serif; color: #111118; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #7c6aff; font-size: 24px; font-weight: 600;">Welcome, ${name}!</h1>
        <p>Thank you for subscribing to our updates. We're excited to have you on board!</p>
        <p>From now on, you'll be the first to receive our newsletters, campaign launches, and exclusive announcements.</p>
        <hr style="border: 0; border-top: 1px solid #ffffff15; margin: 20px 0;" />
        <p style="font-size: 12px; color: #8888aa;">If you received this email in error, you can unsubscribe at any time.</p>
      </div>
    `;
    return this.provider.send({
      from: this.getSender(),
      to,
      subject,
      html
    });
  }

  /**
   * Sends a transactional password reset email to a user.
   * @param {string} to - Recipient email
   * @param {string} resetUrl - Password reset redirect link
   * @returns {Promise<{ messageId: string, success: boolean, error?: Object }>}
   */
  async sendPasswordResetEmail(to, resetUrl) {
    const subject = 'Reset Your MailFlow Password';
    const html = `
      <div style="font-family: 'Inter', sans-serif; color: #111118; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #7c6aff; font-size: 24px; font-weight: 600;">Reset Your Password</h1>
        <p>You are receiving this because you (or someone else) requested a password reset for your MailFlow account.</p>
        <p>Please click the button below to complete the password reset process. This link is valid for 1 hour:</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${resetUrl}" style="background-color: #7c6aff; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">Reset Password</a>
        </div>
        <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
        <hr style="border: 0; border-top: 1px solid #ffffff15; margin: 20px 0;" />
        <p style="font-size: 12px; color: #8888aa;">This link will expire automatically in 60 minutes.</p>
      </div>
    `;
    return this.provider.send({
      from: this.getSender(),
      to,
      subject,
      html
    });
  }
}

export default EmailService;
