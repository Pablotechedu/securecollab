# Proyecto Final: SecureCollab
## Plataforma de Gestión de Proyectos Colaborativa y Segura

**Curso:** Seguridad y Arquitectura de Software  
**Semestre:** Último año  
**Entrega final:** Clase 16  
**Entrega:** Individual

---

## Contexto

Una empresa de desarrollo de software necesita una plataforma interna donde sus equipos puedan gestionar proyectos, asignar tareas y colaborar. La plataforma maneja información sensible: descripciones de proyectos confidenciales, comentarios internos, datos de usuarios. El sistema debe ser seguro desde su diseño.

Ganaste la licitación. Ahora tienes que construirla.

---

## Roles del Sistema

El sistema tiene dos niveles de roles: **sistema** (asignado al usuario globalmente) y **contexto** (asignado dentro de una organización o proyecto).

### Roles de Sistema

| Rol | Descripción |
|-----|-------------|
| `super_admin` | Administrador global de la plataforma. Puede ver todos los usuarios y audit logs, y desactivar cuentas. No puede modificar datos de organizaciones ajenas. |
| `user` | Usuario regular. Puede crear organizaciones y ser invitado a otras. Acceso determinado por sus roles de contexto. |

### Roles dentro de una Organización

| Rol | Descripción |
|-----|-------------|
| `org_admin` | Administrador de la organización. Puede crear y eliminar proyectos, invitar y remover miembros, y editar la organización. Debe haber al menos uno por organización en todo momento. |
| `member` | Miembro de la organización. Puede ver los proyectos internos (`visibility: internal`) y ser asignado a proyectos. No puede gestionar la organización. |

### Roles dentro de un Proyecto

| Rol | Descripción |
|-----|-------------|
| `project_admin` | Administrador del proyecto. Puede editar el proyecto, agregar/remover miembros, mover tareas a cualquier estado, y eliminar cualquier tarea o comentario dentro del proyecto. |
| `developer` | Miembro activo del proyecto. Puede crear tareas, editar tareas que le pertenecen o están asignadas a él, comentar y mover tareas a `done` si es el assignee. |
| `viewer` | Solo lectura. Puede ver tareas y comentarios del proyecto pero no crear, editar ni borrar nada. |

### Jerarquía de Acceso

```
super_admin
    └── puede ver todo (solo lectura cross-org)

org_admin
    └── gestiona org + puede crear proyectos

  member
    └── ve proyectos internos de la org

    project_admin
        └── control total dentro del proyecto

      developer
          └── crea y edita dentro del proyecto

        viewer
            └── solo lectura dentro del proyecto
```

> Un mismo usuario puede ser `org_admin` en una organización y `viewer` en un proyecto de otra. Los roles no se heredan entre contextos.

---

## Arquitectura Requerida

```
Cliente (SPA - React/Vue/Svelte, elección libre)
         ↓  HTTPS
API REST (Node.js + Express)
         ↓
      MongoDB
```

El backend debe seguir la arquitectura de capas que se ha trabajado en clase:

```
Request → Helmet/CORS → RateLimit → Auth → Authorize → Validate → Handler → ErrorHandler
```

El frontend lo construyen desde cero. No se provee ningún template.

---

## Modelo de Datos

### User
```
_id, email, password (hash), role: 'super_admin' | 'user',
name, createdAt, isActive
```

### Organization
```
_id, name, description, ownerId (ref User),
members: [{ userId, role: 'org_admin' | 'member' }],
createdAt
```

### Project
```
_id, name, description (cifrado), orgId (ref Organization),
visibility: 'private' | 'internal',
members: [{ userId, role: 'project_admin' | 'developer' | 'viewer' }],
status: 'active' | 'archived', createdAt
```

### Task
```
_id, title, description, projectId (ref Project),
assigneeId (ref User), reporterId (ref User),
status: 'backlog' | 'in_progress' | 'review' | 'done',
priority: 'low' | 'medium' | 'high' | 'critical',
sensitive: Boolean,  ← si true, description va cifrada
dueDate, createdAt, updatedAt
```

### Comment
```
_id, taskId (ref Task), authorId (ref User),
body, createdAt, editedAt
```

