# Clase 9 — Rate Limiting Evidence

## Implementation Summary

Rate limiting implemented with `rate-limiter-flexible` (in-memory store) in `src/middleware/rateLimiters.js`.

| Endpoint | Limit | Window | Key |
|----------|-------|--------|-----|
| `POST /api/auth/login` | 5 attempts | 15 min | IP |
| `POST /api/auth/register` | 3 attempts | 1 hour | IP |
| `POST /api/tasks/:taskId/comments` | 20 requests | 1 min | userId |
| All endpoints (general) | 100 requests | 1 min | userId or IP |

All 429 responses include `Retry-After` header (seconds until reset) and body `{ "error": "Too many requests", "retryAfter": <seconds> }`.

---

## Evidence — Login Rate Limit (5 attempts / 15 min)

> Run `npm run dev` first. Replace `<SERVER>` with `http://localhost:3000`.

```bash
# Attempts 1-5 (returns 401 — invalid credentials, not rate limited yet)
for i in 1 2 3 4 5; do
  curl -s -X POST <SERVER>/api/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"test@test.com","password":"wrongpassword"}' \
    -w "\nHTTP %{http_code}\n"
done

# Attempt 6 — must return 429 with Retry-After header
curl -si -X POST <SERVER>/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@test.com","password":"wrongpassword"}'
```

**Expected output for attempt 6:**
```
HTTP/1.1 429 Too Many Requests
Retry-After: <seconds>
...
{"error":"Too many requests","retryAfter":<seconds>}
```

<!-- TODO: paste real curl output here after running the server -->

---

## Evidence — Register Rate Limit (3 attempts / 1 hour)

```bash
# Attempts 1-3
for i in 1 2 3; do
  curl -s -X POST <SERVER>/api/auth/register \
    -H 'Content-Type: application/json' \
    -d "{\"name\":\"Test$i\",\"email\":\"test$i@example.com\",\"password\":\"password123\"}" \
    -w "\nHTTP %{http_code}\n"
done

# Attempt 4 — must return 429
curl -si -X POST <SERVER>/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test4","email":"test4@example.com","password":"password123"}'
```

**Expected HTTP 429 with Retry-After header.**

<!-- TODO: paste real curl output here after running the server -->

---

## Evidence — General Rate Limit (100 req / 1 min)

```bash
# Fire 101 requests rapidly
for i in $(seq 1 101); do
  curl -s <SERVER>/api/orgs \
    -H "Authorization: Bearer <ACCESS_TOKEN>" \
    -o /dev/null -w "HTTP %{http_code}\n"
done | tail -5
```

**Expected: last request returns 429 with Retry-After header.**

<!-- TODO: paste real curl output here after running the server -->
