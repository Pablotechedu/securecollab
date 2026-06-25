import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../src/app.js';
import User from '../../src/models/User.js';
import Project from '../../src/models/Project.js';
import Task from '../../src/models/Task.js';
import Comment from '../../src/models/Comment.js';
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

// Helper: build an archived project owned (project_admin) by the given user,
// with a task and a comment authored by that same user.
async function seedArchivedScenario() {
  const admin = await User.create({
    email: 'admin@test.com',
    password: 'placeholder-hash',
    name: 'Project Admin',
  });

  const project = await Project.create({
    name: 'Archived Project',
    orgId: new mongoose.Types.ObjectId(),
    visibility: 'internal',
    status: 'archived',
    members: [{ userId: admin._id, role: 'project_admin' }],
  });

  const task = await Task.create({
    title: 'Some Task',
    projectId: project._id,
    reporterId: admin._id,
    assigneeId: admin._id,
  });

  const comment = await Comment.create({
    taskId: task._id,
    authorId: admin._id,
    body: 'Original comment',
  });

  const token = generateAccessToken({
    _id: admin._id.toString(),
    email: admin.email,
    role: admin.role,
  });

  return { admin, project, task, comment, token };
}

// ─── Rule 4: archived project is immutable (content + comments) ──────────────
// The demo claims "un proyecto archivado no se puede editar ni comentar".
// Comment CREATE is already blocked; these tests cover the edit/delete and
// project-edit paths that were missing the archived guard.
describe('Archived project — comment edit/delete blocked', () => {
  test('author cannot EDIT a comment on an archived project (403)', async () => {
    const { comment, token } = await seedArchivedScenario();

    const res = await request(app)
      .put(`/api/comments/${comment._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'Edited comment' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Project is archived');
  });

  test('author cannot DELETE a comment on an archived project (403)', async () => {
    const { comment, token } = await seedArchivedScenario();

    const res = await request(app)
      .delete(`/api/comments/${comment._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Project is archived');
  });
});

describe('Archived project — task deletion blocked', () => {
  test('project_admin cannot delete a task on an archived project (403)', async () => {
    const { task, token } = await seedArchivedScenario();

    const res = await request(app)
      .delete(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Project is archived');
  });
});

describe('Archived project — content edit blocked, un-archive allowed', () => {
  test('project_admin cannot edit name/description/visibility while archived (403)', async () => {
    const { project, token } = await seedArchivedScenario();

    const res = await request(app)
      .put(`/api/projects/${project._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Renamed while archived' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Project is archived');
  });

  test('project_admin CAN un-archive (status -> active) as the only escape hatch', async () => {
    const { project, token } = await seedArchivedScenario();

    const res = await request(app)
      .put(`/api/projects/${project._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'active' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('active');
  });

  test('project_admin cannot add a member to an archived project (403)', async () => {
    const { project, token } = await seedArchivedScenario();
    await User.create({ email: 'newbie@test.com', password: 'placeholder-hash', name: 'Newbie' });

    const res = await request(app)
      .post(`/api/projects/${project._id}/members`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'newbie@test.com', role: 'developer' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Project is archived');
  });
});

// ─── Password complexity on registration ────────────────────────────────────
// registerSchema must require upper + lower + digit + special. The demo
// password "Test1234!" must still pass.
describe('Password complexity policy', () => {
  test('register with a weak password (no upper/special) is rejected with 422', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Weak', email: 'weak@test.com', password: 'password123' });

    expect(res.status).toBe(422);
  });

  test('register with the demo password "Test1234!" succeeds', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Strong', email: 'strong@test.com', password: 'Test1234!' });

    expect(res.status).toBe(201);
  });
});
