export async function userPermissions(prisma, userId) {
    const roles = await prisma.userRole.findMany({
        where: { userId },
        include: { role: { include: { permissions: { include: { permission: true } } } } }
    })
    const set = new Set()
    for (const ur of roles) {
        for (const rp of ur.role.permissions) {
            set.add(`${rp.permission.resource}.${rp.permission.action}`)
        }
    }
    return set
}

export function requirePermission(perm) {
    return async (req, reply) => {
        const perms = await userPermissions(req.server.prisma, req.user.id)
        if (!perms.has(perm)) return reply.forbidden('No tienes permiso')
    }
}