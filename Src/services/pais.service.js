// src/services/pais.service.js
const takeCap = (n, cap = 100) => Math.min(Math.max(Number(n) || 10, 1), cap)

export async function list(app, { page = 1, limit = 10, search = '', sortBy = 'id', order = 'asc' }) {
    const skip = (Math.max(Number(page) || 1, 1) - 1) * (Number(limit) || 10)
    const take = takeCap(limit, 100)
    const orderBy = ['id', 'nombre','isoCode'].includes(sortBy) ? { [sortBy]: order === 'desc' ? 'desc' : 'asc' } : { id: 'asc' }
    const where = search
        ? {
            OR: [
                { nombre: { contains: search} },
                { isoCode: { contains: search} }
            ]
        }
        : {}

    const [items, total] = await app.prisma.$transaction([
        app.prisma.pais.findMany({
            where, skip, take, orderBy,
        }),
        app.prisma.pais.count({ where })
    ])

    return { items, page: Number(page) || 1, limit: Number(limit) || 10, total }    
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
