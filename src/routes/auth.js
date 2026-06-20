import { Router } from 'express';
import Joi from 'joi';
import User from '../models/User.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import validate from '../middleware/validate.js';
import logger from '../utils/logger.js';
import { loginLimit, registerLimit } from '../middleware/rateLimiters.js';
import { writeAuditLog } from '../utils/auditLogger.js';

const router = Router();

const registerSchema = Joi.object({
  name: Joi.string().max(100).required(),
  email: Joi.string().email().max(254).required(),
  password: Joi.string().min(8).max(72).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

const logoutSchema = Joi.object({
  refreshToken: Joi.string().optional(),
});

// POST /api/auth/register
router.post('/register', registerLimit, validate(registerSchema), async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email }).lean();
    if (existing) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const hashedPassword = await hashPassword(password);
    const user = new User({ name, email, password: hashedPassword, role: 'user' });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshTokens.push(refreshToken);
    await user.save();

    logger.info('User registered', { userId: user._id.toString() });
    writeAuditLog({ action: 'auth.register', actorId: user._id, resourceType: 'user', resourceId: user._id, req });

    return res.status(201).json({
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', loginLimit, validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      writeAuditLog({ action: 'auth.login.failure', metadata: { reason: 'user_not_found' }, req });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordMatch = await comparePassword(password, user.password);
    if (!passwordMatch) {
      writeAuditLog({ action: 'auth.login.failure', actorId: user._id, metadata: { reason: 'wrong_password' }, req });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshTokens.push(refreshToken);
    await user.save();

    logger.info('User logged in', { userId: user._id.toString() });
    writeAuditLog({ action: 'auth.login.success', actorId: user._id, resourceType: 'user', resourceId: user._id, req });

    return res.status(200).json({
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', validate(refreshSchema), async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const user = await User.findById(decoded._id);
    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Rotate: remove old, generate new pair
    user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    user.refreshTokens.push(newRefreshToken);
    await user.save();

    logger.info('Token refreshed', { userId: user._id.toString() });
    writeAuditLog({ action: 'auth.refresh', actorId: user._id, resourceType: 'user', resourceId: user._id, req });

    return res.status(200).json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', validate(logoutSchema), async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(204).send();
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      // Token is invalid/expired — treat as already logged out
      return res.status(204).send();
    }

    const user = await User.findById(decoded._id);
    if (user) {
      user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
      await user.save();
      logger.info('User logged out', { userId: user._id.toString() });
      writeAuditLog({ action: 'auth.logout', actorId: user._id, resourceType: 'user', resourceId: user._id, req });
    }

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