### AuditLog *(Clase 10)*
```
_id, action, actorId (ref User), resourceType, resourceId,
metadata (objeto libre), ip, userAgent, timestamp
```

---

## API Endpoints

### Auth
| Método | Ruta | Descripción | Auth requerida |
|--------|------|-------------|----------------|
| POST | `/api/auth/register` | Registro | No |
| POST | `/api/auth/login` | Login | No |
| POST | `/api/auth/refresh` | Rotar tokens | No (solo refreshToken) |
| POST | `/api/auth/logout` | Revocar sesión | No (solo refreshToken) |

### Organizations
| Método | Ruta | Descripción | Rol mínimo |
|--------|------|-------------|------------|
| POST | `/api/orgs` | Crear organización | user autenticado |
| GET | `/api/orgs` | Mis organizaciones | user autenticado |
| GET | `/api/orgs/:id` | Ver organización | miembro de la org |
| PUT | `/api/orgs/:id` | Editar | org_admin |
| DELETE | `/api/orgs/:id` | Eliminar | org_admin |
| POST | `/api/orgs/:id/members` | Invitar miembro | org_admin |
| DELETE | `/api/orgs/:id/members/:userId` | Remover miembro | org_admin |

### Projects
| Método | Ruta | Descripción | Rol mínimo |
|--------|------|-------------|------------|
| POST | `/api/orgs/:orgId/projects` | Crear proyecto | org_admin |
| GET | `/api/orgs/:orgId/projects` | Listar proyectos | miembro de la org |
| GET | `/api/projects/:id` | Ver proyecto | miembro del proyecto |
| PUT | `/api/projects/:id` | Editar | project_admin |
| DELETE | `/api/projects/:id` | Eliminar | org_admin |
| POST | `/api/projects/:id/members` | Agregar miembro | project_admin |

### Tasks
| Método | Ruta | Descripción | Rol mínimo |
|--------|------|-------------|------------|
| POST | `/api/projects/:projectId/tasks` | Crear tarea | developer+ |
| GET | `/api/projects/:projectId/tasks` | Listar tareas | viewer+ |
| GET | `/api/tasks/:id` | Ver tarea | viewer del proyecto |
| PUT | `/api/tasks/:id` | Editar tarea | developer+ (o assignee) |
| PATCH | `/api/tasks/:id/status` | Cambiar estado | developer+ (o assignee) |
| DELETE | `/api/tasks/:id` | Eliminar | project_admin |

### Comments
| Método | Ruta | Descripción | Rol mínimo |
|--------|------|-------------|------------|
| POST | `/api/tasks/:taskId/comments` | Comentar | developer+ |
| GET | `/api/tasks/:taskId/comments` | Ver comentarios | viewer+ |
| PUT | `/api/comments/:id` | Editar | solo el autor |
| DELETE | `/api/comments/:id` | Eliminar | autor o project_admin |

### Admin (super_admin only)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/admin/users` | Listar todos los usuarios |
| PATCH | `/api/admin/users/:id/deactivate` | Desactivar cuenta |
| GET | `/api/admin/audit-logs` | Ver todos los audit logs |

---

## Reglas de Negocio y Seguridad (ABAC)

Estas reglas deben implementarse como middleware o dentro de los handlers. No son opcionales.

1. Un usuario no puede ver proyectos de organizaciones donde no es miembro.
2. Un `viewer` puede ver tareas y comentarios pero no crear, editar ni borrar.
3. Solo el `assignee` de una tarea o un `project_admin` puede mover una tarea a `done`.
4. Tareas en proyectos con `status: 'archived'` no se pueden editar ni comentar.
5. Un miembro no puede removerse a sí mismo si es el último `org_admin` de la organización.
6. Si `task.sensitive = true`, el campo `description` debe estar cifrado en la BD y solo visible para el assignee y project_admin.
7. Un usuario no puede invitarse a sí mismo a una organización.
8. `super_admin` puede ver todo pero **no puede modificar** datos de otras organizaciones (solo puede desactivar cuentas).

---

## Requisitos de Seguridad por Capa

Cada capa se agrega en la clase correspondiente. Para la entrega final, todas deben estar presentes.

