// src/controllers/inventarioTabla.controller.js
import * as Svc from '../services/inventarioTabla.service.js'

export async function index(app, req, reply) {
    const { page, limit, search, sortBy, order } = req.query || {}
    const data = await Svc.list(app, { page, limit, search, sortBy, order })
    return reply.send(data)
}

export async function show(app, req, reply) {
    const { id } = req.params
    const data = await Svc.getById(app, id)
    return reply.send(data)
}

export async function create(app, req, reply) {
    const body = req.body
    // opcional: asignar userId del token
    const userId = req.user?.sub ?? null
    const data = await Svc.create(app, { ...body, userId })
    return reply.code(201).send(data)
}

export async function update(app, req, reply) {
    const { id } = req.params
    const body = req.body
    const data = await Svc.update(app, id, body)
    return reply.send(data)
}

export async function remove(app, req, reply) {
    const { id } = req.params
    const res = await Svc.remove(app, id)
    return reply.send(res)
}

export async function exportExcel(app, req, reply) {
    const { query } = req.body || {}
    if (!query || !String(query).trim()) return reply.code(400).send({ error: 'Falta query' })
    const { buffer } = await Svc.exportSqlToExcel(app, query)
    if (!buffer) return reply.code(400).send({ error: 'Sin datos' })
    reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    reply.header('Content-Disposition', 'attachment; filename="reporte.xlsx"')
    return reply.send(buffer)
}

export async function importExcel(app, req, reply) {
    // Recibe { path: 'public/uploads/...' }
    const { path } = req.body || {}
    if (!path) return reply.code(400).send({ error: 'Falta path' })
    const res = await Svc.importFromExcel(app, path)
    return reply.send(res)
}
