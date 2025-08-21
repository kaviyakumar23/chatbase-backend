const { ClerkExpressRequireAuth } = require('@clerk/express');

const requireAuth = ClerkExpressRequireAuth({
  secretKey: process.env.CLERK_SECRET_KEY,
});

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    req.auth = null;
    return next();
  }
  
  return requireAuth(req, res, next);
};

module.exports = {
  requireAuth,
  optionalAuth
};