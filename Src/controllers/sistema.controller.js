// src/controllers/sistema.controller.js
import * as SistemaService from '../services/sistema.service.js'

export async function list(app, req, reply) {
    const { q, area, cod_sistema, skip, take } = req.query || {}
    const data = await SistemaService.list(app, { q, area, cod_sistema, skip, take })
    return reply.send(data)
}

export async function get(app, req, reply) {
    const { id } = req.params
    const sys = await SistemaService.getById(app, id)
    return reply.send(sys)
}

export async function create(app, req, reply) {
    const sys = await SistemaService.create(app, req.body)
    return reply.code(201).send(sys)
}

export async function update(app, req, reply) {
    const { id } = req.params
    const sys = await SistemaService.update(app, id, req.body)
    return reply.send(sys)
}

export async function remove(app, req, reply) {
    const { id } = req.params
    const res = await SistemaService.remove(app, id)
    return reply.send(res)
}
