# SecureCollab

Plataforma de gestión de proyectos colaborativa, desarrollada como proyecto final del curso Patrones de Diseño Orientados a la Seguridad. La implementación cubre siete capas de seguridad entregadas semanalmente (Clases 9–15), con demo en vivo en la Clase 16.

Al leer este documento podrás: ejecutar el backend y el frontend localmente, comprender la arquitectura de seguridad y el modelo de roles, navegar el código fuente y saber qué cubre cada entrega semanal.

---

## Tabla de contenidos

1. [Stack tecnológico](#stack-tecnológico)
2. [Arquitectura](#arquitectura)
3. [Modelo de roles](#modelo-de-roles)
4. [Capas de seguridad (Clases 9–15)](#capas-de-seguridad-clases-915)
5. [Referencia de API — mapa de rutas](#referencia-de-api--mapa-de-rutas)
6. [Funcionalidades del frontend](#funcionalidades-del-frontend)
7. [Primeros pasos](#primeros-pasos)
8. [Pruebas y linting](#pruebas-y-linting)
9. [Convenciones de commits](#convenciones-de-commits)
10. [Archivos de evidencia semanales](#archivos-de-evidencia-semanales)

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Runtime | Node.js + Express (ES modules) |
| Base de datos | MongoDB via Mongoose ODM |
| Autenticación | JWT access tokens (15 min, HS256) + refresh tokens (7 días) con rotación |
| Hash de contraseñas | bcryptjs |
| Validación de entradas | Joi en todos los endpoints |
| Rate limiting | rate-limiter-flexible (en memoria) |
| Cifrado en reposo | AES-256-GCM via módulo `crypto` nativo de Node.js |
| Tiempo real | Socket.IO (WebSocket, handshake con JWT) |
| Framework frontend | React 19 + TypeScript |
| Build frontend | Vite |
| Estilos | Tailwind CSS |
| Gestión de estado | Zustand |
| Cliente HTTP | axios con interceptores para silent refresh |
| Drag-and-drop | @hello-pangea/dnd |
| Prevención de XSS | DOMPurify (aplicado antes de que cualquier contenido del usuario llegue al DOM) |
| Headers de seguridad | Helmet |
| Pruebas | Jest + Supertest |

---

## Arquitectura

### Estructura de carpetas del backend

```
src/
  app.js                  # App Express — pipeline de middleware, montaje de rutas
  server.js               # Punto de entrada HTTP, conexión a MongoDB, inicialización Socket.IO
  models/
    User.js               # Usuario del sistema: email, contraseña bcrypt, rol, refreshTokens
    Organization.js       # Organización con array embebido de miembros (userId + rol)
    Project.js            # Proyecto con miembros embebidos; description cifrada con AES-256-GCM
    Task.js               # Tarea; campo sensitive activa cifrado AES-256-GCM en description al guardar
    Comment.js            # Comentario de tarea (body hasta 2000 chars)
    AuditLog.js           # Registro de evento inmutable y estructurado
    Invitation.js         # Ciclo de vida de invitación a organización (pending/accepted/rejected)
    Notification.js       # Notificación in-app enviada via Socket.IO
    membership.model.js   # Schema de membresía compartido
  routes/
    auth.js               # /api/auth — register, login, refresh, logout
    orgs.js               # /api/orgs — CRUD + gestión de miembros + flujo de invitaciones
    projects.js           # /api/orgs/:orgId/projects — lista y creación de proyectos
    projectsById.js       # /api/projects/:id — get, update, delete, archive
    tasks.js              # /api/projects/:projectId/tasks — lista y creación de tareas
    tasksById.js          # /api/tasks/:id — get, update, delete, cambio de estado
    comments.js           # /api/tasks/:taskId/comments — lista y creación
    commentsById.js       # /api/comments/:id — update, delete
    notifications.js      # /api/notifications — lista, marcar leídas, limpiar
    invitations.js        # /api/invitations — aceptar, rechazar
    admin.js              # /api/admin — gestión de usuarios y audit logs (solo super_admin)
  middleware/
    auth.js               # Verificación JWT; carga req.user; límite de 2 KB en token
    authorize.js          # requireSystemRole() — guard de rol a nivel sistema
    validate.js           # Wrapper Joi; retorna 422 ante fallo
    rateLimiters.js       # Limitadores por endpoint; emite header Retry-After
    errorHandler.js       # Centralizado; elimina stack traces de las respuestas
    checkPermission.js    # Helper de verificación de permisos a nivel recurso
  policies/
    orgPolicies.js        # Funciones puras: getOrgRole, isOrgAdmin, canRemoveMember, etc.
    projectPolicies.js    # Funciones puras: getProjectRole, canViewProject, canManageProject
    taskPolicies.js       # Funciones puras: canCreateTask, canEditTask, canChangeStatus, canViewSensitiveDescription
    commentPolicies.js    # Funciones puras: canCreateComment, canEditComment, canDeleteComment
  services/
    orgService.js         # Lógica de negocio de organizaciones
    projectService.js     # Lógica de negocio de proyectos
    auditLog.service.js   # Helpers de consulta del audit log
    socketService.js      # Init Socket.IO, handshake JWT, gestión de rooms, constantes de eventos
  utils/
    encryption.js         # Cifrado/descifrado AES-256-GCM con prefijo ENC:
    jwt.js                # generateAccessToken, generateRefreshToken, helpers de verificación
    password.js           # hashPassword, comparePassword (bcryptjs)
    auditLogger.js        # writeAuditLog — escribe documento AuditLog, nunca lanza excepción
    logger.js             # Logger estructurado (sin datos de usuario)
    pagination.js         # Helpers de paginación

tests/
  setup.js                # Setup global de Jest (carga .env.test)
  security/
    api-security.test.js  # Auth bypass, inyección NoSQL, fuerza bruta, IDOR, escalada de privilegios
    encryption.test.js    # Roundtrip AES-256-GCM, seguridad semántica, integridad del auth tag

evidencias/               # Archivos de evidencia de entregas semanales (output real, no fabricado)
```

### Pipeline de middleware de seguridad

Las peticiones atraviesan las siguientes capas en orden:

```
Helmet  →  CORS allowlist  →  Body parser (límite 50 KB)  →  GeneralRateLimit
  →  Auth (verificación JWT + consulta de usuario en BD)
    →  Authorize (verificación de rol de sistema, ej. requireSystemRole('super_admin'))
      →  Validate (schema Joi)
        →  Route handler
          →  ErrorHandler (elimina stack traces, retorna JSON saneado)
```

Los limitadores de rate específicos por endpoint (login, register, comment, invite) se aplican dentro de cada ruta individual, antes del handler.

---

## Modelo de roles

SecureCollab utiliza tres ámbitos de roles independientes.

### Roles de sistema

| Rol | Descripción |
|---|---|
| `user` | Rol por defecto para todas las cuentas registradas |
| `super_admin` | Puede acceder a `/api/admin/*` (gestión de usuarios, audit logs); bloqueado para modificar datos de orgs/proyectos (Regla 8) |

### Roles de organización

| Rol | Capacidades |
|---|---|
| `org_admin` | Gestión completa: editar org, añadir/eliminar miembros, enviar invitaciones |
| `member` | Puede ver la org y ser asignado a proyectos |

### Roles de proyecto

| Rol | Capacidades |
|---|---|
| `project_admin` | Gestión completa del proyecto; puede editar cualquier tarea y moverla a cualquier estado |
| `developer` | Puede crear tareas y comentarios; puede editar tareas que tiene asignadas |
| `viewer` | Acceso de solo lectura; no puede crear tareas, comentarios ni arrastrar tarjetas |

---

## Capas de seguridad (Clases 9–15)

### Clase 9 — Rate limiting (`src/middleware/rateLimiters.js`)

Todos los limitadores usan `RateLimiterMemory` de `rate-limiter-flexible`. Cada rechazo escribe una entrada de audit log (`security.rate_limited`) y retorna HTTP 429 con header `Retry-After`.

| Limitador | Ámbito | Umbral |
|---|---|---|
| `loginLimit` | Por IP | 5 peticiones / 15 minutos |
| `registerLimit` | Por IP | 3 peticiones / hora |
| `commentLimit` | Por usuario (o IP) | 20 peticiones / minuto |
| `inviteLimit` | Por usuario (o IP) | 5 peticiones / 10 minutos |
| `generalLimit` | Por usuario (o IP) | 100 peticiones / minuto — aplicado globalmente |

### Clase 10 — Audit logging (`src/models/AuditLog.js`, `src/utils/auditLogger.js`)

Toda acción relevante para la seguridad escribe un documento `AuditLog` en MongoDB. El schema captura `action`, `actorId`, `resourceType`, `resourceId`, `metadata`, `ip`, `userAgent` y `timestamp`. Las escrituras son fire-and-forget — un fallo al escribir no afecta la respuesta.

Tipos de acción auditados (no exhaustivo):

- `auth.register`, `auth.login.success`, `auth.login.failure`, `auth.logout`, `auth.refresh`
- `task.created`, `task.updated`, `task.deleted`, `task.status_changed`
- `org.member.add`, `org.member.remove`, `org.invite.sent`
- `project.created`, `project.updated`, `project.deleted`
- `comment.created`, `comment.deleted`
- `security.unauthorized`, `security.rate_limited`

Los índices en `(actorId, timestamp)` y `(action, timestamp)` permiten consultas eficientes. Los super admins pueden navegar todos los logs desde la UI de administración con filtro por tipo de acción y paginación basada en cursor.

### Clase 11 — ABAC (`src/policies/`)

Las decisiones de autorización están codificadas como funciones puras que reciben objetos planos y retornan booleanos — sin llamadas a base de datos dentro de las funciones de política, lo que las hace testeables de forma independiente.

**Las ocho reglas de negocio:**

| # | Regla | Función de política / ubicación |
|---|---|---|
| 1 | Los proyectos privados requieren membresía en el proyecto (los miembros de la org solo ven proyectos internos por defecto) | `canViewProject` — `projectPolicies.js` |
| 2 | Solo `developer` y `project_admin` pueden crear tareas y comentarios | `canCreateTask` — `taskPolicies.js`; `canCreateComment` — `commentPolicies.js` |
| 3 | Mover una tarea a `done` requiere ser el assignee o un `project_admin` | `canChangeStatus` — `taskPolicies.js` |
| 4 | No se permiten mutaciones (crear/editar/eliminar tareas) en proyectos archivados | `isProjectArchived` — `taskPolicies.js` |
| 5 | No se puede eliminar al último `org_admin` de una organización | `canRemoveMember` — `orgPolicies.js` |
| 6 | Las descripciones de tareas sensibles solo son visibles para el assignee y el `project_admin` | `canViewSensitiveDescription` — `taskPolicies.js` |
| 7 | Un `org_admin` no puede invitarse a sí mismo | `cannotInviteSelf` — `orgPolicies.js` |
| 8 | Las cuentas `super_admin` no pueden modificar datos de orgs ni proyectos | `isSuperAdminModifying` — `orgPolicies.js` |

### Clase 12 — Cifrado en reposo (`src/utils/encryption.js`)

Los campos sensibles se cifran de forma transparente con AES-256-GCM antes de persistirse y se descifran al leer.

**Detalles del algoritmo:**

- Clave: 32 bytes (256 bits) desde la variable de entorno `ENCRYPTION_KEY` (codificada en hex)
- IV: 12 bytes aleatorios generados por cada llamada de cifrado (seguridad semántica — el mismo texto plano produce un ciphertext diferente cada vez)
- Auth tag: 16 bytes (verificación de integridad GCM; ciphertext adulterado retorna `null`)
- Formato almacenado: `ENC:<base64(IV[12B] | tag[16B] | ciphertext)>`

**Campos cifrados:**

| Modelo | Campo | Disparador |
|---|---|---|
| `Project` | `description` | Setter de Mongoose en cada escritura |
| `Task` | `description` | Hook `pre('save')`, solo cuando `task.sensitive === true` |

Las descripciones de tareas no sensibles se almacenan en texto plano. El prefijo `ENC:` permite que la función `decrypt()` deje pasar valores heredados sin cifrar sin modificación.

### Clase 13 — Security testing (`tests/security/`)

Suite de tests Jest ejecutada con `npm test`. Los tests se conectan a una base de datos de prueba dedicada (`MONGODB_URI_TEST`) y la eliminan tras cada suite.

**Cobertura de tests:**

| Archivo | Casos de prueba |
|---|---|
| `api-security.test.js` | Auth bypass (401 sin token), inyección NoSQL (Joi rechaza `{$gt: ""}` como email → 422), fuerza bruta (6° intento de login → 429 + `Retry-After`), IDOR (usuario fuera del proyecto no puede leer tarea → 403), escalada de privilegios (viewer no puede crear tarea → 403) |
| `encryption.test.js` | Corrección del roundtrip, seguridad semántica (IV diferente por llamada), presencia del prefijo `ENC:`, integridad del auth tag GCM (tag adulterado → `null`), manejo de buffer corto, passthrough de texto plano, passthrough de null/undefined |

### Clase 14 — Frontend + auth

**Almacenamiento de tokens:** los access tokens se guardan únicamente en el store Zustand en memoria. Nunca se escriben en `localStorage` ni `sessionStorage`. Solo la preferencia de tema (`sc-theme`) y la visibilidad de columnas (`sc_column_config`) se persisten en localStorage.

**Silent refresh:** los interceptores de axios detectan respuestas 401, llaman a `POST /api/auth/refresh` con el refresh token almacenado, actualizan el access token en memoria y reintentan la petición original de forma transparente.

**Sanitización de entradas:** DOMPurify se aplica antes de inyectar cualquier contenido del usuario en el DOM via `dangerouslySetInnerHTML`. Cubre títulos de tareas, descripciones, cuerpos de comentarios y chips en la vista calendario. La utilidad `sanitizeText` también se llama sobre los cuerpos de comentarios antes de enviarlos a la API.

**Manejo de errores:** el componente `ErrorMessage` muestra mensajes diferenciados por código HTTP:
- 401 — "Sesión expirada, por favor inicia sesión."
- 403 — "No tienes permiso para hacer eso."
- 429 — "Demasiadas peticiones. Intenta de nuevo en N segundos." (lee el header `Retry-After`)
- 422 — mensajes de validación por campo desde la respuesta de la API
- Otros — mensaje del servidor o fallback genérico

### Clase 15 — OWASP API Security Top 10

Ver `evidencias/clase-15-owasp.md` para el checklist completo con referencias a archivo:línea de cada mitigación.

---

## Referencia de API — mapa de rutas

Todas las rutas autenticadas requieren `Authorization: Bearer <accessToken>`.

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/auth/register` | Público | Registro (rate limited: 3/hr por IP) |
| POST | `/api/auth/login` | Público | Login (rate limited: 5/15 min por IP) |
| POST | `/api/auth/refresh` | Público | Rotar par de access + refresh token |
| POST | `/api/auth/logout` | Público | Invalidar refresh token |
| GET | `/api/orgs` | Usuario | Listar orgs del usuario autenticado |
| POST | `/api/orgs` | Usuario | Crear org (el creador queda como `org_admin`) |
| GET | `/api/orgs/:id` | Miembro | Obtener detalles de la org |
| PUT | `/api/orgs/:id` | Org admin | Actualizar nombre/descripción de la org |
| DELETE | `/api/orgs/:id` | Org admin | Eliminar org |
| GET | `/api/orgs/:id/members` | Miembro | Listar miembros con datos de usuario |
| POST | `/api/orgs/:id/members` | Org admin | Agregar miembro directamente |
| DELETE | `/api/orgs/:id/members/:userId` | Org admin | Eliminar miembro (Regla 5 aplicada) |
| POST | `/api/orgs/:id/invite` | Org admin | Enviar invitación (rate limited: 5/10 min) |
| GET | `/api/orgs/:orgId/projects` | Miembro | Listar proyectos visibles |
| POST | `/api/orgs/:orgId/projects` | Miembro | Crear proyecto |
| GET | `/api/projects/:id` | Miembro del proyecto | Obtener detalles del proyecto |
| PUT | `/api/projects/:id` | Project admin | Actualizar proyecto |
| DELETE | `/api/projects/:id` | Project admin | Eliminar proyecto |
| GET | `/api/projects/:projectId/tasks` | Miembro del proyecto | Listar tareas |
| POST | `/api/projects/:projectId/tasks` | Developer+ | Crear tarea |
| GET | `/api/tasks/:id` | Miembro del proyecto | Obtener tarea (campos sensibles protegidos por Regla 6) |
| PUT | `/api/tasks/:id` | Assignee / admin | Actualizar tarea (Regla 4 aplicada) |
| DELETE | `/api/tasks/:id` | Project admin | Eliminar tarea |
| PATCH | `/api/tasks/:id/status` | Assignee / admin | Cambiar estado (Regla 3 aplicada) |
| GET | `/api/tasks/:taskId/comments` | Miembro del proyecto | Listar comentarios |
| POST | `/api/tasks/:taskId/comments` | Developer+ | Crear comentario (rate limited) |
| DELETE | `/api/comments/:id` | Autor / admin | Eliminar comentario |
| GET | `/api/notifications` | Usuario | Listar notificaciones |
| PATCH | `/api/notifications/read-all` | Usuario | Marcar todas las notificaciones como leídas |
| POST | `/api/invitations/:id/accept` | Invitado | Aceptar invitación a org |
| POST | `/api/invitations/:id/reject` | Invitado | Rechazar invitación a org |
| GET | `/api/admin/users` | super_admin | Lista paginada de usuarios |
| PATCH | `/api/admin/users/:id/deactivate` | super_admin | Desactivar cuenta de usuario |
| GET | `/api/admin/audit-logs` | super_admin | Audit log paginado (filtrable por tipo de acción) |

---

## Funcionalidades del frontend

### Autenticación

- **Registro** (`/register`): campos nombre, email, contraseña y confirmar contraseña. Verificación client-side de coincidencia impide el envío cuando los campos de contraseña difieren. Mínimo de 8 caracteres aplicado tanto en el cliente como en la API.
- **Login** (`/login`): email + contraseña. En caso de éxito, el access token se guarda en el estado Zustand en memoria; el refresh token se utiliza en `POST /api/auth/refresh` ante una respuesta 401.
- **Logout**: llama a `POST /api/auth/logout` para invalidar el refresh token en el servidor, luego limpia el estado en memoria y redirige a `/login`.
- **AuthGuard**: envuelve todas las rutas protegidas; redirige a `/login` a los usuarios no autenticados.
- **AdminGuard**: envuelve las rutas de administración; además verifica que el usuario autenticado tenga el rol de sistema `super_admin`.

### Navegación y layout

El componente `Layout` renderiza un header persistente con:
- Enlace de marca SecureCollab (va a `/orgs`)
- Links de navegación contextuales (Proyectos, Equipo) cuando se está dentro de una org
- Enlace al panel de administración (visible solo para `super_admin`)
- Nombre del usuario autenticado
- Campana de notificaciones
- Toggle de tema oscuro/claro
- Botón de logout

### Gestión de organizaciones

- Listar todas las organizaciones a las que pertenece el usuario, con contador de proyectos visible por org
- Crear organización (el creador queda como `org_admin`)
- Editar nombre y descripción de la org (solo `org_admin`)
- Eliminar organización (solo `org_admin`)
- Ver lista de miembros con nombres, emails y roles
- Eliminar miembros (solo `org_admin`; la Regla 5 impide eliminar al último admin)
- Enviar invitaciones por email con selección de rol; la invitación aparece en la campana del invitado de forma inmediata via Socket.IO

### Gestión de proyectos

- Listar todos los proyectos visibles para el usuario dentro de una org (los proyectos privados se ocultan si el usuario no es miembro del proyecto)
- Crear proyecto con nombre, descripción y visibilidad (`internal` o `private`)
- Editar nombre y descripción del proyecto
- Archivar / eliminar proyecto
- Panel de miembros del proyecto accesible desde la barra de herramientas del kanban: ver miembros actuales y agregar nuevos por ID de usuario con selección de rol (solo `project_admin`)

### Tablero Kanban (`/orgs/:orgId/projects/:projectId`)

El tablero es el espacio de trabajo principal de un proyecto.

**Vistas:**

- **Vista de tablero** (por defecto): cuatro columnas — Backlog, En Progreso, En Revisión, Hecho — con movimiento de tarjetas por drag-and-drop (deshabilitado para el rol `viewer`)
- **Vista de calendario**: cuadrícula mensual que muestra tareas por fecha de entrega; con código de color por prioridad; navegación entre meses anterior/siguiente; clic en un chip de tarea abre el panel de detalle

**Controles de la barra de herramientas:**

- Toggle entre vista de tablero y calendario
- Modal de búsqueda global (activado con el botón de búsqueda o el atajo Cmd/Ctrl+K)
- Configurador de visibilidad de columnas — activar/desactivar columnas individuales; configuración persistida en `localStorage`
- Panel de miembros del proyecto
- Botón "+ Nueva Tarea" (oculto para el rol `viewer` y en proyectos archivados)

**Tarjetas de métricas (ProjectDashboard):**

Cuatro tarjetas de métricas sobre el tablero: Total de tareas, Completadas, En Progreso, Vencidas (tareas cuya `dueDate` está en el pasado y el estado no es `done`). La tarjeta de vencidas se muestra en rojo cuando el conteo es mayor que 0.

**Filtros (vista de tablero):**

Dropdown de assignee (todos, sin asignar o miembro específico) y dropdown de prioridad (todos, critical, high, medium, low) aplicados del lado del cliente sin llamada adicional a la API.

**Tarjetas de tarea:**

Muestran título (sanitizado con DOMPurify), badge de prioridad (con código de color), fecha de entrega e indicador de candado para tareas sensibles. Las tarjetas son accesibles por teclado (tecla Enter abre el panel de detalle).

**Panel de detalle de tarea (slide-over):**

Se abre al hacer clic en una tarjeta. Muestra título, descripción (restringida por la Regla 6 para tareas sensibles), prioridad, estado, selector de assignee, selector de fecha de entrega y controles de edición/eliminación. Incluye:
- **Panel de comentarios**: comentarios encadenados con confirmación de eliminación en dos pasos; nuevos comentarios sanitizados via `sanitizeText` antes de enviarlos; DOMPurify aplicado al renderizar
- **Panel de audit log**: registro de actividad colapsable que muestra eventos de crear/actualizar/eliminar/cambio de estado de la tarea, con timestamps

### Notificaciones en tiempo real

El componente `NotificationBell` en el header muestra un badge con el conteo de no leídas. Las notificaciones se entregan por Socket.IO a través de una sala personal `user:<id>` (handshake autenticado con JWT). Tipos de notificación soportados:

| Tipo | Ícono |
|---|---|
| `task:created` | Círculo con más (índigo) |
| `task:updated` | Lápiz (amarillo) |
| `task:status_changed` | Flecha derecha (azul) |
| `task:deleted` | Papelera (rojo) |
| `comment:created` | Círculo de mensaje (verde) |
| `org.invite` | Sobre (púrpura) |

Las invitaciones a organizaciones en la campana incluyen botones de Aceptar / Rechazar. Al aceptar, se actualiza la membresía en el servidor y se elimina la invitación pendiente. El panel se cierra automáticamente al hacer clic fuera y marca las notificaciones como leídas al abrirse.

### Panel de administración (`/admin/*`)

Accesible solo para cuentas con rol de sistema `super_admin`.

- **Gestión de usuarios** (`/admin/users`): tabla paginada con nombre, email, badge de rol, estado activo/inactivo y fecha de registro. Botón de desactivar (deshabilitado para sí mismo y para otros super admins).
- **Audit logs** (`/admin/audit-logs`): tabla paginada con timestamp, tipo de acción (badge con código de color), ID del actor, tipo y ID del recurso, e IP. Dropdown de filtro por tipo de acción que cubre todos los tipos de evento auditados. Paginación basada en cursor con botón "Cargar más".

### Tema oscuro / claro

Un store Zustand persiste el tema elegido en `localStorage` bajo la clave `sc-theme`. El botón `ThemeToggle` en el header alterna entre íconos de sol y luna. La clase `dark` del elemento `<html>` se sincroniza antes del primer pintado para evitar destellos.

---

## Primeros pasos

### Requisitos previos

- Node.js >= 20
- Instancia de MongoDB (local o Atlas)

### Variables de entorno

Crea un archivo `.env` en la raíz del proyecto. Variables requeridas:

```
# .env — nunca commitear este archivo
JWT_ACCESS_SECRET=<cadena aleatoria, mínimo 32 caracteres>
JWT_REFRESH_SECRET=<cadena aleatoria, mínimo 32 caracteres, diferente del access secret>
ENCRYPTION_KEY=<64 caracteres hex = 32 bytes, generado con: node -e "require('crypto').randomBytes(32).toString('hex')">
MONGODB_URI=<cadena de conexión a MongoDB>
PORT=3000
ALLOWED_ORIGINS=http://localhost:5173
```

Para los tests, crea `.env.test` con la variable `MONGODB_URI_TEST` apuntando a una base de datos de prueba separada:

```
MONGODB_URI_TEST=mongodb://127.0.0.1:27017/securecollab_test
ENCRYPTION_KEY=<mismos 64 caracteres hex que arriba>
```

### Instalar dependencias

```bash
# Backend
npm install

# Frontend
cd client && npm install && cd ..
```

### Ejecutar en desarrollo

```bash
# Backend (nodemon, se reinicia automáticamente ante cambios)
npm run dev

# Frontend (servidor de desarrollo Vite, en una terminal separada)
npm run client:dev
```

La API escucha en `http://localhost:3000` por defecto. El servidor de desarrollo del frontend corre en `http://localhost:5173`.

### Build para producción

```bash
npm run client:build
```

La SPA compilada se deposita en `client/dist/`.

---

## Pruebas y linting

```bash
# Todos los tests de seguridad
npm test

# Lint solo del código fuente del backend
npm run lint
```

La configuración de Jest (`package.json`) ejecuta todos los archivos que coincidan con `**/tests/**/*.test.js` usando `--runInBand` (serial) para preservar el estado de los limitadores de rate entre tests de la misma suite.

Tanto el lint como todos los tests deben pasar antes de considerar completa cualquier entrega de capa de seguridad.

---

## Convenciones de commits

| Prefijo | Uso |
|---|---|
| `feat:` | Nueva funcionalidad (rutas, features de UI, modelos) |
| `security:` | Implementación o hardening de capa de seguridad |

Un commit por tarea completada. Los commits nunca se hacen directamente a `main`; se usan ramas de feature que se fusionan via pull request.

---

## Archivos de evidencia semanales

Los archivos de evidencia viven en `evidencias/` y contienen output real capturado durante el desarrollo. Nunca son fabricados.

| Clase | Capa | Archivo de evidencia |
|---|---|---|
| 9 | Rate limiting | `evidencias/clase-9-rate-limiting.md` |
| 10 | Audit logging | `evidencias/clase-10-audit.md` |
| 11 | ABAC | `evidencias/clase-11-abac.md` |
| 12 | Cifrado en reposo | `evidencias/clase-12-cifrado.md` |
| 13 | Security testing | `evidencias/clase-13-tests.md` |
| 14 | Frontend + auth | `evidencias/clase-14-frontend.md` |
| 15 | OWASP API Security Top 10 | `evidencias/clase-15-owasp.md` |
