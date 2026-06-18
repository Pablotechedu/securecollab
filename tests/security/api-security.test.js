import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../src/app.js';
import User from '../../src/models/User.js';
import Project from '../../src/models/Project.js';
import Task from '../../src/models/Task.js';
import { generateAccessToken } from '../../src/utils/jwt.js';

const TEST_DB =
  process.env.MONGODB_URI_TEST ?? 'mongodb://127.0.0.1:27017/securecollab_test';

beforeAll(async () => {
  await mongoose.connect(TEST_DB);
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  for (const col of Object.values(mongoose.connection.collections)) {
    await col.deleteMany({});
  }
});

// ─── 1. Auth Bypass ────────────────────────────────────────────────────────
// Attack: access a protected endpoint without any token.
// Defence: auth middleware rejects missing/malformed Authorization header.
describe('Auth Bypass', () => {
  test('unauthenticated request to protected endpoint returns 401', async () => {
    const res = await request(app).get('/api/admin/users');
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });
});

// ─── 2. NoSQL Injection ────────────────────────────────────────────────────
// Attack: send a MongoDB query operator ({$gt:""}) in an email field.
// Defence: Joi schema enforces string type before the handler runs.
// NOTE: uses POST /api/auth/register to avoid touching the login rate-limit
// quota needed by test 3.
describe('Injection Prevention (NoSQL)', () => {
  test('NoSQL injection object in email field is rejected with 422', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Attacker', email: { $gt: '' }, password: 'ValidPass1!' });
    expect(res.status).toBe(422);
  });
});

// ─── 3. Brute Force ────────────────────────────────────────────────────────
// Attack: hammer the login endpoint with repeated credential guesses.
// Defence: loginLimit (5 req / 15 min per IP) returns 429 + Retry-After.
// IMPORTANT: this test must run after tests 1-2, which do NOT consume the
// login rate-limit quota for 127.0.0.1, so the limiter starts at 5 points.
describe('Brute Force Protection', () => {
  test('sixth consecutive login attempt from the same IP returns 429', async () => {
    const creds = { email: 'victim@example.com', password: 'WrongPass1!' };

    // Attempts 1–5: user does not exist → 401 (login quota consumed each time)
    for (let i = 0; i < 5; i++) {
      const r = await request(app).post('/api/auth/login').send(creds);
      expect(r.status).toBe(401);
    }

    // Attempt 6: quota exhausted → rate limiter returns 429
    const res = await request(app).post('/api/auth/login').send(creds);
    expect(res.status).toBe(429);
    expect(res.headers['retry-after']).toBeDefined();
  });
});

// ─── 4. IDOR ───────────────────────────────────────────────────────────────
// Attack: User B uses their own valid JWT to read a task in a project they
// are not a member of (referencing User A's resource by ID).
// Defence: canReadTask checks project membership; returns 403 if not a member.
describe('IDOR Prevention', () => {
  test('user outside project membership cannot read a project task (403)', async () => {
    const userA = await User.create({
      email: 'usera@test.com',
      password: 'placeholder-hash',
      name: 'User A',
    });
    const userB = await User.create({
      email: 'userb@test.com',
      password: 'placeholder-hash',
      name: 'User B',
    });

    // Project where only User A is a member
    const project = await Project.create({
      name: 'Secret Project',
      orgId: new mongoose.Types.ObjectId(),
      members: [{ userId: userA._id, role: 'developer' }],
    });

    const task = await Task.create({
      title: 'Confidential Task',
      projectId: project._id,
      reporterId: userA._id,
    });

    // Valid JWT for User B — but B is not in the project
    const tokenB = generateAccessToken({
      _id: userB._id.toString(),
      email: userB.email,
      role: userB.role,
    });

    const res = await request(app)
      .get(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(403);
  });
});

// ─── 5. Privilege Escalation ───────────────────────────────────────────────
// Attack: a viewer role member tries to create a task (action restricted to
// developer / project_admin roles).
// Defence: canCreateTask policy returns false for viewer → 403.
describe('Privilege Escalation Prevention', () => {
  test('viewer role cannot create tasks in a project (403)', async () => {
    const viewer = await User.create({
      email: 'viewer@test.com',
      password: 'placeholder-hash',
      name: 'Viewer',
    });

    const project = await Project.create({
      name: 'Test Project',
      orgId: new mongoose.Types.ObjectId(),
      members: [{ userId: viewer._id, role: 'viewer' }],
    });

    const viewerToken = generateAccessToken({
      _id: viewer._id.toString(),
      email: viewer.email,
      role: viewer.role,
    });

    const res = await request(app)
      .post(`/api/projects/${project._id}/tasks`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ title: 'Unauthorized Task', priority: 'medium' });

    expect(res.status).toBe(403);
  });
});
