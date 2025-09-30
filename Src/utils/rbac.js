
// src/utils/rbac.js

export async function getUserRoles(prisma, userId) {
    return prisma.role.findMany({
        where: { users: { some: { userId } } },
        select: { id: true, name: true, description: true }
    })
}

export async function getUserPermissions(prisma, userId) {
    // trae permisos vía roles del usuario
    return prisma.permission.findMany({
        where: {
            roles: {
                some: {
                    role: { users: { some: { userId } } }
                }
            }
        },
        select: { id: true, action: true, resource: true, description: true }
    })
}

export async function userHasRole(prisma, userId, roleName) {
    const found = await prisma.userRole.findFirst({
        where: { userId, role: { name: roleName } },
        select: { userId: true }
    })
    return !!found
}

export async function userHasPermission(prisma, userId, resource, action) {
    const found = await prisma.rolePermission.findFirst({
        where: {
            role: { users: { some: { userId } } },
            permission: { resource, action }
        },
        select: { roleId: true }
    })
    return !!found
}

// Utilidad para normalizar checks (p. ej. desde string "inventario:read")
export function parsePermissionString(perm) {
    // formatos soportados: "resource:action"  o  {resource, action}
    if (typeof perm === 'string') {
        const [resource, action] = perm.split(':')
        return { resource, action }
    }
    return perm
}
