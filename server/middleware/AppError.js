/**
 * Operational error class to format and throw errors with status codes
 */
class AppError extends Error {
  /**
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   */
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Flag for operational/known errors

    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
