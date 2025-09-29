import 'dotenv/config'
import Fastify from 'fastify'
import sensible from '@fastify/sensible'
import cors from '@fastify/cors'
import prismaPlugin from './plugins/prisma.js'
import authPlugin from './plugins/auth.js'
import swaggerPlugin from './plugins/swagger.js'

//import
import authRoutes from './routes/auth.routes.js'

const app = Fastify({ logger: true })
await app.register(sensible)
await app.register(cors, { origin: true })
await app.register(prismaPlugin)
await app.register(authPlugin)
await app.register(swaggerPlugin)



// Middleware Prisma para auditar mutaciones
// ✅ Middleware SAFE
app.prisma.$use(async (params, next) => {
    const result = await next(params)

    const isMutation = ['create', 'update', 'delete', 'upsert'].includes(params.action)
    const isAudit = params.model === 'AuditLog'

    if (isMutation && !isAudit) {
        // No bloquear la respuesta del endpoint:
        setImmediate(async () => {
            try {
                await app.prisma.auditLog.create({
                    data: {
                        userId: app?.lastReqUserId ?? null,          // puede ser null en /register (está bien)
                        action: `${params.model}.${params.action}`,
                        entity: params.model,
                        entityId: (result && typeof result === 'object' && 'id' in result && result.id != null)
                            ? String(result.id)
                            : null,
                        metadata: { ts: Date.now() }
                    }
                })
            } catch (e) {
                app.log.warn({ e }, 'AuditLog create failed (ignored)')
            }
        })
    }

    return result
})


app.get('/health', {
    schema: {
        tags: ['System'],
        description: 'Healthcheck'
    }
}, async () => ({ ok: true }))


app.get('/api/v1/audit-logs', {
    preHandler: app.auth, // si quieres protegerlo
    schema: { tags: ['Audit'] }
}, async (req) => {
    return app.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100
    })
})



await app.register(authRoutes, { prefix: '/api/v1' })

await app.ready()
app.swagger() // expone /docs
const port = Number(process.env.PORT || 3000)
app.listen({ port, host: '0.0.0.0' })
    .catch(err => { app.log.error(err); process.exit(1) })
