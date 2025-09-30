// src/controllers/permission.controller.js
import * as PermissionService from '../services/permission.service.js'

export async function list(app, req, reply) {
    const { q, resource, action, skip, take } = req.query || {}
    const data = await PermissionService.list(app, { q, resource, action, skip, take })
    return reply.send(data)
}

export async function create(app, req, reply) {
    const { resource, action, description } = req.body
    const perm = await PermissionService.create(app, { resource, action, description })
    return reply.code(201).send(perm)
}

export async function remove(app, req, reply) {
    const { id } = req.params
    const res = await PermissionService.remove(app, id)
    return reply.send(res)
}
