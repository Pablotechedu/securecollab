import AuditLog from '../models/AuditLog.js';
import logger from './logger.js';

async function writeAuditLog({ action, actorId = null, resourceType = null, resourceId = null, metadata = {}, req }) {
  try {
    await AuditLog.create({
      action,
      actorId,
      resourceType,
      resourceId,
      metadata,
      ip: req?.ip || null,
      userAgent: req?.get('user-agent') || null,
      timestamp: new Date(),
    });
  } catch (err) {
    logger.error('Failed to write audit log', { action, error: err.message });
  }
}

export { writeAuditLog };
