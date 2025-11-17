import 'dotenv/config'
import Fastify from 'fastify'
import sensible from '@fastify/sensible'
import cors from '@fastify/cors'
import prismaPlugin from './plugins/prisma.js'
import authPlugin from './plugins/auth.js'
import accessPlugin from './plugins/access.js'   // <-- después de authPlugin
import swaggerPlugin from './plugins/swagger.js'
import cookie from '@fastify/cookie'
import openaiPlugin from './plugins/openai.js'

// imports mínimos para estáticos
import staticPlugin from '@fastify/static'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// rutas...
import permissionRoutes from './routes/permission.routes.js'
import roleRoutes from './routes/role.routes.js'
import userRoleRoutes from './routes/userRole.routes.js'
import userRoutes from './routes/users.routes.js'
import meRoutes from './routes/me.routes.js'
import authRoutes from './routes/auth.routes.js'
import paisesRoutes from './routes/pais.routes.js'
import sistemasRoutes from './routes/sistema.routes.js'
import areaFuncionalRoutes from './routes/areaFuncional.routes.js'
import inventarioTablaRoutes from './routes/inventarioTabla.routes.js'
import reportesRoutes from './routes/reportes.routes.js'
import assistantRoutes from './routes/assistant.routes.js'

const app = Fastify({ logger: true, trustProxy: true })

// decoradores donde guardaremos datos del request actual
app.decorate('lastReqUserId', null)
app.decorate('lastReqIp', null)

await app.register(cookie, {
  secret: process.env.COOKIE_SECRET || 'changeme',
  hook: 'onRequest'
})

await app.register(sensible) 

await app.register(cors, {
  origin: true,   // 👈 AQUÍ en vez de '*'
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['content-type', 'authorization', 'x-requested-with'],
  credentials: true,                   // 👈 obligatorio para cookies
  strictPreflight: false,
  maxAge: 86400
})

await app.register(openaiPlugin)
await app.register(prismaPlugin)
await app.register(authPlugin)       // ✅ primero JWT
await app.register(accessPlugin)     // ✅ luego access (usa jwt)
await app.register(swaggerPlugin)

// 🔹 solo IP aquí
app.addHook('onRequest', async (request, reply) => {
  app.lastReqIp = request.ip
})
const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)
await app.register(staticPlugin, {
  root: path.resolve(__dirname, 'public'),
  prefix: '/',                                  
})
app.get('/', (req, reply) => reply.type('text/html; charset=utf-8').sendFile('index.html'))
app.get('/healthz', async () => ({ status: 'ok', service: 'bt-tablas', time: new Date().toISOString() }))
app.get('/health', {
  schema: { tags: ['System'], description: 'Healthcheck' }
}, async () => ({ ok: true }))


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
                        ip: app.lastReqIp ?? null,
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
await app.register(userRoutes, { prefix: '/api/v1' })
await app.register(inventarioTablaRoutes, { prefix: '/api/v1' })
await app.register(reportesRoutes, { prefix: '/api/v1' })
await app.register(assistantRoutes,{ prefix: '/api/v1' })

await app.ready()
app.swagger()
const port = Number(process.env.PORT || 5000)
app.listen({ port, host: '0.0.0.0' })
    .catch(err => { app.log.error(err); process.exit(1) })
