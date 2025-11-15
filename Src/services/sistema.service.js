// src/services/sistema.service.js
const takeCap = (n, cap = 100) => Math.min(Math.max(Number(n) || 10, 1), cap)

export async function list(app, { page = 1, limit = 10, search = '', sortBy = 'id', order = 'asc' }) {
  const skip = (Math.max(Number(page) || 1, 1) - 1) * (Number(limit) || 10)
  const take = Math.min(Number(limit) || 10, 100)
  const orderBy = ['id','sistema','corr','cod_sistema','cod_area_funcional'].includes(sortBy)
    ? { [sortBy]: order === 'desc' ? 'desc' : 'asc' }
    : { id: 'asc' }

  // Detectar si el valor buscado es un número
  const isNumericSearch = !isNaN(Number(search))
  const numericValue = Number(search)

  const where = search
    ? {
        OR: [
          // Campo string
          { sistema: { contains: search } },

          // Campos numéricos, solo si la búsqueda es numérica
          ...(isNumericSearch
            ? [
                { corr: { equals: numericValue } },
                { cod_sistema: { equals: numericValue } },
                { cod_area_funcional: { equals: numericValue } },
              ]
            : [])
        ]
      }
    : {}

  const [items, total] = await app.prisma.$transaction([
    app.prisma.sistema.findMany({ where, skip, take, orderBy }),
    app.prisma.sistema.count({ where })
  ])

  return { items, page: Number(page) || 1, limit: Number(limit) || 10, total }
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
