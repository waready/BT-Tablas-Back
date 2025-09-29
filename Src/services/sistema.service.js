// src/services/sistema.service.js
export async function list(app, { q, area, cod_sistema, skip = 0, take = 50 }) {
    const where = {
        ...(q ? { sistema: { contains: q, mode: 'insensitive' } } : {}),
        ...(area != null ? { cod_area_funcional: Number(area) } : {}),
        ...(cod_sistema != null ? { cod_sistema: Number(cod_sistema) } : {})
    }

    const [items, total] = await app.prisma.$transaction([
        app.prisma.sistema.findMany({
            where,
            orderBy: [{ cod_area_funcional: 'asc' }, { corr: 'asc' }],
            skip: Number(skip) || 0,
            take: Math.min(Number(take) || 50, 100)
        }),
        app.prisma.sistema.count({ where })
    ])

    return { items, total }
}

export async function getById(app, id) {
    const sys = await app.prisma.sistema.findUnique({ where: { id: Number(id) } })
    if (!sys) throw app.httpErrors.notFound('Sistema no encontrado')
    return sys
}

export async function create(app, payload) {
    const data = {
        sistema: payload.sistema.trim(),
        cod_area_funcional: Number(payload.cod_area_funcional),
        cod_sistema: Number(payload.cod_sistema),
        corr: Number(payload.corr)
    }

    // (Opcional) evita duplicar cod_sistema
    const dup = await app.prisma.sistema.findFirst({ where: { cod_sistema: data.cod_sistema } })
    if (dup) throw app.httpErrors.conflict('cod_sistema ya existe')

    return app.prisma.sistema.create({ data })
}

export async function update(app, id, payload) {
    const data = {
        ...(payload.sistema != null ? { sistema: String(payload.sistema).trim() } : {}),
        ...(payload.cod_area_funcional != null ? { cod_area_funcional: Number(payload.cod_area_funcional) } : {}),
        ...(payload.cod_sistema != null ? { cod_sistema: Number(payload.cod_sistema) } : {}),
        ...(payload.corr != null ? { corr: Number(payload.corr) } : {})
    }

    try {
        // (Opcional) chequea duplicado de cod_sistema si lo cambian
        if (data.cod_sistema != null) {
            const existing = await app.prisma.sistema.findFirst({
                where: { cod_sistema: data.cod_sistema, NOT: { id: Number(id) } }
            })
            if (existing) throw app.httpErrors.conflict('cod_sistema ya existe')
        }

        return await app.prisma.sistema.update({ where: { id: Number(id) }, data })
    } catch (e) {
        if (e.code === 'P2025') throw app.httpErrors.notFound('Sistema no encontrado')
        throw e
    }
}

export async function remove(app, id) {
    try {
        await app.prisma.sistema.delete({ where: { id: Number(id) } })
        return { ok: true }
    } catch (e) {
        if (e.code === 'P2025') throw app.httpErrors.notFound('Sistema no encontrado')
        throw e
    }
}
