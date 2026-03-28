/**
 * 404 Not Found handler
 */
export function notFound(req, res) {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    path: req.path,
  });
}

/**
 * Global error handler
 */
export function errorHandler(err, req, res, next) {
  console.error('❌ Error:', err);

  // Database constraint errors
  if (err.code === '23505') {
    // Unique constraint violation
    const field = err.detail?.includes('email') ? 'email' : 'field';
    return res.status(409).json({
      error: 'Conflict',
      message: `This ${field} is already registered`,
    });
  }

  if (err.code === '23503') {
    // Foreign key violation
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Referenced resource not found',
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Token expired',
    });
  }

  // Default error
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    error: 'Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An error occurred' : message,
  });
}

/**
 * Async error wrapper
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
