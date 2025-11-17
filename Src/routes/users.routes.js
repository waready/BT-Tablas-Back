// src/routes/user.routes.js
import { makeUserController } from '../controllers/users.controller.js'

export default async function userRoutes (app) {
  const ctrl = makeUserController(app)

  // GET /api/v1/users
  app.get('/users', {
    preHandler: [app.requireAuth],
    schema: {
      tags: ['RBAC'],
      description: 'Listar usuarios',
      security: [{ bearerAuth: [] }]
    }
  }, ctrl.list)

  // GET /api/v1/users/:id
  app.get('/users/:id', {
    preHandler: [app.requireAuth],
    schema: {
      tags: ['RBAC'],
      description: 'Obtener usuario',
      security: [{ bearerAuth: [] }]
    }
  }, ctrl.get)

  // POST /api/v1/users
  app.post('/users', {
    preHandler: [app.requireAuth],
    schema: {
      tags: ['RBAC'],
      description: 'Crear usuario',
      security: [{ bearerAuth: [] }]
    }
  }, ctrl.create)

  // PUT /api/v1/users/:id
  app.put('/users/:id', {
    preHandler: [app.requireAuth],
    schema: {
      tags: ['RBAC'],
      description: 'Actualizar usuario',
      security: [{ bearerAuth: [] }]
    }
  }, ctrl.update)

  // DELETE /api/v1/users/:id
  app.delete('/users/:id', {
    preHandler: [app.requireAuth],
    schema: {
      tags: ['RBAC'],
      description: 'Eliminar usuario',
      security: [{ bearerAuth: [] }]
    }
  }, ctrl.remove)
}
