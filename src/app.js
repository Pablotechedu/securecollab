import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

import authRouter from './routes/auth.js';
import orgsRouter from './routes/orgs.js';
import projectsRouter from './routes/projects.js';
import projectsByIdRouter from './routes/projectsById.js';
import tasksRouter from './routes/tasks.js';
import tasksByIdRouter from './routes/tasksById.js';
import commentsRouter from './routes/comments.js';
import commentsByIdRouter from './routes/commentsById.js';
import notificationsRouter from './routes/notifications.js';
import invitationsRouter from './routes/invitations.js';
import adminRouter from './routes/admin.js';
import errorHandler from './middleware/errorHandler.js';
import auth from './middleware/auth.js';
import { requireSystemRole } from './middleware/authorize.js';
import { generalLimit } from './middleware/rateLimiters.js';

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173'];

// Security headers
app.use(helmet());

// CORS allowlist
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Body parsing — 50kb limit prevents oversized payload attacks
app.use(express.json({ limit: '50kb' }));

// General rate limit — 100 req/min per user or IP
app.use(generalLimit);

// Public routes
app.use('/api/auth', authRouter);

// Authenticated routes
app.use('/api/orgs', auth, orgsRouter);
app.use('/api/orgs/:orgId/projects', auth, projectsRouter);
app.use('/api/projects', auth, projectsByIdRouter);
app.use('/api/projects/:projectId/tasks', auth, tasksRouter);
app.use('/api/tasks', auth, tasksByIdRouter);
app.use('/api/tasks/:taskId/comments', auth, commentsRouter);
app.use('/api/comments', auth, commentsByIdRouter);
app.use('/api/notifications', auth, notificationsRouter);
app.use('/api/invitations', auth, invitationsRouter);

// Admin — requires super_admin system role
app.use('/api/admin', auth, requireSystemRole('super_admin'), adminRouter);

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Centralized error handler — must be last, no stack traces to client
app.use(errorHandler);

export default app;
