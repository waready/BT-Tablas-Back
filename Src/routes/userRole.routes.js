// src/routes/userRole.routes.js
import * as Controller from '../controllers/userRole.controller.js'

export default async function userRoleRoutes(app) {
    const adminOnly = [app.requireRole('admin')]

    const UserId = { type: 'object', required: ['userId'], properties: { userId: { type: 'string', minLength: 10 } } }
    const UserRoleParams = {
        type: 'object',
        required: ['userId', 'roleId'],
        properties: {
            userId: { type: 'string', minLength: 10 },
            roleId: { type: 'string', minLength: 10 }
        }
    }
    const BodySet = {
        type: 'object',
        required: ['roles'],
        additionalProperties: false,
        properties: {
            roles: {
                type: 'array',
                items: {
                    anyOf: [
                        { type: 'string' }, // nombre del rol
                        { type: 'object', properties: { id: { type: 'string' } } }
                    ]
                }
            }
        }
    }

    app.get('/users/:userId/roles', {
        preHandler: adminOnly,
        schema: { tags: ['RBAC'], summary: 'Listar roles de un usuario', security: [{ bearerAuth: [] }], params: UserId }
    }, (req, reply) => Controller.listUserRoles(app, req, reply))

    app.post('/users/:userId/roles', {
        preHandler: adminOnly,
        schema: { tags: ['RBAC'], summary: 'Reemplazar roles de un usuario', security: [{ bearerAuth: [] }], params: UserId, body: BodySet }
    }, (req, reply) => Controller.setUserRoles(app, req, reply))

    app.delete('/users/:userId/roles/:roleId', {
        preHandler: adminOnly,
        schema: { tags: ['RBAC'], summary: 'Quitar un rol al usuario', security: [{ bearerAuth: [] }], params: UserRoleParams }
    }, (req, reply) => Controller.removeUserRole(app, req, reply))
}
