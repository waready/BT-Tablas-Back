// src/controllers/role.controller.js
import * as RoleService from '../services/role.service.js'

export async function list(app, req, reply) {
    const { q, skip, take } = req.query || {}
    const data = await RoleService.list(app, { q, skip, take })
    return reply.send(data)
}

export async function get(app, req, reply) {
    const { id } = req.params
    const role = await RoleService.getById(app, id)
    return reply.send(role)
}

export async function create(app, req, reply) {
    const { name, description } = req.body
    const role = await RoleService.create(app, { name, description })
    return reply.code(201).send(role)
}

export async function update(app, req, reply) {
    const { id } = req.params
    const { name, description } = req.body
    const role = await RoleService.update(app, id, { name, description })
    return reply.send(role)
}

export async function remove(app, req, reply) {
    const { id } = req.params
    const res = await RoleService.remove(app, id)
    return reply.send(res)
}

export async function setPermissions(app, req, reply) {
    const { id } = req.params
    const { permissions } = req.body
    const role = await RoleService.setPermissions(app, id, permissions || [])
    return reply.send(role)
}
