// src/routes/role.routes.js
import * as Controller from '../controllers/role.controller.js'

export default async function roleRoutes(app) {
    const adminOnly = [app.requireRole('admin')]

    const RoleId = { type: 'object', required: ['id'], properties: { id: { type: 'string', minLength: 10 } } }

    const BodyCreate = {
        type: 'object',
        required: ['name'],
        additionalProperties: false,
        properties: {
            name: { type: 'string', minLength: 2 },
            description: { type: ['string', 'null'] }
        }
    }

    const BodyUpdate = {
        type: 'object',
        additionalProperties: false,
        properties: {
            name: { type: 'string', minLength: 2 },
            description: { type: ['string', 'null'] }
        }
    }

    const BodySetPerms = {
        type: 'object',
        required: ['permissions'],
        additionalProperties: false,
        properties: {
            permissions: {
                type: 'array',
                items: {
                    anyOf: [
                        { type: 'string', pattern: '^[a-zA-Z0-9_\\-]+:[a-zA-Z0-9_\\-]+$' }, // "resource:action"
                        {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                resource: { type: 'string' },
                                action: { type: 'string' }
                            }
                        }
                    ]
                }
            }
        }
    }

    app.get('/roles', {
        preHandler: [app.requireAuth],
        schema: { tags: ['RBAC'], summary: 'Listar roles', security: [{ bearerAuth: [] }] }
    }, (req, reply) => Controller.list(app, req, reply))

    app.get('/roles/:id', {
        preHandler: [app.requireAuth],
        schema: { tags: ['RBAC'], summary: 'Obtener rol', security: [{ bearerAuth: [] }], params: RoleId }
    }, (req, reply) => Controller.get(app, req, reply))

    app.post('/roles', {
        preHandler: adminOnly,
        schema: { tags: ['RBAC'], summary: 'Crear rol', security: [{ bearerAuth: [] }], body: BodyCreate }
    }, (req, reply) => Controller.create(app, req, reply))

    app.put('/roles/:id', {
        preHandler: adminOnly,
        schema: { tags: ['RBAC'], summary: 'Actualizar rol', security: [{ bearerAuth: [] }], params: RoleId, body: BodyUpdate }
    }, (req, reply) => Controller.update(app, req, reply))

    app.delete('/roles/:id', {
        preHandler: adminOnly,
        schema: { tags: ['RBAC'], summary: 'Eliminar rol', security: [{ bearerAuth: [] }], params: RoleId }
    }, (req, reply) => Controller.remove(app, req, reply))

    app.post('/roles/:id/permissions', {
        preHandler: adminOnly,
        schema: { tags: ['RBAC'], summary: 'Reemplazar permisos del rol', security: [{ bearerAuth: [] }], params: RoleId, body: BodySetPerms }
    }, (req, reply) => Controller.setPermissions(app, req, reply))
}
