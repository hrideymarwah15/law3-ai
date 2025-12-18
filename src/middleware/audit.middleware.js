/**
 * Audit Middleware
 * Automatically logs API requests and actions for audit trail
 */

const { auditService, AuditActions } = require('../services/audit.service');

/**
 * Get client IP address from request
 */
const getClientIp = (req) => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    'unknown'
  );
};

/**
 * Get user agent from request
 */
const getUserAgent = (req) => {
  return req.headers['user-agent'] || 'unknown';
};

/**
 * Middleware to attach audit helper to request
 * Usage: req.audit.log({ action: AuditActions.USER_LOGIN, entityType: 'user', entityId: user.id })
 */
const auditMiddleware = (req, res, next) => {
  // Attach audit helper to request
  req.audit = {
    /**
     * Log an audit event with request context
     */
    log: async (params) => {
      await auditService.log({
        ...params,
        userId: params.userId || req.user?.id || null,
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
      });
    },

    /**
     * Quick log methods for common actions
     */
    userLogin: (userId) => {
      return auditService.log({
        action: AuditActions.USER_LOGIN,
        userId,
        entityType: 'user',
        entityId: userId,
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
      });
    },

    userLogout: () => {
      return auditService.log({
        action: AuditActions.USER_LOGOUT,
        userId: req.user?.id,
        entityType: 'user',
        entityId: req.user?.id,
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
      });
    },

    profileUpdate: (oldData, newData) => {
      return auditService.log({
        action: AuditActions.USER_PROFILE_UPDATE,
        userId: req.user?.id,
        entityType: 'user',
        entityId: req.user?.id,
        oldData,
        newData,
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
      });
    },
  };

  next();
};

/**
 * Create an audit log decorator for controller methods
 * @param {string} action - Action type from AuditActions
 * @param {Function} getEntityInfo - Function to extract entity info from req/res
 */
const withAudit = (action, getEntityInfo = null) => {
  return (originalMethod) => {
    return async function (req, res, next) {
      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json to capture response and log audit
      res.json = async function (data) {
        // Only log successful responses
        if (data.success !== false && res.statusCode < 400) {
          try {
            const entityInfo = getEntityInfo 
              ? getEntityInfo(req, data) 
              : {};

            await auditService.log({
              action,
              userId: req.user?.id,
              entityType: entityInfo.entityType || null,
              entityId: entityInfo.entityId || null,
              oldData: entityInfo.oldData || null,
              newData: entityInfo.newData || null,
              ipAddress: getClientIp(req),
              userAgent: getUserAgent(req),
            });
          } catch (auditError) {
            // Don't fail the request if audit logging fails
            console.error('Audit logging failed:', auditError);
          }
        }

        // Call original json method
        return originalJson(data);
      };

      // Call original controller method
      return originalMethod.call(this, req, res, next);
    };
  };
};

/**
 * Middleware to log specific route actions
 * Usage: router.post('/login', auditAction(AuditActions.USER_LOGIN, 'user'), controller.login)
 */
const auditAction = (action, entityType = null) => {
  return (req, res, next) => {
    // Store original json
    const originalJson = res.json.bind(res);

    res.json = async function (data) {
      // Log successful actions
      if (data.success !== false && res.statusCode < 400) {
        const entityId = data.user?.id || data.data?.id || req.params.id || null;

        await auditService.log({
          action,
          userId: req.user?.id || data.user?.id,
          entityType,
          entityId,
          newData: data.data || data.user || null,
          ipAddress: getClientIp(req),
          userAgent: getUserAgent(req),
        });
      }

      return originalJson(data);
    };

    next();
  };
};

module.exports = {
  auditMiddleware,
  withAudit,
  auditAction,
  getClientIp,
  getUserAgent,
};
