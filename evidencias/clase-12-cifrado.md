# Clase 12 — Cifrado en Reposo (AES-256-GCM)

## Objetivo

Demostrar que los campos sensibles se almacenan cifrados en MongoDB y se descifran automáticamente cuando la API responde al cliente.

## Implementación

- **Algoritmo:** AES-256-GCM (AEAD — confidencialidad + integridad)
- **Clave:** 32 bytes en hexadecimal, almacenada en `.env` como `ENCRYPTION_KEY`
- **IV:** 12 bytes aleatorios generados por llamada (`crypto.randomBytes(12)`)
- **Formato en BD:** `ENC:<base64(IV[12B] | AuthTag[16B] | Ciphertext)>`
- **Archivos modificados:**
  - `src/utils/encryption.js` — funciones `encrypt()` y `decrypt()`
  - `src/models/Project.js` — setter/getter en `description` (siempre cifrado)
  - `src/models/Task.js` — getter en `description` + pre-save hook (cifrado sólo si `sensitive: true`)

---

## Evidencia 1 — Project.description cifrado en MongoDB

> **Instrucción:** Captura de pantalla de MongoDB Compass mostrando el documento del proyecto con `description` como cadena base64 ilegible.

![Project description cifrada en MongoDB](Screenshots/Screenshot%201.png)

**cURL para crear el proyecto:**

```bash
curl -s -X POST http://localhost:3000/api/orgs/<orgId>/projects \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Proyecto Demo","description":"Descripcion confidencial del proyecto"}'
```

---

## Evidencia 2 — GET /api/projects/:id devuelve texto plano

> **Instrucción:** Captura de pantalla o salida de cURL mostrando la respuesta de la API con `description` en texto legible.

![GET project devuelve descripción en texto plano](Screenshots/Screenshot%202.png)

**cURL:**

```bash
curl -s http://localhost:3000/api/projects/<projectId> \
  -H "Authorization: Bearer <token>"
```

**Respuesta esperada (fragmento):**

```json
{
  "_id": "6a307741e6d9c92b37f4c899",
  "name": "Proyecto Demo",
  "description": "Descripcion confidencial del proyecto",
  "orgId": "6a307729e6d9c92b37f4c894",
  "visibility": "internal",
  "members": [
    {
      "userId": "6a3075e4e6d9c92b37f4c887",
      "role": "project_admin"
    }
  ],
  "status": "active",
  "createdAt": "2026-06-15T22:05:53.220Z",
  "__v": 0,
  "id": "6a307741e6d9c92b37f4c899"
}
```

---

## Evidencia 3 — Task con `sensitive: true` cifrada en MongoDB

> **Instrucción:** Captura de pantalla de MongoDB Compass mostrando el documento de la tarea con `description` cifrada (campo `ENC:...`).

![Task sensitive:true cifrada en MongoDB](Screenshots/Screenshot%203.png)

**cURL para crear la tarea:**

```bash
curl -s -X POST http://localhost:3000/api/projects/<projectId>/tasks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Tarea Sensible","description":"Datos confidenciales del cliente","sensitive":true}'
```

---

## Evidencia 4 — GET tarea sensible devuelve descripción descifrada

**cURL:**

```bash
curl -s http://localhost:3000/api/tasks/<taskId> \
  -H "Authorization: Bearer <token>"
```

**Respuesta esperada:**

```json
{
  "_id": "...",
  "title": "Tarea Sensible",
  "description": "Datos confidenciales del cliente",
  "sensitive": true,
  ...
}
```

![GET task devuelve descripción descifrada](Screenshots/Screenshot%204.png)

---

## Evidencia 5 — Task con `sensitive: false` en texto plano en MongoDB

> **Instrucción:** Captura de pantalla de MongoDB Compass mostrando una tarea con `sensitive: false` donde `description` aparece en texto plano.

![Task sensitive:false en texto plano en MongoDB](Screenshots/Screenshot%205.png)

---

## Pruebas de seguridad

```bash
npm test
```

**Salida real (2026-06-11):**

```
> securecollab@1.0.0 test
> NODE_OPTIONS=--experimental-vm-modules jest --runInBand --forceExit

PASS tests/security/encryption.test.js
  AES-256-GCM Encryption Utility
    ✓ roundtrip: decrypt(encrypt(plaintext)) === plaintext (1 ms)
    ✓ semantic security: same plaintext produces different ciphertexts (random IV)
    ✓ encrypted output carries the ENC: prefix marker
    ✓ auth tag integrity: tampered auth tag causes decrypt to return null (1 ms)
    ✓ malformed ENC: payload (too short) returns null without throwing
    ✓ plain-text passthrough: decrypt leaves non-encrypted strings unchanged
    ✓ null/undefined passthrough: encrypt and decrypt handle falsy values without throwing (1 ms)

Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
Snapshots:   0 total
Time:        0.138 s
```

---

## Conclusión

La implementación de AES-256-GCM garantiza:

1. **Confidencialidad:** Un atacante con acceso directo a MongoDB sólo ve cadenas base64 ilegibles.
2. **Integridad:** El auth tag de GCM detecta cualquier modificación directa en los bytes cifrados.
3. **Transparencia para la API:** Los getters de Mongoose descifran automáticamente antes de serializar la respuesta JSON, sin cambios en los route handlers.
4. **Cifrado condicional:** Sólo las tareas con `sensitive: true` cifran su descripción — las no sensibles permanecen en texto plano, optimizando rendimiento.
