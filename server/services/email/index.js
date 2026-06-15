import ResendProvider from './providers/resend.provider.js';
import EmailService from './email.service.js';

// 1. Instantiate the active provider (defaults to Resend)
const defaultProvider = new ResendProvider();

// 2. Inject the provider into the EmailService instance (Dependency Injection)
const emailService = new EmailService(defaultProvider);

// Export the singleton service
export default emailService;
export { emailService, defaultProvider as emailProvider };
