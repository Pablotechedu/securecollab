import { Router } from 'express';
import Notification from '../models/Notification.js';

const router = Router();

// GET /api/notifications — returns only the requesting user's notifications (no IDOR)
router.get('/', async (req, res, next) => {
  try {
    const requesterId = req.user._id;
    const notifications = await Notification.find({ recipientId: requesterId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    return res.status(200).json({ notifications });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/read-all — must come before /:id/read to avoid route conflict
router.patch('/read-all', async (req, res, next) => {
  try {
    const requesterId = req.user._id;
    await Notification.updateMany({ recipientId: requesterId, read: false }, { $set: { read: true } });
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res, next) => {
  try {
    const requesterId = req.user._id;
    const notification = await Notification.findOne({ _id: req.params.id, recipientId: requesterId });
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    notification.read = true;
    await notification.save();
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
