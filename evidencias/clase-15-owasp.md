# Clase 15 — OWASP API Security Top 10 — Checklist de Cumplimiento

Proyecto: **SecureCollab** — Plataforma de gestión colaborativa de proyectos  
Revisión: 2026-06-17

---

## API1:2023 — Broken Object Level Authorization (BOLA / IDOR)

**Estado**: ✅ Implementado

**Control**: Antes de devolver o modificar cualquier tarea, se verifica que el usuario  
autenticado sea miembro del proyecto al que pertenece la tarea.

**Código relevante**:
- `src/middleware/checkPermission.js` — `canReadTask()` / `canEditTask()` consultan  
  `project.members` y aplican la política ABAC correspondiente.
- `src/policies/taskPolicies.js` — `canReadTask(projectRole)` devuelve false si el usuario  
  no tiene ningún rol en el proyecto.
- `src/policies/projectPolicies.js` — `getProjectRole(project, userId)` hace el lookup  
  por membresía en `project.members`.

**Prueba de seguridad**: `tests/security/api-security.test.js` — test "IDOR Prevention"  
confirma que un usuario fuera del proyecto recibe `403`.

---

## API2:2023 — Broken Authentication

**Estado**: ✅ Implementado

**Control**: Autenticación mediante JWT de corta duración (15 min) + refresh token rotativo  
(7 días). Contraseñas hasheadas con bcrypt (12 rounds). El middleware verifica firma,  
expiración y estado activo del usuario en cada petición.

**Código relevante**:
- `src/middleware/auth.js` — verifica Bearer token, consulta DB para confirmar que el  
  usuario está activo (`isActive: true`).
- `src/utils/jwt.js` — `generateAccessToken` (15 min), `generateRefreshToken` (7 días),  
  algoritmo HS256.
- `src/utils/password.js` — `hashPassword` (bcrypt, salt rounds = 12).
- `src/routes/auth.js` — lógica de login/register/refresh/logout con rotación de tokens.

**Prueba de seguridad**: test "Auth Bypass" confirma `401` sin token.

---

## API3:2023 — Broken Object Property Level Authorization

**Estado**: ✅ Implementado

**Control**: Las tareas marcadas como `sensitive` ocultan su campo `description` a usuarios  
que no sean el asignado (`assigneeId`) o un `project_admin`. La lógica se aplica tanto en el  
backend (antes de serializar) como en el frontend (antes de renderizar).

**Código relevante**:
- `src/policies/taskPolicies.js` — `canViewSensitiveDescription(user, task, projectRole)`  
  regla 6: solo assignee o project_admin ven la descripción de tareas sensibles.
- `src/routes/tasks.js` línea 89–93 — elimina `taskObj.description` antes de responder  
  si el usuario no tiene autorización.
- `src/routes/tasksById.js` líneas 48–50 — misma lógica en `GET /api/tasks/:id`.
- `src/models/Task.js` — campo `sensitive: Boolean`.

---

## API4:2023 — Unrestricted Resource Consumption

**Estado**: ✅ Implementado

**Control**: Rate limiting por IP / usuario con `rate-limiter-flexible` (RateLimiterMemory).  
Cuatro límites diferenciados: login, registro, comentarios y peticiones generales.  
Cabecera `Retry-After` incluida en cada respuesta `429`.

**Código relevante** (`src/middleware/rateLimiters.js`):
```
loginLimit:    5 intentos / 15 min  por IP
registerLimit: 3 intentos / hora    por IP
commentLimit:  20 comentarios / min por usuario
generalLimit:  100 peticiones / min por usuario o IP
```
- `src/app.js` línea 41 — `app.use(generalLimit)` aplicado globalmente.
- `src/routes/auth.js` líneas 33, 65 — `registerLimit` y `loginLimit` por ruta.

**Prueba de seguridad**: test "Brute Force Protection" confirma `429` + `Retry-After`  
en el 6.º intento de login.

---

## API5:2023 — Broken Function Level Authorization

**Estado**: ✅ Implementado

**Control**: Separación de roles a nivel de sistema (`super_admin` / `user`) y a nivel de  
proyecto (`project_admin` / `developer` / `viewer`). El middleware `requireSystemRole` protege  
rutas administrativas; las políticas ABAC controlan acciones sobre tareas y proyectos.

**Código relevante**:
- `src/middleware/authorize.js` — `requireSystemRole('super_admin')` en `GET /api/admin/*`.
- `src/policies/taskPolicies.js` — `canCreateTask(role)` requiere `developer` o  
  `project_admin`; viewer recibe `403`.
