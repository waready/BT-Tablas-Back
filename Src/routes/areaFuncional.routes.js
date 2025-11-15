// src/routes/areaFuncional.routes.js
import * as Controller from '../controllers/areaFuncional.controller.js'

export default async function areaFuncionalRoutes(app) {
    const ParamsId = {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'integer', minimum: 1 } }
    }

    const ListQuery = {
        type: 'object',
        properties: {
            page: { type: 'integer', minimum: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100 },
            search: { type: 'string' },
            sortBy: { type: 'string', enum: ['id', 'codigo', 'descripcion', 'createdAt', 'updatedAt'] },
            order: { type: 'string', enum: ['asc', 'desc'] }
        }
    }

    const BodyCreate = {
        type: 'object',
        required: ['nombre', 'codigo'],
        additionalProperties: false,
        properties: {
            nombre: { type: 'string', minLength: 1 },
            codigo: { type: 'string', minLength: 1 }
        }
    }

    const BodyUpdate = {
        type: 'object',
        additionalProperties: false,
        properties: {
            nombre: { type: 'string', minLength: 1 },
            codigo: { type: 'string', minLength: 1 }
        }
    }

    app.get('/areas-funcionales', {
        schema: {
            tags: ['AreaFuncional'],
            summary: 'Listar áreas funcionales',
            querystring: ListQuery
        }
    }, (req, reply) => Controller.list(app, req, reply))

    app.get('/areas-funcionales/:id', {
        schema: {
            tags: ['AreaFuncional'],
            summary: 'Obtener área funcional por ID',
            params: ParamsId
        }
    }, (req, reply) => Controller.get(app, req, reply))

    app.post('/areas-funcionales', {
        // preHandler: app.auth,
        schema: {
            tags: ['AreaFuncional'],
            summary: 'Crear área funcional',
            body: BodyCreate
        }
    }, (req, reply) => Controller.create(app, req, reply))

    app.put('/areas-funcionales/:id', {
        // preHandler: app.auth,
        schema: {
            tags: ['AreaFuncional'],
            summary: 'Actualizar área funcional',
            params: ParamsId,
            body: BodyUpdate
        }
    }, (req, reply) => Controller.update(app, req, reply))

    app.delete('/areas-funcionales/:id', {
        // preHandler: app.auth,
        schema: {
            tags: ['AreaFuncional'],
            summary: 'Eliminar área funcional',
            params: ParamsId
        }
    }, (req, reply) => Controller.remove(app, req, reply))
}
