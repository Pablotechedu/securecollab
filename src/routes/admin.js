import { Router } from 'express';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import logger from '../utils/logger.js';

const router = Router();

const MAX_USERS_PER_PAGE = 50;
const MAX_LOGS_PER_PAGE = 100;

// GET /api/admin/users
router.get('/users', async (req, res, next) => {
  try {
    const skip = Math.max(0, parseInt(req.query.skip, 10) || 0);
    const limit = Math.min(MAX_USERS_PER_PAGE, Math.max(1, parseInt(req.query.limit, 10) || MAX_USERS_PER_PAGE));

    const [users, total] = await Promise.all([
      User.find({}).skip(skip).limit(limit).lean(),
      User.countDocuments({}),
    ]);

    // Strip sensitive fields from the lean results (toJSON is not called on lean)
    const sanitized = users.map(({ password: _p, refreshTokens: _r, ...rest }) => rest);

    return res.status(200).json({ users: sanitized, total });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/users/:id/deactivate
router.patch('/users/:id/deactivate', async (req, res, next) => {
  try {
    const requesterId = req.user._id;

    const target = await User.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Cannot deactivate self
    if (target._id.equals(requesterId)) {
      return res.status(403).json({ error: 'Cannot deactivate your own account' });
    }

    // Cannot deactivate another super_admin
    if (target.role === 'super_admin') {
      return res.status(403).json({ error: 'Cannot deactivate a super admin' });
    }

    target.isActive = false;
    await target.save();
    logger.info('User deactivated', { targetUserId: target._id.toString(), actorId: requesterId });

    return res.status(200).json({ message: 'User deactivated' });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/audit-logs
router.get('/audit-logs', async (req, res, next) => {
  try {
    const skip = Math.max(0, parseInt(req.query.skip, 10) || 0);
    const limit = Math.min(MAX_LOGS_PER_PAGE, Math.max(1, parseInt(req.query.limit, 10) || MAX_LOGS_PER_PAGE));
    const { action } = req.query;

    const filter = {};
    if (action && typeof action === 'string' && action.trim()) {
      filter.action = action.trim();
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(filter),
    ]);

    return res.status(200).json({ logs, total });
  } catch (err) {
    next(err);
  }
});

export default router;
