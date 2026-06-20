import { RateLimiterMemory } from 'rate-limiter-flexible';
import { writeAuditLog } from '../utils/auditLogger.js';

// 5 login attempts per IP per 15 minutes
const loginRateLimiter = new RateLimiterMemory({
  keyPrefix: 'login',
  points: 5,
  duration: 900,
});

// 3 register attempts per IP per hour
const registerRateLimiter = new RateLimiterMemory({
  keyPrefix: 'register',
  points: 3,
  duration: 3600,
});

// 20 comments per user per minute
const commentRateLimiter = new RateLimiterMemory({
  keyPrefix: 'comment',
  points: 20,
  duration: 60,
});

// 5 invitations per user per 10 minutes
const inviteRateLimiter = new RateLimiterMemory({
  keyPrefix: 'invite',
  points: 5,
  duration: 600,
});

// 100 requests per user (or IP if unauthenticated) per minute
const generalRateLimiter = new RateLimiterMemory({
  keyPrefix: 'general',
  points: 100,
  duration: 60,
});

function makeRateLimitMiddleware(limiter, keyFn) {
  return async (req, res, next) => {
    const key = keyFn(req);
    try {
      await limiter.consume(key);
      next();
    } catch (rejRes) {
      const retryAfter = Math.ceil(rejRes.msBeforeNext / 1000) || 1;
      res.set('Retry-After', String(retryAfter));
      writeAuditLog({
        action: 'security.rate_limited',
        actorId: req.user?._id || null,
        metadata: { path: req.path, method: req.method },
        req,
      });
      return res.status(429).json({ error: 'Too many requests', retryAfter });
    }
  };
}

const loginLimit = makeRateLimitMiddleware(loginRateLimiter, (req) => req.ip);

const registerLimit = makeRateLimitMiddleware(registerRateLimiter, (req) => req.ip);

const commentLimit = makeRateLimitMiddleware(
  commentRateLimiter,
  (req) => req.user?._id?.toString() || req.ip,
);

const inviteLimit = makeRateLimitMiddleware(
  inviteRateLimiter,
  (req) => req.user?._id?.toString() || req.ip,
);

const generalLimit = makeRateLimitMiddleware(
  generalRateLimiter,
  (req) => req.user?._id?.toString() || req.ip,
);

export { loginLimit, registerLimit, commentLimit, inviteLimit, generalLimit };
