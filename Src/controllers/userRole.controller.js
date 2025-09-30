// src/controllers/userRole.controller.js
import * as UserRoleService from '../services/userRole.service.js'

export async function listUserRoles(app, req, reply) {
    const { userId } = req.params
    const roles = await UserRoleService.getUserRoles(app, userId)
    return reply.send({ items: roles })
}

export async function setUserRoles(app, req, reply) {
    const { userId } = req.params
    const { roles } = req.body
    const items = await UserRoleService.setUserRoles(app, userId, roles || [])
    return reply.send({ items })
}

export async function removeUserRole(app, req, reply) {
    const { userId, roleId } = req.params
    const res = await UserRoleService.removeUserRole(app, userId, roleId)
    return reply.send(res)
}
