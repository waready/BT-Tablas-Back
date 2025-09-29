// src/services/areaFuncional.service.js
export async function list(app, { q, codigo, skip = 0, take = 50 }) {
    const where = {
        ...(q ? {
            OR: [
                { nombre: { contains: q, mode: 'insensitive' } },
                { codigo: { contains: q, mode: 'insensitive' } }
            ]
        } : {}),
        ...(codigo ? { codigo: { contains: codigo, mode: 'insensitive' } } : {})
    }

    const [items, total] = await app.prisma.$transaction([
        app.prisma.areaFuncional.findMany({
            where,
            orderBy: [{ codigo: 'asc' }, { nombre: 'asc' }],
            skip: Number(skip) || 0,
            take: Math.min(Number(take) || 50, 100)
        }),
        app.prisma.areaFuncional.count({ where })
    ])

    return { items, total }
}

export async function getById(app, id) {
    const area = await app.prisma.areaFuncional.findUnique({ where: { id: Number(id) } })
    if (!area) throw app.httpErrors.notFound('Área funcional no encontrada')
    return area
}

export async function create(app, { nombre, codigo }) {
    const dup = await app.prisma.areaFuncional.findFirst({ where: { codigo } })
    if (dup) throw app.httpErrors.conflict('El código ya existe')

    return app.prisma.areaFuncional.create({
        data: { nombre: nombre.trim(), codigo: codigo.trim() }
    })
}

export async function update(app, id, { nombre, codigo }) {
    const data = {
        ...(nombre != null ? { nombre: String(nombre).trim() } : {}),
        ...(codigo != null ? { codigo: String(codigo).trim() } : {})
    }

    try {
        if (data.codigo) {
            const exists = await app.prisma.areaFuncional.findFirst({
                where: { codigo: data.codigo, NOT: { id: Number(id) } }
            })
            if (exists) throw app.httpErrors.conflict('El código ya existe')
        }

        return await app.prisma.areaFuncional.update({
            where: { id: Number(id) },
            data
        })
    } catch (e) {
        if (e.code === 'P2025') throw app.httpErrors.notFound('Área funcional no encontrada')
        throw e
    }
}

export async function remove(app, id) {
    try {
        await app.prisma.areaFuncional.delete({ where: { id: Number(id) } })
        return { ok: true }
    } catch (e) {
        if (e.code === 'P2025') throw app.httpErrors.notFound('Área funcional no encontrada')
        throw e
    }
}
