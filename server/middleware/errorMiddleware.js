import AppError from './AppError.js';

/**
 * Global Express error handling middleware
 */
const errorMiddleware = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log unexpected errors (500) or non-operational errors
  if (err.statusCode === 500 || !err.isOperational) {
    console.error('ERROR 💥:', {
      message: err.message,
      stack: err.stack,
      path: req.originalUrl,
      method: req.method
    });
  }

  // Handle development vs production response
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  } else {
    // Production response
    if (err.isOperational) {
      // Operational, trusted error: send message to client
      res.status(err.statusCode).json({
        status: err.status,
        error: err.message
      });
    } else {
      // Programming or other unknown error: don't leak details
      res.status(500).json({
        status: 'error',
        error: 'Something went wrong on the server'
      });
    }
  }
};

export default errorMiddleware;
export { AppError };
