# Fastify Pro Starter


## Requisitos
- Node 18+
- PostgreSQL 13+


## Pasos
1. Copia `.env.example` a `.env` y ajusta.
2. Instala deps: `npm i`.
3. Migraciones: `npm run m:dev -- --name init`.
4. Seed: `npm run seed`.
5. Levanta: `npm run dev`.
6. Docs Swagger: abre `http://localhost:3000/docs`.


### Login
POST `/api/auth/login` body `{ "email": "admin@example.com", "password": "admin123" }` → token.


### Endpoints protegidos
- GET `/api/users` (users.read)
- POST `/api/users` (users.create)
- PUT `/api/users/:id` (users.update)
- DELETE `/api/users/:id` (users.delete)
- POST `/api/export/users` (reports.export)
- POST `/api/export/sql` (sql.export) → `{ sql: "SELECT ..." }`


## Seguridad SQL
- Solo `SELECT` permitido en `/api/export/sql`.
- `LIMIT` forzado si falta (env `SQL_MAX_LIMIT`).
- `statement_timeout` (env `SQL_STATEMENT_TIMEOUT_MS`).
- Recomiendo exponer **vistas** de solo lectura para reportes.


## Auditoría
- Automática vía middleware Prisma sobre `create/update/delete/upsert` → tabla `AuditLog`.
- Puedes añadir hooks por ruta para auditar lecturas críticas.


## Testing (Vitest)
- Ya incluido como devDependency y script `npm test`.
- Ejemplo rápido en `tests/rbac.test.js`:


```js
import { describe, it, expect } from 'vitest'
import { userPermissions } from '../src/utils/rbac.js'


// Mock minimal de prisma
const prisma = {
userRole: {
findMany: async () => ([{
role: { permissions: [{ permission: { resource: 'users', action: 'read' } }] }
}])
}
}


describe('RBAC', () => {
it('agrega permiso users.read', async () => {
const perms = await userPermissions(prisma, 'u1')
expect(perms.has('users.read')).toBe(true)
})
})