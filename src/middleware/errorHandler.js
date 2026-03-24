function errorHandler(err, req, res, next) {
  // Joi validation errors
  if (err.isJoi) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.details.map(d => d.message),
    });
  }

  // Custom app errors with status code
  if (err.status) {
    return res.status(err.status).json({
      error: err.message,
    });
  }

  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map(e => e.message),
    });
  }

  // Default 500
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
  });
}

module.exports = errorHandler;
