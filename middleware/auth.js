import { requireAuth as clerkRequireAuth } from '@clerk/express';

let requireAuthMiddleware = null;

const getRequireAuth = () => {
  if (!requireAuthMiddleware) {
    requireAuthMiddleware = clerkRequireAuth({
      secretKey: process.env.CLERK_SECRET_KEY,
    });
  }
  return requireAuthMiddleware;
};

const requireAuth = (req, res, next) => {
  return getRequireAuth()(req, res, next);
};

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    req.auth = null;
    return next();
  }
  
  return requireAuth(req, res, next);
};

export {
  requireAuth,
  optionalAuth
};