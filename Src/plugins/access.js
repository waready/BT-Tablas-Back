// src/plugins/access.js
import fp from 'fastify-plugin'

export default fp(async function access(app) {
    // Requiere que @fastify/jwt y prisma estén registrados antes

    app.decorate('requireAuth', async (req, reply) => {
        try { await req.jwtVerify() }
        catch { return reply.code(401).send({ error: 'Unauthorized' }) }
    })

    // Requiere un rol por nombre
    app.decorate('requireRole', function (roleName) {
        return async (req, reply) => {
            await app.requireAuth(req, reply)
            const has = await app.prisma.userRole.findFirst({
                where: { userId: req.user.sub, role: { name: roleName } },
                select: { userId: true }
            })
            if (!has) return reply.code(403).send({ error: 'Forbidden (role)' })
        }
    })

    // Requiere un permiso por slug "recurso:accion" (p.ej. "menu:usuarios")
    app.decorate('authorize', function (slug) {
        const [resource, action] = String(slug).split(':')
        return async (req, reply) => {
            await app.requireAuth(req, reply)
            const ok = await app.prisma.rolePermission.findFirst({
                where: {
                    role: { users: { some: { userId: req.user.sub } } },
                    permission: { resource, action }
                },
                select: { roleId: true }
            })
            if (!ok) return reply.code(403).send({ error: 'Forbidden (permission)' })
        }
    })
}, { name: 'access-plugin' })
