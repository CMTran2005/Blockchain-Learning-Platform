/**
 * Error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Firestore errors
  if (err.code === 'PERMISSION_DENIED') {
    return res.status(403).json({
      message: 'Permission denied',
      error: err.message
    });
  }

  if (err.code === 'NOT_FOUND') {
    return res.status(404).json({
      message: 'Document not found',
      error: err.message
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation error',
      error: err.message,
      details: err.details
    });
  }

  // Blockchain errors
  if (err.code === 'NETWORK_ERROR' || err.code === 'SERVER_ERROR') {
    return res.status(503).json({
      message: 'Blockchain network error',
      error: err.message
    });
  }

  // Default error
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : {}
  });
};

module.exports = errorHandler;
