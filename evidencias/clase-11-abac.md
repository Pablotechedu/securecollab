# Clase 11 — ABAC Evidence

## Política implementada

El acceso a tareas se controla por tres atributos: el rol del usuario en el proyecto (`project_admin`, `developer`, `viewer`), la identidad del `assigneeId` de la tarea, y el estado del proyecto (`archived`). Las funciones puras en `src/policies/taskPolicies.js` evalúan estos atributos; el middleware en `src/middleware/checkPermission.js` las invoca tras consultar la membresía del usuario desde `Project.members`.

---

---

## Curl 1: viewer lee tarea → 200

```bash
curl -si -X GET http://localhost:3000/api/tasks/6a1270a372b4cc1630bfd4ac \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2YTEyNmFmYzViYWQ5YmQ1NzQxNzVmOTciLCJlbWFpbCI6InZpZXdlckB0ZXN0LmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzc5NTkzMzc5LCJleHAiOjE3Nzk1OTQyNzl9.A__c4omGD5Wq0y5nhNd8Rjt5KdyHirmpHB3oeJQQ0Q4"
```

```
HTTP 200
{
  "_id": "6a1270a372b4cc1630bfd4ac",
  "title": "Task assigned to Dev A",
  "projectId": "6a1270a372b4cc1630bfd49b",
  "assigneeId": "6a126af55bad9bd574175f92",
  "reporterId": "6a126adb5bad9bd574175f8d",
  "status": "backlog",
  "priority": "medium",
  "sensitive": false,
  "dueDate": null,
  "createdAt": "2026-05-24T03:29:39.747Z",
  "updatedAt": "2026-05-24T03:29:39.747Z",
  "__v": 0
}
```

---

## Curl 2: viewer intenta crear tarea → 403

```bash
curl -si -X POST http://localhost:3000/api/projects/6a1270a372b4cc1630bfd49b/tasks \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2YTEyNmFmYzViYWQ5YmQ1NzQxNzVmOTciLCJlbWFpbCI6InZpZXdlckB0ZXN0LmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzc5NTkzMzc5LCJleHAiOjE3Nzk1OTQyNzl9.A__c4omGD5Wq0y5nhNd8Rjt5KdyHirmpHB3oeJQQ0Q4" \
  -H "Content-Type: application/json" \
  -d '{"title":"Viewer task attempt","priority":"low"}'
```

```
HTTP 403
{
  "error": "Forbidden"
}
```

---

## Curl 3: developer edita tarea de otro developer → 403

```bash
# Dev B intenta editar una tarea asignada a Dev A
curl -si -X PUT http://localhost:3000/api/tasks/6a1270a372b4cc1630bfd4ac \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2YTEyNzBhMjcyYjRjYzE2MzBiZmQ0N2QiLCJlbWFpbCI6ImRldmJAdGVzdC5jb20iLCJyb2xlIjoidXNlciIsImlhdCI6MTc3OTU5MzM3OSwiZXhwIjoxNzc5NTk0Mjc5fQ.r3ItG_yeA_GJ-JdnxhVQgI6zxnY6xWUMCTOTxGeya5U" \
  -H "Content-Type: application/json" \
  -d '{"title":"Unauthorized edit attempt"}'
```

```
HTTP 403
{
  "error": "Forbidden"
}
```

---

## Archivos implementados

| Archivo                             | Descripción                                                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `src/models/membership.model.js`    | Modelo Mongoose: `userId`, `projectId`, `role`; índice compuesto único `{userId,projectId}`                         |
| `src/middleware/checkPermission.js` | `canReadTask(user, task)` y `canEditTask(user, task)` — consultan `Project.members` para obtener el rol del usuario |
| `src/policies/taskPolicies.js`      | Funciones puras de evaluación ABAC (sin llamadas a DB)                                                              |
| `src/routes/tasksById.js`           | `GET /api/tasks/:id` y `PUT /api/tasks/:id` aplican `checkPermission`                                               |

## Reglas ABAC completas

| Política                      | Regla                                                                                                                       |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `canReadTask`                 | Cualquier miembro del proyecto (viewer+) puede leer                                                                         |
| `canCreateTask`               | Solo `developer` o `project_admin` puede crear                                                                              |
| `canEditTask`                 | `project_admin` edita cualquier tarea; `developer` solo edita tareas donde es `assigneeId`; proyectos archivados bloqueados |
| `canChangeStatus`             | Mover a `done` requiere ser el `assigneeId` o `project_admin`                                                               |
| `canViewSensitiveDescription` | Descripción sensible solo visible para `assigneeId` y `project_admin`                                                       |
