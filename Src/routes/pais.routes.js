// src/routes/pais.routes.js
import * as PaisController from '../controllers/pais.controller.js'

export default async function paisesRoutes(app) {
    // Schemas para validación + Swagger
    const PaisBodyCreate = {
        type: 'object',
        required: ['nombre'],
        properties: {
            nombre: { type: 'string', minLength: 1 },
            isoCode: { type: ['string', 'null'], minLength: 2, maxLength: 3 }
        }
    }

    const PaisBodyUpdate = {
        type: 'object',
        additionalProperties: false,
        properties: {
            nombre: { type: 'string', minLength: 1 },
            isoCode: { type: ['string', 'null'], minLength: 2, maxLength: 3 }
        }
    }

    const PaisParamsId = {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'integer', minimum: 1 }
        }
    }

    const ListQuery = {
        type: 'object',
        properties: {
            q: { type: 'string' },
            skip: { type: 'integer', minimum: 0 },
            take: { type: 'integer', minimum: 1, maximum: 100 }
        }
    }

    // GET /paises
    app.get('/paises', {
        schema: {
            tags: ['Pais'],
            summary: 'Listar países',
            querystring: ListQuery
        }
    }, (req, reply) => PaisController.list(app, req, reply))

    // GET /paises/:id
    app.get('/paises/:id', {
        schema: {
            tags: ['Pais'],
            summary: 'Obtener país por ID',
            params: PaisParamsId
        }
    }, (req, reply) => PaisController.get(app, req, reply))

    // POST /paises
    app.post('/paises', {
        // Si quieres proteger: añade preHandler: app.auth
        schema: {
            tags: ['Pais'],
            summary: 'Crear país',
            body: PaisBodyCreate
        }
    }, (req, reply) => PaisController.create(app, req, reply))

    // PUT /paises/:id
    app.put('/paises/:id', {
        // preHandler: app.auth,
        schema: {
            tags: ['Pais'],
            summary: 'Actualizar país',
            params: PaisParamsId,
            body: PaisBodyUpdate
        }
    }, (req, reply) => PaisController.update(app, req, reply))

    // DELETE /paises/:id
    app.delete('/paises/:id', {
        // preHandler: app.auth,
        schema: {
            tags: ['Pais'],
            summary: 'Eliminar país',
            params: PaisParamsId
        }
    }, (req, reply) => PaisController.remove(app, req, reply))
}
