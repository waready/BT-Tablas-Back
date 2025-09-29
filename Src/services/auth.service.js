// auth.service.js
import bcrypt from 'bcrypt'
import { getUserRoles, getUserPermissions } from '../utils/rbac.js'

async function signJwt(app, user, roles) {
    return app.jwt.sign({ sub: user.id, email: user.email, roles: roles.map(r => r.name) })
}

export async function login(app, { email, password }) {
    const emailLower = String(email).toLowerCase().trim()
    const user = await app.prisma.user.findUnique({ where: { email: emailLower } })
    if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
        throw app.httpErrors.unauthorized('Credenciales inválidas')
    }
    const roles = await getUserRoles(app.prisma, user.id)
    const permissions = await getUserPermissions(app.prisma, user.id)
    const token = await signJwt(app, user, roles)
    return { token, user: { id: user.id, email: user.email, username: user.username ?? null, name: user.name ?? null }, roles, permissions }
}

export async function register(app, { email, password }) {
    const emailLower = String(email).toLowerCase().trim()
    const exists = await app.prisma.user.findUnique({ where: { email: emailLower } })
    if (exists) throw app.httpErrors.badRequest('Email ya existe')

    const hash = await bcrypt.hash(password, 10)

    const result = await app.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: { email: emailLower, username: emailLower, password: hash, isActive: true, name: emailLower.split('@')[0] }
        })
        const viewer = await tx.role.findUnique({ where: { name: 'viewer' } })
        if (viewer) {
            await tx.userRole.create({ data: { userId: user.id, roleId: viewer.id } })
        }
        return user
    })

    const roles = await getUserRoles(app.prisma, result.id)
    const permissions = await getUserPermissions(app.prisma, result.id)
    const token = await signJwt(app, result, roles)
    return { token, user: { id: result.id, email: result.email, username: result.username ?? null, name: result.name ?? null }, roles, permissions }
}
