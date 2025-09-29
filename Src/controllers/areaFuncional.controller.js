// src/controllers/areaFuncional.controller.js
import * as AreaFuncionalService from '../services/areaFuncional.service.js'

export async function list(app, req, reply) {
    const { q, codigo, skip, take } = req.query || {}
    const data = await AreaFuncionalService.list(app, { q, codigo, skip, take })
    return reply.send(data)
}

export async function get(app, req, reply) {
    const { id } = req.params
    const area = await AreaFuncionalService.getById(app, id)
    return reply.send(area)
}

export async function create(app, req, reply) {
    const { nombre, codigo } = req.body
    const area = await AreaFuncionalService.create(app, { nombre, codigo })
    return reply.code(201).send(area)
}

export async function update(app, req, reply) {
    const { id } = req.params
    const { nombre, codigo } = req.body
    const area = await AreaFuncionalService.update(app, id, { nombre, codigo })
    return reply.send(area)
}

export async function remove(app, req, reply) {
    const { id } = req.params
    const res = await AreaFuncionalService.remove(app, id)
    return reply.send(res)
}
