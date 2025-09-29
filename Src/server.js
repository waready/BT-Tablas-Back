import 'dotenv/config'
import Fastify from 'fastify'
import sensible from '@fastify/sensible'
import cors from '@fastify/cors'
import prismaPlugin from './plugins/prisma.js'
import authPlugin from './plugins/auth.js'
import swaggerPlugin from './plugins/swagger.js'

const app = Fastify({ logger: true })
await app.register(sensible)
await app.register(cors, { origin: true })
await app.register(prismaPlugin)
await app.register(authPlugin)
await app.register(swaggerPlugin)

// Middleware Prisma para auditar mutaciones
app.prisma.$use(async (params, next) => {
    const start = Date.now()
    const result = await next(params)
    const tookMs = Date.now() - start
    if (['create', 'update', 'delete', 'upsert'].includes(params.action)) {
        try {
            const userId = app?.lastReqUserId ||
                null // settable desde preHandlers si deseas
            await app.prisma.auditLog.create({
                data: {
                    userId,
                    action: `${params.model}.${params.action}`,
                    entity: params.model,
                    entityId: result?.id ?? null,
                    metadata: { tookMs },
                }
            })
        } catch (e) { app.log.warn({ e }, 'Audit middleware failed') }
    }
    return result
})


app.get('/health', {
    schema: {
        tags: ['System'],
        description: 'Healthcheck'
    }
}, async () => ({ ok: true }))


await app.ready()
app.swagger() // expone /docs
const port = Number(process.env.PORT || 3000)
app.listen({ port, host: '0.0.0.0' })
    .catch(err => { app.log.error(err); process.exit(1) })
