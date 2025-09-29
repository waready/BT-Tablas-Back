import fp from 'fastify-plugin'


export default fp(async (app) => {
    await app.register(import('@fastify/swagger'), {
        openapi: {
            info: {
                title: 'Fastify BT-Tablas API',
                description: 'API profesional con Auth, RBAC, Auditoría y Export',
                version: '1.0.0'
            },
            servers: [{ url: 'http://localhost:' + (process.env.PORT || 3000) }],
            security: [{ bearerAuth: [] }],
            components: {
                securitySchemes: {
                    bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
                }
            }
        }
    })
    await app.register(import('@fastify/swagger-ui'), { routePrefix: '/docs', uiConfig: { docExpansion: 'list' } })
})