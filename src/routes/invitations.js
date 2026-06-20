import { Router } from 'express';
import Invitation from '../models/Invitation.js';
import Organization from '../models/Organization.js';
import logger from '../utils/logger.js';
import { writeAuditLog } from '../utils/auditLogger.js';

const router = Router();

// POST /api/invitations/:id/accept
router.post('/:id/accept', async (req, res, next) => {
  try {
    const requesterId = req.user._id;

    const invitation = await Invitation.findById(req.params.id);
    if (!invitation || !invitation.inviteeId.equals(requesterId)) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (invitation.status !== 'pending') {
      return res.status(409).json({ error: 'Invitation is no longer pending' });
    }

    const org = await Organization.findById(invitation.orgId);
    if (!org) {
      invitation.status = 'rejected';
      await invitation.save();
      return res.status(404).json({ error: 'Organization not found' });
    }

    const alreadyMember = org.members.some((m) => m.userId.equals(requesterId));
    if (!alreadyMember) {
      org.members.push({ userId: requesterId, role: invitation.role });
      await org.save();
    }

    invitation.status = 'accepted';
    await invitation.save();

    logger.info('Invitation accepted', { invitationId: invitation._id.toString(), orgId: invitation.orgId.toString(), actorId: requesterId });
    writeAuditLog({ action: 'org.invite.accepted', actorId: requesterId, resourceType: 'organization', resourceId: invitation.orgId, metadata: { invitationId: invitation._id.toString(), role: invitation.role }, req });

    return res.status(200).json({ message: 'Invitation accepted' });
  } catch (err) {
    next(err);
  }
});

// POST /api/invitations/:id/reject
router.post('/:id/reject', async (req, res, next) => {
  try {
    const requesterId = req.user._id;

    const invitation = await Invitation.findById(req.params.id);
    if (!invitation || !invitation.inviteeId.equals(requesterId)) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (invitation.status !== 'pending') {
      return res.status(409).json({ error: 'Invitation is no longer pending' });
    }

    invitation.status = 'rejected';
    await invitation.save();

    logger.info('Invitation rejected', { invitationId: invitation._id.toString(), orgId: invitation.orgId.toString(), actorId: requesterId });
    writeAuditLog({ action: 'org.invite.rejected', actorId: requesterId, resourceType: 'organization', resourceId: invitation.orgId, metadata: { invitationId: invitation._id.toString() }, req });

    return res.status(200).json({ message: 'Invitation rejected' });
  } catch (err) {
    next(err);
  }
});

export default router;
