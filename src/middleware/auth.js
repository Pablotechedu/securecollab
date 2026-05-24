import User from '../models/User.js';
import { verifyAccessToken } from '../utils/jwt.js';

const MAX_TOKEN_LENGTH = 2048;

async function auth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = header.slice(7);
  if (!token || token.length > MAX_TOKEN_LENGTH) {
    return res.status(401).json({ error: 'Invalid token format' });
  }

  try {
    const payload = verifyAccessToken(token);

    const user = await User.findById(payload._id).select('isActive role email').lean();
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Account is inactive or not found' });
    }

    req.user = { _id: payload._id, email: user.email, role: user.role };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export default auth;
