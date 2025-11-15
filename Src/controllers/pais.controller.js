// src/controllers/pais.controller.js
import * as PaisService from '../services/pais.service.js'

export async function list(app, req, reply) {
    const { page, limit, search, sortBy, order } = req.query || {}  
    const data = await PaisService.list(app, { page, limit, search, sortBy, order })
    return reply.send(data)
}

export async function get(app, req, reply) {
    const { id } = req.params
    const pais = await PaisService.getById(app, id)
    return reply.send(pais)
}

export async function create(app, req, reply) {
    const { nombre, isoCode } = req.body
    const pais = await PaisService.create(app, { nombre, isoCode })
    return reply.code(201).send(pais)
}

export async function update(app, req, reply) {
    const { id } = req.params
    const { nombre, isoCode } = req.body
    const pais = await PaisService.update(app, id, { nombre, isoCode })
    return reply.send(pais)
}

export async function remove(app, req, reply) {
    const { id } = req.params
    const res = await PaisService.remove(app, id)
    return reply.send(res)
}
