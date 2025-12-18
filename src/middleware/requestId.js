const { v4: uuidv4 } = require('uuid');

const requestIdMiddleware = (req, res, next) => {
  // Use existing request ID from header or generate new one
  const requestId = req.headers['x-request-id'] || uuidv4();
  
  // Attach to request object
  req.id = requestId;
  req.requestId = requestId;
  
  // Add to response headers for tracing
  res.setHeader('X-Request-ID', requestId);
  
  next();
};

module.exports = { requestIdMiddleware };
