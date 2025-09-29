// src/services/pais.service.js
export async function list(app, { q, skip = 0, take = 50 }) {
    const where = q
        ? {
            OR: [
                { nombre: { contains: q, mode: 'insensitive' } },
                { isoCode: { contains: q, mode: 'insensitive' } }
            ]
        }
        : {}

    const [items, total] = await app.prisma.$transaction([
        app.prisma.pais.findMany({
            where,
            orderBy: { nombre: 'asc' },
            skip: Number(skip) || 0,
            take: Math.min(Number(take) || 50, 100)
        }),
        app.prisma.pais.count({ where })
    ])

    return { items, total }
}

export async function getById(app, id) {
    const pais = await app.prisma.pais.findUnique({ where: { id: Number(id) } })
    if (!pais) throw app.httpErrors.notFound('País no encontrado')
    return pais
}

export async function create(app, { nombre, isoCode }) {
    // Puedes reforzar unicidad si lo deseas con un índice único en Prisma
    return app.prisma.pais.create({
        data: { nombre: nombre.trim(), isoCode: isoCode?.trim() || null }
    })
}

export async function update(app, id, { nombre, isoCode }) {
    try {
        return await app.prisma.pais.update({
            where: { id: Number(id) },
            data: {
                ...(nombre != null ? { nombre: nombre.trim() } : {}),
                ...(isoCode !== undefined ? { isoCode: isoCode?.trim() || null } : {})
            }
        })
    } catch (e) {
        if (e.code === 'P2025') throw app.httpErrors.notFound('País no encontrado')
        throw e
    }
}

export async function remove(app, id) {
    try {
        await app.prisma.pais.delete({ where: { id: Number(id) } })
        return { ok: true }
    } catch (e) {
        if (e.code === 'P2025') throw app.httpErrors.notFound('País no encontrado')
        throw e
    }
}
