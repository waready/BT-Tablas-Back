import 'dotenv/config'
import Fastify from 'fastify'
import sensible from '@fastify/sensible'
import cors from '@fastify/cors'
import prismaPlugin from './plugins/prisma.js'
import authPlugin from './plugins/auth.js'
import accessPlugin from './plugins/access.js'   // <-- después de authPlugin
import swaggerPlugin from './plugins/swagger.js'

// rutas...
import permissionRoutes from './routes/permission.routes.js'
import roleRoutes from './routes/role.routes.js'
import userRoleRoutes from './routes/userRole.routes.js'
import meRoutes from './routes/me.routes.js'
import authRoutes from './routes/auth.routes.js'
import paisesRoutes from './routes/pais.routes.js'
import sistemasRoutes from './routes/sistema.routes.js'
import areaFuncionalRoutes from './routes/areaFuncional.routes.js'
import inventarioTablaRoutes from './routes/inventarioTabla.routes.js'

const app = Fastify({ logger: true })

await app.register(sensible)
await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['content-type', 'authorization', 'x-requested-with'],
    credentials: true,
    strictPreflight: false,
    maxAge: 86400
})

await app.register(prismaPlugin)
await app.register(authPlugin)       // ✅ primero JWT
await app.register(accessPlugin)     // ✅ luego access (usa jwt)
await app.register(swaggerPlugin)

// Prisma audit SAFE (tu mismo código)
app.prisma.$use(async (params, next) => {
    const result = await next(params)
    const isMutation = ['create', 'update', 'delete', 'upsert'].includes(params.action)
    const isAudit = params.model === 'AuditLog'
    if (isMutation && !isAudit) {
        setImmediate(async () => {
            try {
                await app.prisma.auditLog.create({
                    data: {
                        userId: app?.lastReqUserId ?? null,
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
    schema: { tags: ['System'], description: 'Healthcheck' }
}, async () => ({ ok: true }))

app.get('/api/v1/audit-logs', {
    preHandler: [app.requireAuth],        // ✅ usar el decorador correcto
    schema: { tags: ['Audit'], security: [{ bearerAuth: [] }] }
}, async () => {
    return app.prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })
})

// Rutas (orden ya OK)
await app.register(authRoutes, { prefix: '/api/v1' })
await app.register(paisesRoutes, { prefix: '/api/v1' })
await app.register(sistemasRoutes, { prefix: '/api/v1' })
await app.register(areaFuncionalRoutes, { prefix: '/api/v1' })
await app.register(meRoutes, { prefix: '/api/v1' })
await app.register(permissionRoutes, { prefix: '/api/v1' })
await app.register(roleRoutes, { prefix: '/api/v1' })
await app.register(userRoleRoutes, { prefix: '/api/v1' })
await app.register(inventarioTablaRoutes, { prefix: '/api/v1' })

await app.ready()
app.swagger()
const port = Number(process.env.PORT || 3000)
app.listen({ port, host: '0.0.0.0' })
    .catch(err => { app.log.error(err); process.exit(1) })
