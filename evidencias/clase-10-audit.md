# Clase 10 — Audit Logging Evidence

## Implementation Summary

Audit logging is implemented via `src/utils/auditLogger.js` (`writeAuditLog`) and the `AuditLog` Mongoose model at `src/models/AuditLog.js`. A service alias is available at `src/services/auditLog.service.js` (exports `log`). Logs are write-only — there is no DELETE endpoint and no TTL. Only `super_admin` can read logs via `GET /api/admin/audit-logs`.

### Events logged

| Action | Trigger location |
|--------|-----------------|
| `auth.register` | `src/routes/auth.js` — POST /register |
| `auth.login.success` | `src/routes/auth.js` — POST /login (success) |
| `auth.login.failure` | `src/routes/auth.js` — POST /login (wrong pw / user not found) |
| `auth.logout` | `src/routes/auth.js` — POST /logout |
| `task.create` | `src/routes/tasks.js` — POST /projects/:id/tasks |
| `task.update` | `src/routes/tasksById.js` — PUT /tasks/:id |
| `task.delete` | `src/routes/tasksById.js` — DELETE /tasks/:id |
| `task.status_change` | `src/routes/tasksById.js` — PATCH /tasks/:id/status |
| `org.member.add` | `src/routes/orgs.js` — POST /orgs/:id/members |
| `org.member.remove` | `src/routes/orgs.js` — DELETE /orgs/:id/members/:userId |
| `security.unauthorized` | `src/middleware/authorize.js` — any 403 |
| `security.rate_limited` | `src/middleware/rateLimiters.js` — any 429 |

---

## Evidence — 3 AuditLog Documents from MongoDB

> **How to generate:**
> 1. `docker compose up -d` (start MongoDB)
> 2. `npm run dev` (start server)
> 3. Run the curl commands below
> 4. Open MongoDB Compass → `securecollab` DB → `auditlogs` collection
> 5. Copy each document as JSON and paste below

---

### Log 1: auth.login.failure

```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrongpassword"}'
```

```json
<!-- TODO: paste real MongoDB document — must show ip, userAgent, timestamp -->
```

---

### Log 2: auth.login.success

```bash
# Register first, then login with correct credentials
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"SecurePass123!"}'

curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!"}'
```

```json
<!-- TODO: paste real MongoDB document — must show ip, userAgent, timestamp -->
```

---

### Log 3: security.rate_limited

```bash
# Hit the login endpoint 6 times in rapid succession (limit is 5/15min)
for i in {1..6}; do
  curl -s -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'; echo
done
```

```json
<!-- TODO: paste real MongoDB document — must show ip, userAgent, timestamp -->
```
