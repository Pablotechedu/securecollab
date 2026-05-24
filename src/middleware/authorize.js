import { writeAuditLog } from '../utils/auditLogger.js';

function requireSystemRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      writeAuditLog({
        action: 'security.unauthorized',
        actorId: req.user._id,
        metadata: { path: req.path, method: req.method, requiredRoles: roles },
        req,
      });
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

export { requireSystemRole };
