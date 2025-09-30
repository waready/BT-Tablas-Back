// src/routes/me.routes.js
import { MENU } from '../utils/menuConfig.js'

export default async function meRoutes(app) {
    app.get('/me', {
        preHandler: [app.requireAuth],
        schema: { tags: ['Auth'], summary: 'Quién soy', security: [{ bearerAuth: [] }] }
    }, async (req) => {
        const user = await app.prisma.user.findUnique({
            where: { id: req.user.sub },
            select: { id: true, email: true, name: true, username: true, isActive: true }
        })
        const roles = await app.prisma.role.findMany({
            where: { users: { some: { userId: req.user.sub } } },
            select: { id: true, name: true }
        })
        const perms = await app.prisma.permission.findMany({
            where: { roles: { some: { role: { users: { some: { userId: req.user.sub } } } } } },
            select: { resource: true, action: true }
        })
        return { user, roles, permissions: perms.map(p => `${p.resource}:${p.action}`) }
    })

    app.get('/me/menu', {
        preHandler: [app.requireAuth],
        schema: { tags: ['Auth'], summary: 'Menú del usuario', security: [{ bearerAuth: [] }] }
    }, async (req) => {
        const perms = await app.prisma.permission.findMany({
            where: { roles: { some: { role: { users: { some: { userId: req.user.sub } } } } } },
            select: { resource: true, action: true }
        })
        const slugs = new Set(perms.map(p => `${p.resource}:${p.action}`))
        return { items: MENU.filter(i => slugs.has(i.slug)) }
    })
}
