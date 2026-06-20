import { verifyAccessToken } from '../utils/jwt.js';

let io;

export async function initSocket(httpServer) {
  let Server;
  try {
    ({ Server } = await import('socket.io'));
  } catch {
    // socket.io not installed — real-time notifications disabled
    return;
  }

  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173'];

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  // JWT auth handshake — reuses existing verifyAccessToken util
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = String(payload._id);
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    // Personal room for targeted notifications (invites, etc.)
    socket.join(`user:${socket.data.userId}`);

    socket.on('join:project', (projectId) => {
      if (typeof projectId === 'string') socket.join(`project:${projectId}`);
    });
    socket.on('leave:project', (projectId) => {
      if (typeof projectId === 'string') socket.leave(`project:${projectId}`);
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

export const EVENTS = {
  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',
  TASK_STATUS_CHANGED: 'task:status_changed',
  TASK_DELETED: 'task:deleted',
  COMMENT_CREATED: 'comment:created',
  NOTIFICATION_NEW: 'notification:new',
};
