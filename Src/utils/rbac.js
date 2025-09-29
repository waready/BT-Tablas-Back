// src/utils/rbac.js
export async function getUserRoles(prisma, userId) {
    const roles = await prisma.role.findMany({
        where: { users: { some: { userId } } },
        select: { id: true, name: true, description: true }
    })
    return roles
}

export async function getUserPermissions(prisma, userId) {
    // Permisos que llegan por los roles del usuario
    const perms = await prisma.permission.findMany({
        where: {
            roles: {
                some: {
                    role: {
                        users: { some: { userId } }
                    }
                }
            }
        },
        select: { action: true, resource: true, description: true }
    })
    return perms
}