### Ya deben tener desde clase 8
- [ ] Helmet (security headers)
- [ ] CORS configurado con allowlist
- [ ] JWT access token (15 min) + refresh token (7 días) con rotación
- [ ] Passwords con bcrypt
- [ ] Validación de inputs con Joi en todos los endpoints
- [ ] Error handler centralizado (sin stack traces al cliente)
- [ ] RBAC básico con middleware `authorize`

### Clase 9 — Rate Limiting
- [ ] `POST /api/auth/login`: máximo 5 intentos por IP cada 15 minutos → 429
- [ ] `POST /api/auth/register`: máximo 3 registros por IP por hora → 429
- [ ] `POST /api/tasks/:taskId/comments`: máximo 20 comentarios por usuario por minuto → 429
- [ ] Endpoints generales: máximo 100 requests por usuario por minuto → 429
- [ ] La respuesta 429 debe incluir el header `Retry-After`

### Clase 10 — Audit Logging
- [ ] Cada acción en la lista siguiente debe crear un `AuditLog`:
  - `auth.register`, `auth.login.success`, `auth.login.failure`, `auth.logout`
  - `task.create`, `task.update`, `task.delete`, `task.status_change`
  - `org.member.add`, `org.member.remove`
  - `security.unauthorized` (cualquier 403)
  - `security.rate_limited` (cualquier 429)
- [ ] El log debe incluir: `actorId`, `ip`, `userAgent`, `resourceId`, `timestamp`
- [ ] Los logs **nunca** se borran (no exponer endpoint DELETE en audit logs)
- [ ] Solo `super_admin` puede leer los logs vía `GET /api/admin/audit-logs`

### Clase 11 — ABAC Completo (proyecto)
- [ ] Implementar todas las reglas de negocio listadas arriba
- [ ] Las políticas viven en `src/policies/` como funciones puras testeables

### Clase 12 — Cifrado de datos sensibles
- [ ] Campo `project.description` cifrado en reposo con AES-256-GCM (`crypto` nativo de Node)
- [ ] Campo `task.description` cifrado cuando `task.sensitive = true`
- [ ] La clave de cifrado va en `.env` como `ENCRYPTION_KEY` (32 bytes en hex)
- [ ] Los datos se descifran al leer, nunca se almacenan en texto plano
- [ ] Si se pierde la `ENCRYPTION_KEY`, los datos deben ser irrecuperables (correcto por diseño)

### Clase 13 — Security Testing
- [ ] Al menos 5 tests de seguridad en `tests/security/`:
  - IDOR: usuario B no puede ver tareas del proyecto de usuario A
  - Brute force: el 6to intento de login debe retornar 429
  - Injection: enviar `{ "title": { "$gt": "" } }` debe retornar 422
  - Auth bypass: request sin token a endpoint protegido debe retornar 401
  - Privilege escalation: `viewer` intentando crear tarea debe retornar 403

---

## Frontend (construido por ustedes)

### Requisitos mínimos
- [ ] Login y registro con manejo de tokens en memoria (no localStorage)
- [ ] Refresh silencioso con interceptor de axios (el usuario no debe ver el logout forzado salvo expiración de refresh token)
- [ ] Rutas protegidas — si no hay sesión activa, redirigir a login
- [ ] Sanitización de inputs con DOMPurify antes de enviar al API
- [ ] Dashboard con lista de organizaciones del usuario
- [ ] Vista de proyecto con lista de tareas (Kanban o lista, a elección)
- [ ] Formulario de crear/editar tarea con campo `sensitive`
- [ ] Sección de comentarios por tarea
- [ ] Indicador visual cuando una tarea es `sensitive`
- [ ] Manejo de errores: mostrar mensaje al usuario en 401, 403, 422, 429 (con el `Retry-After`)

### No es requisito pero suma puntos
- Drag & drop para cambiar estado de tareas
- Notificaciones en tiempo real (WebSocket o polling)
- Vista de audit logs para admins
- Dark mode

---

## Entrega Semanal

Cada semana deben subir **mínimo dos commits** a su repositorio y enviar a GES el link del commit de seguridad.

### Tipos de commit

