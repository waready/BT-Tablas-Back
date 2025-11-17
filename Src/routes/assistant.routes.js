// src/routes/assistant.routes.js
import * as Controller from '../controllers/assistant.controller.js'

export default async function assistantRoutes(app) {
    // src/routes/assistant.routes.js
    const BodyChat = {
        type: 'object',
        required: ['message'],
        additionalProperties: false,
        properties: {
            message: {
                type: 'string',
                minLength: 1
            },
            // sessionId es opcional: si lo envías, debe ser número; si no, se crea nueva sesión
            sessionId: {
                type: 'integer'
            }
        }
    }

    const BodyQuery = {
        type: 'object',
        required: ['question'],
        additionalProperties: false,
        properties: {
            question: { type: 'string', minLength: 1 }
        }
    }

    // Chat general (explica modelo, genera SQL, etc., sin ejecutar datos)
    app.post('/assistant/chat', {
        preHandler: [app.requireAuth],
        schema: {
            tags: ['Assistant'],
            summary: 'Conversar con el asistente BT-Tablas',
            security: [{ bearerAuth: [] }],
            body: BodyChat
        }
    }, (req, reply) => Controller.chat(app, req, reply))

    // Pregunta con datos reales (NL -> SQL -> ejecutar -> explicar)
    app.post('/assistant/query', {
        preHandler: [app.requireAuth],
        schema: {
            tags: ['Assistant'],
            summary: 'Consultar datos reales usando lenguaje natural',
            description: 'Genera una consulta SELECT sobre BT-Tablas, la ejecuta y devuelve datos + explicación.',
            security: [{ bearerAuth: [] }],
            body: BodyQuery
        }
    }, (req, reply) => Controller.askWithData(app, req, reply))
}
