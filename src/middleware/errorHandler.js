import logger from '../utils/logger.js';

function errorHandler(err, req, res, _next) {
  logger.error('Unhandled error', { message: err.message, path: req.path, method: req.method });

  if (err.name === 'ValidationError') {
    return res.status(422).json({ error: 'Validation failed' });
  }

  if (err.code === 11000) {
    return res.status(409).json({ error: 'Resource already exists' });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid resource ID' });
  }

  res.status(500).json({ error: 'Internal server error' });
}

export default errorHandler;
