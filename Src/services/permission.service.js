// src/services/permission.service.js

export async function list(app, { q, resource, action, skip = 0, take = 50 }) {
    const where = {
        ...(q ? {
            OR: [
                { resource: { contains: q, mode: 'insensitive' } },
                { action: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } }
            ]
        } : {}),
        ...(resource ? { resource: { contains: resource, mode: 'insensitive' } } : {}),
        ...(action ? { action: { contains: action, mode: 'insensitive' } } : {})
    }

    const [items, total] = await app.prisma.$transaction([
        app.prisma.permission.findMany({
            where,
            orderBy: [{ resource: 'asc' }, { action: 'asc' }],
            skip: Number(skip) || 0,
            take: Math.min(Number(take) || 50, 100)
        }),
        app.prisma.permission.count({ where })
    ])
    return { items, total }
}

export async function create(app, { resource, action, description }) {
    return app.prisma.permission.create({
        data: {
            resource: resource.trim(),
            action: action.trim(),
            description: description?.trim() || null
        }
    })
}

export async function remove(app, id) {
    try {
        await app.prisma.$transaction([
            app.prisma.rolePermission.deleteMany({ where: { permissionId: id } }),
            app.prisma.permission.delete({ where: { id } })
        ])
        return { ok: true }
    } catch (e) {
        if (e.code === 'P2025') throw app.httpErrors.notFound('Permiso no encontrado')
        throw e
    }
}
