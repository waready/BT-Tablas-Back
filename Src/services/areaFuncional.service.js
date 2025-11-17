// src/services/areaFuncional.service.js

const takeCap = (n, cap = 100) => Math.min(Math.max(Number(n) || 10, 1), cap)

export async function list(app, { page = 1, limit = 10, search = '', sortBy = 'id', order = 'asc' }) {
    const skip = (Math.max(Number(page) || 1, 1) - 1) * (Number(limit) || 10)
    const take = takeCap(limit, 100)
    const orderBy = ['id', 'nombre','codigo'].includes(sortBy) ? { [sortBy]: order === 'desc' ? 'desc' : 'asc' } : { id: 'asc' }
    
      // Detectar si el valor buscado es un número
    const isNumericSearch = !isNaN(Number(search))
    const numericValue = Number(search)

    const where = search
        ? {
            OR: [
                { nombre: { contains: search} },
                ...(isNumericSearch
            ? [
                { codigo: { equals: numericValue } }
              ]
            : [])
            ]
        }
        : {}

    const [items, total] = await app.prisma.$transaction([
        app.prisma.areaFuncional.findMany({
           where, skip, take, orderBy,
        }),
        app.prisma.areaFuncional.count({ where })
    ])

    return {  items, page: Number(page) || 1, limit: Number(limit) || 10, total}
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
        data: { nombre: nombre.trim(), codigo: Number(codigo)}
    })
}

export async function update(app, id, { nombre, codigo }) {
    const data = {
        ...(nombre != null ? { nombre: String(nombre).trim() } : {}),
        ...(codigo != null ? { codigo: Number(codigo) } : {})
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
