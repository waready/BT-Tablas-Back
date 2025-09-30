// src/routes/permission.routes.js
import * as Controller from '../controllers/permission.controller.js'

export default async function permissionRoutes(app) {
    const adminOnly = [app.requireRole('admin')]

    const BodyCreate = {
        type: 'object',
        required: ['resource', 'action'],
        additionalProperties: false,
        properties: {
            resource: { type: 'string', minLength: 1 },
            action: { type: 'string', minLength: 1 },
            description: { type: ['string', 'null'] }
        }
    }

    const PermId = { type: 'object', required: ['id'], properties: { id: { type: 'string', minLength: 10 } } }

    app.get('/permissions', {
        preHandler: [app.requireAuth],
        schema: {
            tags: ['RBAC'],
            summary: 'Listar permisos',
            security: [{ bearerAuth: [] }],
            querystring: {
                type: 'object',
                properties: {
                    q: { type: 'string' },
                    resource: { type: 'string' },
                    action: { type: 'string' },
                    skip: { type: 'integer', minimum: 0 },
                    take: { type: 'integer', minimum: 1, maximum: 100 }
                }
            }
        }
    }, (req, reply) => Controller.list(app, req, reply))

    app.post('/permissions', {
        preHandler: adminOnly,
        schema: {
            tags: ['RBAC'],
            summary: 'Crear permiso',
            security: [{ bearerAuth: [] }],
            body: BodyCreate
        }
    }, (req, reply) => Controller.create(app, req, reply))

    app.delete('/permissions/:id', {
        preHandler: adminOnly,
        schema: {
            tags: ['RBAC'],
            summary: 'Eliminar permiso',
            security: [{ bearerAuth: [] }],
            params: PermId
        }
    }, (req, reply) => Controller.remove(app, req, reply))
}
