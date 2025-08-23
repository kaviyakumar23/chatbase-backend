import { getAuth } from '@clerk/express';

const requireAuth = (req, res, next) => {
  try {
    const auth = getAuth(req);
    
    if (!auth.userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'UNAUTHORIZED'
      });
    }
    
    // Attach user info to request for use in controllers
    req.user = {
      id: auth.userId,
      sessionId: auth.sessionId,
      sessionClaims: auth.sessionClaims
    };
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'UNAUTHORIZED'
    });
  }
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