| Tipo | Prefijo sugerido | Qué incluye |
|------|-----------------|-------------|
| **Funcionalidad** | `feat:` | Avance en modelos, rutas, lógica de negocio, frontend — cualquier progreso en la construcción del proyecto. No requiere evidencia formal. |
| **Seguridad** | `security:` | La capa de seguridad de la semana (rate limiting, audit log, cifrado, etc.). **Este es el commit que van a GES**, e incluye el archivo de evidencia. |

El commit de funcionalidad debe existir — si el único commit de la semana es el de seguridad, indica que no hubo progreso real en el proyecto.

### Calendario de entregas

| Semana / Clase | Capa de seguridad | Commit de seguridad debe incluir |
|---------------|-------------------|----------------------------------|
| Clase 9 | Rate Limiting | `evidencias/clase-9-rate-limiting.md` con outputs de curls que demuestren 429 y el header `Retry-After` |
| Clase 10 | Audit Logging | `evidencias/clase-10-audit.md` con 3 ejemplos de logs reales generados (copiar el JSON del documento en MongoDB) |
| Clase 11 | ABAC completo | `evidencias/clase-11-abac.md` con curls de acceso denegado por cada política implementada |
| Clase 12 | Cifrado en reposo | `evidencias/clase-12-cifrado.md` con screenshot de MongoDB Compass mostrando el campo cifrado vs. el valor descifrado al leerlo por API |
| Clase 13 | Security Testing | `evidencias/clase-13-tests.md` con output completo de `npm test` mostrando los 5 tests de seguridad en verde |
| Clase 14 | Frontend + auth | `evidencias/clase-14-frontend.md` con screenshots del flujo completo: register → login → dashboard → tarea sensitive → logout |
| Clase 15 | Checklist OWASP | `evidencias/clase-15-owasp.md` completado (ver plantilla abajo) |
| Clase 16 | — | Repo completo + demo en vivo en clase |

### Plantilla OWASP API Security Top 10 (clase 15)
```markdown
# Checklist OWASP API Security Top 10

| # | Vulnerabilidad | ¿Mitigada? | Dónde en el código |
|---|---------------|------------|-------------------|
| API1 | Broken Object Level Authorization | ✅ / ❌ | ... |
| API2 | Broken Authentication | ✅ / ❌ | ... |
| API3 | Broken Object Property Level Auth | ✅ / ❌ | ... |
| API4 | Unrestricted Resource Consumption | ✅ / ❌ | ... |
| API5 | Broken Function Level Authorization | ✅ / ❌ | ... |
| API6 | Unrestricted Access to Sensitive Flows | ✅ / ❌ | ... |
| API7 | Server Side Request Forgery | ✅ / ❌ | ... |
| API8 | Security Misconfiguration | ✅ / ❌ | ... |
| API9 | Improper Inventory Management | ✅ / ❌ | ... |
| API10 | Unsafe Consumption of APIs | ✅ / ❌ | ... |
```

---

## Criterios de Evaluación

| Criterio | Peso |
|----------|------|
| Seguridad: todas las capas implementadas correctamente | 40% |
| Funcionalidad: API completa y frontend usable | 25% |
| Calidad del código: estructura, sin hardcoded secrets, validaciones | 15% |
| Evidencias por clase entregadas y con outputs reales | 10% |
| Presentación y demo en vivo (clase 16) | 10% |

### Descuentos automáticos
- Token en localStorage o sessionStorage: **-20 puntos**
- Secret o contraseña hardcodeada en el código: **-20 puntos**
- Stack trace expuesto en respuesta de la API: **-15 puntos**
- `console.log` con datos de usuario en producción: **-10 puntos**
- Evidencia de curl con token falso o output inventado: **nota 0 en esa entrega**

---

## Recursos de Referencia

- Repositorio de la todoApp del curso (referencia de implementación de auth, RBAC y validación): `https://github.com/Cursos-Ing-Berny-Cardona/Seguridad-y-Arquitectura`
- OWASP API Security Top 10: `https://owasp.org/API-Security/editions/2023/en/0x11-t10/`
- `rate-limiter-flexible` docs: `https://github.com/animir/node-rate-limiter-flexible`
- Node.js `crypto` (AES-256-GCM): `https://nodejs.org/api/crypto.html`

---

> **Regla de oro:** Si un atacante roba la base de datos, ¿qué puede hacer con ella? El objetivo del proyecto es que la respuesta sea: "muy poco".
