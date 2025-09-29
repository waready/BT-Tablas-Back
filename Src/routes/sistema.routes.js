// src/routes/sistema.routes.js
import * as SistemaController from '../controllers/sistema.controller.js'

export default async function sistemasRoutes(app) {
    const ParamsId = {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'integer', minimum: 1 } }
    }

    const ListQuery = {
        type: 'object',
        properties: {
            q: { type: 'string' },
            area: { type: 'integer', minimum: 0 },          // cod_area_funcional
            cod_sistema: { type: 'integer', minimum: 0 },
            skip: { type: 'integer', minimum: 0 },
            take: { type: 'integer', minimum: 1, maximum: 100 }
        }
    }

    const BodyCreate = {
        type: 'object',
        required: ['sistema', 'cod_area_funcional', 'cod_sistema', 'corr'],
        additionalProperties: false,
        properties: {
            sistema: { type: 'string', minLength: 1 },
            cod_area_funcional: { type: 'integer' },
            cod_sistema: { type: 'integer' },
            corr: { type: 'integer' }
        }
    }

    const BodyUpdate = {
        type: 'object',
        additionalProperties: false,
        properties: {
            sistema: { type: 'string', minLength: 1 },
            cod_area_funcional: { type: 'integer' },
            cod_sistema: { type: 'integer' },
            corr: { type: 'integer' }
        }
    }

    // GET /sistemas
    app.get('/sistemas', {
        schema: {
            tags: ['Sistema'],
            summary: 'Listar sistemas',
            querystring: ListQuery
        }
    }, (req, reply) => SistemaController.list(app, req, reply))

    // GET /sistemas/:id
    app.get('/sistemas/:id', {
        schema: {
            tags: ['Sistema'],
            summary: 'Obtener sistema por ID',
            params: ParamsId
        }
    }, (req, reply) => SistemaController.get(app, req, reply))

    // POST /sistemas
    app.post('/sistemas', {
        // preHandler: app.auth, // <-- descomenta si quieres proteger
        schema: {
            tags: ['Sistema'],
            summary: 'Crear sistema',
            body: BodyCreate
        }
    }, (req, reply) => SistemaController.create(app, req, reply))

    // PUT /sistemas/:id
    app.put('/sistemas/:id', {
        // preHandler: app.auth,
        schema: {
            tags: ['Sistema'],
            summary: 'Actualizar sistema',
            params: ParamsId,
            body: BodyUpdate
        }
    }, (req, reply) => SistemaController.update(app, req, reply))

    // DELETE /sistemas/:id (sin body!)
    app.delete('/sistemas/:id', {
        // preHandler: app.auth,
        schema: {
            tags: ['Sistema'],
            summary: 'Eliminar sistema',
            params: ParamsId
        }
    }, (req, reply) => SistemaController.remove(app, req, reply))
}
