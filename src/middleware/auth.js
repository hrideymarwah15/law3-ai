const { supabase, supabaseAdmin, createAuthenticatedClient } = require('../config/supabase');
const { UnauthorizedError, ForbiddenError } = require('./errorHandler');
const logger = require('../config/logger');

/**
 * Verify Supabase JWT token and attach user to request
 */
const supabaseAuthMiddleware = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.warn({ 
        message: 'Invalid token', 
        error: error?.message,
        requestId: req.id 
      });
      throw new UnauthorizedError('Invalid or expired token');
    }

    // Fetch user profile from database
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      logger.warn({ 
        message: 'User profile not found', 
        userId: user.id,
        requestId: req.id 
      });
      throw new UnauthorizedError('User profile not found');
    }

    // Check if user is active
    if (!profile.is_active) {
      throw new ForbiddenError('Account is deactivated');
    }

    // Attach user data to request
    req.user = {
      id: user.id,
      email: user.email,
      phone: user.phone,
      ...profile,
      authUser: user,
    };
    req.token = token;

    // Create authenticated Supabase client for this user
    req.supabase = createAuthenticatedClient(token);

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      return next(error);
    }
    logger.error({ 
      message: 'Auth middleware error', 
      error: error.message,
      requestId: req.id 
    });
    next(new UnauthorizedError('Authentication failed'));
  }
};

/**
 * Optional auth - allows unauthenticated requests but attaches user if token exists
 */
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    // Try to verify token
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      req.user = null;
      return next();
    }

    // Fetch user profile
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profile && profile.is_active) {
      req.user = {
        id: user.id,
        email: user.email,
        phone: user.phone,
        ...profile,
        authUser: user,
      };
      req.token = token;
      req.supabase = createAuthenticatedClient(token);
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    // On any error, just continue without user
    req.user = null;
    next();
  }
};

/**
 * Role-based access control middleware
 */
const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn({
        message: 'Access denied - insufficient role',
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        requestId: req.id,
      });
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
};

/**
 * Verify user owns the resource or is admin
 */
const ownershipMiddleware = (getOwnerId) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new UnauthorizedError('Authentication required'));
      }

      // Admins can access anything
      if (req.user.role === 'admin') {
        return next();
      }

      const ownerId = await getOwnerId(req);
      
      if (ownerId !== req.user.id) {
        return next(new ForbiddenError('You do not have permission to access this resource'));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  supabaseAuthMiddleware,
  optionalAuthMiddleware,
  roleMiddleware,
  ownershipMiddleware,
};
