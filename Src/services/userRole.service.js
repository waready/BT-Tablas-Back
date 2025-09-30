// src/services/userRole.service.js

export async function getUserRoles(app, userId) {
    return app.prisma.role.findMany({
        where: { users: { some: { userId } } },
        select: { id: true, name: true, description: true }
    })
}

/** Reemplaza todos los roles del usuario por los recibidos
 * Acepta ["admin","viewer"] o [{id}]
 */
export async function setUserRoles(app, userId, roles) {
    const ids = []
    for (const r of roles || []) {
        if (typeof r === 'string') {
            const role = await app.prisma.role.findUnique({ where: { name: r } })
            if (!role) throw app.httpErrors.badRequest(`Rol inexistente: ${r}`)
            ids.push(role.id)
        } else if (r?.id) {
            ids.push(r.id)
        }
    }

    await app.prisma.$transaction([
        app.prisma.userRole.deleteMany({ where: { userId } }),
        ids.length
            ? app.prisma.userRole.createMany({
                data: ids.map(roleId => ({ userId, roleId })),
                skipDuplicates: true
            })
            : Promise.resolve()
    ])

    return getUserRoles(app, userId)
}

export async function removeUserRole(app, userId, roleId) {
    await app.prisma.userRole.delete({
        where: { userId_roleId: { userId, roleId } }
    })
    return { ok: true }
}
