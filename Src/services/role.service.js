// src/services/role.service.js

export async function list(app, { q, skip = 0, take = 50 }) {
    const where = q ? { name: { contains: q, mode: 'insensitive' } } : {}
    const [items, total] = await app.prisma.$transaction([
        app.prisma.role.findMany({
            where,
            orderBy: { name: 'asc' },
            skip: Number(skip) || 0,
            take: Math.min(Number(take) || 50, 100),
            include: { permissions: { include: { permission: true } } }
        }),
        app.prisma.role.count({ where })
    ])

    const mapped = items.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description ?? null,
        permissions: r.permissions.map(rp => ({
            id: rp.permission.id,
            resource: rp.permission.resource,
            action: rp.permission.action,
            description: rp.permission.description ?? null
        }))
    }))
    return { items: mapped, total }
}

export async function getById(app, id) {
    const r = await app.prisma.role.findUnique({
        where: { id },
        include: { permissions: { include: { permission: true } } }
    })
    if (!r) throw app.httpErrors.notFound('Rol no encontrado')
    return {
        id: r.id,
        name: r.name,
        description: r.description ?? null,
        permissions: r.permissions.map(rp => ({
            id: rp.permission.id,
            resource: rp.permission.resource,
            action: rp.permission.action,
            description: rp.permission.description ?? null
        }))
    }
}

export async function create(app, { name, description }) {
    return app.prisma.role.create({
        data: { name: name.trim(), description: description?.trim() || null }
    })
}

export async function update(app, id, { name, description }) {
    try {
        return await app.prisma.role.update({
            where: { id },
            data: {
                ...(name != null ? { name: name.trim() } : {}),
                ...(description !== undefined ? { description: description?.trim() || null } : {})
            }
        })
    } catch (e) {
        if (e.code === 'P2025') throw app.httpErrors.notFound('Rol no encontrado')
        throw e
    }
}

export async function remove(app, id) {
    try {
        await app.prisma.$transaction([
            app.prisma.userRole.deleteMany({ where: { roleId: id } }),
            app.prisma.rolePermission.deleteMany({ where: { roleId: id } }),
            app.prisma.role.delete({ where: { id } })
        ])
        return { ok: true }
    } catch (e) {
        if (e.code === 'P2025') throw app.httpErrors.notFound('Rol no encontrado')
        throw e
    }
}

/** Reemplaza el set de permisos de un rol
 *  Acepta: ["resource:action", ...]  o  [{id}]  o  [{resource,action}]
 */
export async function setPermissions(app, roleId, permissions) {
    const ids = []
    for (const p of permissions || []) {
        if (typeof p === 'string' && p.includes(':')) {
            const [resource, action] = p.split(':')
            const perm = await app.prisma.permission.findUnique({
                where: { action_resource: { action, resource } }
            }) || await app.prisma.permission.findFirst({ where: { action, resource } })
            if (!perm) throw app.httpErrors.badRequest(`Permiso inexistente: ${resource}:${action}`)
            ids.push(perm.id)
        } else if (p?.id) {
            ids.push(p.id)
        } else if (p?.resource && p?.action) {
            const perm = await app.prisma.permission.findUnique({
                where: { action_resource: { action: p.action, resource: p.resource } }
            }) || await app.prisma.permission.findFirst({ where: { action: p.action, resource: p.resource } })
            if (!perm) throw app.httpErrors.badRequest(`Permiso inexistente: ${p.resource}:${p.action}`)
            ids.push(perm.id)
        }
    }

    await app.prisma.$transaction([
        app.prisma.rolePermission.deleteMany({ where: { roleId } }),
        ids.length
            ? app.prisma.rolePermission.createMany({
                data: ids.map(permissionId => ({ roleId, permissionId })),
                skipDuplicates: true
            })
            : Promise.resolve()
    ])

    return getById(app, roleId)
}
