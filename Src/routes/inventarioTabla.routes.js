// src/routes/inventarioTabla.routes.js
import * as Controller from '../controllers/inventarioTabla.controller.js'

export default async function inventarioTablaRoutes(app) {
    // Protege todo el módulo con login; si quieres, cambia por app.authorize('menu:inventarios')
    const mustAuth = [app.requireAuth]

    const ListQuery = {
        type: 'object',
        properties: {
            page: { type: 'integer', minimum: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 500 },
            search: { type: 'string' },
            sortBy: { type: 'string', enum: ['id', 'codigo', 'descripcion', 'datos', 'area_funcional', 'sistema', 'pais', 'en_desarrollo', 'capa',
                'createdAt', 'updatedAt'] },
            order: { type: 'string', enum: ['asc', 'desc'] }
        }
    }

    const IdParam = { type: 'object', required: ['id'], properties: { id: { type: 'integer', minimum: 1 } } }

    const BodyCreateUpdate = {
        type: 'object',
        additionalProperties: true,
        properties: {
            codigo: { type: 'string', minLength: 1 },
            descripcion: { type: 'string', minLength: 1 },
            datos: { type: ['string', 'null'] },

            // 👇 STRING, no boolean
            en_desarrollo: { type: ['string', 'null'] }, // o { anyOf: [{type:'string', enum: enDesarrolloEnum}, {type:'null'}] }

            capa: { type: ['string', 'null'] },
            usuario: { type: ['string', 'null'] },

            // FKs como integer|null
            areaFuncionalId: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
            sistemaId: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
            paisId: { anyOf: [{ type: 'integer' }, { type: 'null' }] },

            userId: { anyOf: [{ type: 'string' }, { type: 'null' }] },

            documento_detalle: { type: ['string', 'null'] },
            depende_de_la_plaza: { type: ['boolean', 'null'] },
            comentarios: { type: ['string', 'null'] },
            depende_del_entorno: { type: ['boolean', 'null'] },
            ambiente_testing: { type: ['string', 'null'] },
            borrar: { type: ['boolean', 'null'] }
        }
    }

    app.get('/inventarios', {
        //preHandler: mustAuth,
        schema: { tags: ['Inventario'], summary: 'Listar inventarios', security: [{ bearerAuth: [] }], querystring: ListQuery }
    }, (req, reply) => Controller.index(app, req, reply))

    app.get('/inventarios/:id', {
        //preHandler: mustAuth,
        schema: { tags: ['Inventario'], summary: 'Obtener inventario', security: [{ bearerAuth: [] }], params: IdParam }
    }, (req, reply) => Controller.show(app, req, reply))

    app.post('/inventarios', {
        //preHandler: mustAuth,
        schema: { tags: ['Inventario'], summary: 'Crear inventario', security: [{ bearerAuth: [] }], body: BodyCreateUpdate }
    }, (req, reply) => Controller.create(app, req, reply))

    app.put('/inventarios/:id', {
        //preHandler: mustAuth,
        schema: { tags: ['Inventario'], summary: 'Actualizar inventario', security: [{ bearerAuth: [] }], params: IdParam, body: BodyCreateUpdate }
    }, (req, reply) => Controller.update(app, req, reply))

    app.delete('/inventarios/:id', {
        //preHandler: mustAuth,
        schema: { tags: ['Inventario'], summary: 'Eliminar inventario', security: [{ bearerAuth: [] }], params: IdParam }
    }, (req, reply) => Controller.remove(app, req, reply))

    // Exportar a Excel desde SQL
    app.post('/inventarios/export-excel', {
        //preHandler: mustAuth,
        schema: {
            tags: ['Inventario'],
            summary: 'Exportar a Excel desde SQL',
            //security: [{ bearerAuth: [] }],
            body: { type: 'object', required: ['query'], properties: { query: { type: 'string', minLength: 6 } } }
        }
    }, (req, reply) => Controller.exportExcel(app, req, reply))

    // Importar desde Excel (ruta en disco)
    app.post('/inventarios/import-excel', {
        //preHandler: mustAuth,
        schema: {
            tags: ['Inventario'],
            summary: 'Importar inventarios desde Excel (ruta en disco)',
            security: [{ bearerAuth: [] }],
            body: { type: 'object', required: ['path'], properties: { path: { type: 'string' } } }
        }
    }, (req, reply) => Controller.importExcel(app, req, reply))
}