- `src/app.js` línea 56 — `app.use('/api/admin', auth, requireSystemRole('super_admin'), adminRouter)`.

**Prueba de seguridad**: test "Privilege Escalation Prevention" confirma `403`  
cuando un `viewer` intenta crear una tarea.

---

## API6:2023 — Unrestricted Access to Sensitive Business Flows

**Estado**: ✅ Implementado

**Control**: El flujo de registro está limitado a 3 intentos por IP por hora para prevenir  
la creación masiva de cuentas. El flujo de login tiene su propio límite. Los tokens de  
refresco se rotan en cada uso, invalidando el token previo.

**Código relevante**:
- `src/middleware/rateLimiters.js` — `registerLimit` (3/hora/IP), `loginLimit` (5/15min/IP).
- `src/routes/auth.js` líneas 126–128 — rotación de refresh token: se elimina el token  
  usado y se emite uno nuevo.

---

## API7:2023 — Server Side Request Forgery (SSRF)

**Estado**: N/A

**Justificación**: La aplicación no realiza llamadas HTTP salientes a sistemas externos  
(no hay integración con webhooks, URLs provistas por el usuario, ni llamadas a APIs  
de terceros). El riesgo de SSRF no aplica al modelo de la aplicación.

---

## API8:2023 — Security Misconfiguration

**Estado**: ✅ Implementado

**Control**: Helmet establece cabeceras de seguridad HTTP; CORS restringe el origen a  
una lista blanca; el parser JSON limita el cuerpo a 50 KB; los secretos viven en `.env`  
(nunca en código); el error handler central elimina stack traces de las respuestas.

**Código relevante**:
- `src/app.js` líneas 26–38 — Helmet, CORS (lista blanca), `express.json({ limit: '50kb' })`.
- `src/middleware/errorHandler.js` — responde siempre con mensaje genérico; nunca expone  
  `err.stack` al cliente.
- `.gitignore` — `.env`, `*.pem`, `*.key` excluidos del repositorio.

---

## API9:2023 — Improper Inventory Management

**Estado**: ✅ Implementado

**Control**: Todas las rutas de negocio requieren el middleware `auth` antes de procesarse.  
No existen rutas de debugging ni endpoints ocultos. Las rutas públicas (`/api/auth`) están  
explícitamente delimitadas.

**Código relevante** (`src/app.js` líneas 44–56):
```js
app.use('/api/auth', authRouter);                          // público
app.use('/api/orgs', auth, orgsRouter);                    // autenticado
app.use('/api/orgs/:orgId/projects', auth, projectsRouter);
app.use('/api/projects', auth, projectsByIdRouter);
app.use('/api/projects/:projectId/tasks', auth, tasksRouter);
app.use('/api/tasks', auth, tasksByIdRouter);
app.use('/api/tasks/:taskId/comments', auth, commentsRouter);
app.use('/api/comments', auth, commentsByIdRouter);
app.use('/api/admin', auth, requireSystemRole('super_admin'), adminRouter);
```

---

## API10:2023 — Unsafe Consumption of APIs

**Estado**: ✅ Implementado

**Control**: Toda entrada de usuario es validada con Joi antes de llegar al handler.  
En el frontend, todo contenido de usuario es sanitizado con DOMPurify antes de renderizarse.  
Los tipos se validan estrictamente (cadenas, fechas, booleanos, enums) rechazando operadores  
MongoDB y tipos inesperados.

**Código relevante**:
- `src/middleware/validate.js` — middleware Joi aplicado a todos los endpoints que aceptan  
  cuerpo de petición.
- `client/src/utils/sanitize.ts` — wrapper de DOMPurify aplicado a contenido de usuario  
  antes de renderizar en el DOM.
- Schemas Joi en `src/routes/auth.js`, `tasks.js`, `tasksById.js`, `comments.js`, etc.

**Prueba de seguridad**: test "Injection Prevention" confirma `422` para payload  
con operador MongoDB en campo de email.

---

## Resumen

| Item OWASP | Estado |
|------------|--------|
| API1 — BOLA/IDOR | ✅ |
| API2 — Broken Authentication | ✅ |
| API3 — Broken Object Property Level Auth | ✅ |
| API4 — Unrestricted Resource Consumption | ✅ |
| API5 — Broken Function Level Auth | ✅ |
| API6 — Unrestricted Sensitive Business Flows | ✅ |
| API7 — SSRF | N/A |
| API8 — Security Misconfiguration | ✅ |
| API9 — Improper Inventory Management | ✅ |
| API10 — Unsafe Consumption of APIs | ✅ |

**9/10 controles implementados** (API7 no aplica al modelo de la aplicación).
