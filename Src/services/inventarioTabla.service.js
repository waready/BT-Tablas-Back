// src/services/inventarioTabla.service.js
import ExcelJS from 'exceljs'

const takeCap = (n, cap = 100) => Math.min(Math.max(Number(n) || 10, 1), cap)

export async function list(app, { page = 1, limit = 10, search = '', sortBy = 'id', order = 'asc' }) {
    const skip = (Math.max(Number(page) || 1, 1) - 1) * (Number(limit) || 10)
    const take = takeCap(limit, 100)

    // Campos permitidos para orden
    const orderBy = ['id', 'codigo', 'descripcion', 'createdAt', 'updatedAt'].includes(sortBy) ? { [sortBy]: order === 'desc' ? 'desc' : 'asc' } : { id: 'asc' }

    const where = search
        ? {
            OR: [
                { codigo: { contains: search, mode: 'insensitive' } },
                { descripcion: { contains: search, mode: 'insensitive' } }
            ]
        }
        : {}

    const [items, total] = await app.prisma.$transaction([
        app.prisma.inventario.findMany({
            where, skip, take, orderBy,
            include: { areaFuncional: true, sistema: true, pais: true, user: { select: { id: true, email: true, name: true } } }
        }),
        app.prisma.inventario.count({ where })
    ])

    return { items, page: Number(page) || 1, limit: Number(limit) || 10, total }
}

export async function getById(app, id) {
    const item = await app.prisma.inventario.findUnique({
        where: { id: Number(id) },
        include: { areaFuncional: true, sistema: true, pais: true, user: { select: { id: true, email: true, name: true } } }
    })
    if (!item) throw app.httpErrors.notFound('Inventario no encontrado')
    return item
}

export async function ensureFKs(app, data) {
    const tasks = []
    if (data.areaFuncionalId != null) {
        tasks.push(app.prisma.area.findUnique({ where: { id: Number(data.areaFuncionalId) } }))
    } else tasks.push(Promise.resolve(true))
    if (data.sistemaId != null) {
        tasks.push(app.prisma.sistema.findUnique({ where: { id: Number(data.sistemaId) } }))
    } else tasks.push(Promise.resolve(true))
    if (data.paisId != null) {
        tasks.push(app.prisma.pais.findUnique({ where: { id: Number(data.paisId) } }))
    } else tasks.push(Promise.resolve(true))

    const [areaOk, sistOk, paisOk] = await Promise.all(tasks)
    if (data.areaFuncionalId != null && !areaOk) throw app.httpErrors.badRequest('areaFuncionalId inválido')
    if (data.sistemaId != null && !sistOk) throw app.httpErrors.badRequest('sistemaId inválido')
    if (data.paisId != null && !paisOk) throw app.httpErrors.badRequest('paisId inválido')
}

export async function create(app, payload) {
    await ensureFKs(app, payload)
    const item = await app.prisma.inventario.create({ data: payload })
    return item
}

export async function update(app, id, payload) {
    await ensureFKs(app, payload)
    try {
        const item = await app.prisma.inventario.update({
            where: { id: Number(id) },
            data: payload
        })
        return item
    } catch (e) {
        if (e.code === 'P2025') throw app.httpErrors.notFound('Inventario no encontrado')
        throw e
    }
}

export async function remove(app, id) {
    try {
        await app.prisma.inventario.delete({ where: { id: Number(id) } })
        return { ok: true }
    } catch (e) {
        if (e.code === 'P2025') throw app.httpErrors.notFound('Inventario no encontrado')
        throw e
    }
}

/** Exportar a Excel desde un SQL arbitrario (¡usa con cuidado!)
 *  Para MySQL: usa $queryRawUnsafe
 */
export async function exportSqlToExcel(app, sql) {
    const rows = await app.prisma.$queryRawUnsafe(sql) // <-- valida en tu capa de permisos antes de exponer en prod
    if (!rows || !rows.length) return { buffer: null }

    const headers = Object.keys(rows[0])
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Reporte')

    ws.columns = headers.map(h => ({ header: h.toUpperCase(), key: h, width: Math.max(12, String(h).length + 2) }))
    // estilos de header
    headers.forEach((_, i) => {
        const cell = ws.getCell(1, i + 1)
        cell.font = { bold: true }
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
    })

    rows.forEach(r => ws.addRow(r))
    const buffer = await wb.xlsx.writeBuffer()
    return { buffer }
}

/** Importar desde un archivo Excel (ruta completa en disco) */
export async function importFromExcel(app, filePath) {
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.readFile(filePath)
    const ws = wb.getWorksheet('Inventario') || wb.worksheets[0]

    let ok = 0, fail = 0
    const toStr = v => (v == null ? '' : (typeof v === 'object' && v.text) ? String(v.text).trim() : String(v).trim())
    const toBool = (v, def = false) => {
        const s = toStr(v).toLowerCase()
        if (!s) return def
        if (['s', 'si', 'sí', 'y', 'yes', 'true', '1', 'x', '✓'].includes(s)) return true
        if (['n', 'no', 'false', '0'].includes(s)) return false
        return def
    }

    // Caches por nombre
    const cache = {
        area: new Map(),
        sist: new Map(),
        pais: new Map()
    }
    const findAreaId = async (nombre) => {
        const key = toStr(nombre).toLowerCase(); if (!key) return null
        if (cache.area.has(key)) return cache.area.get(key)
        const r = await app.prisma.area.findFirst({ where: { nombre: { equals: key, mode: 'insensitive' } } })
        const id = r ? r.id : null; cache.area.set(key, id); return id
    }
    const findSistemaId = async (nombre) => {
        const key = toStr(nombre).toLowerCase(); if (!key) return null
        if (cache.sist.has(key)) return cache.sist.get(key)
        const r = await app.prisma.sistema.findFirst({ where: { sistema: { equals: key, mode: 'insensitive' } } })
        const id = r ? r.id : null; cache.sist.set(key, id); return id
    }
    const findPaisId = async (nombre) => {
        const key = toStr(nombre).toLowerCase(); if (!key) return null
        if (cache.pais.has(key)) return cache.pais.get(key)
        const r = await app.prisma.pais.findFirst({ where: { nombre: { equals: key, mode: 'insensitive' } } })
        const id = r ? r.id : null; cache.pais.set(key, id); return id
    }

    for (let rowNumber = 5; rowNumber <= ws.rowCount; rowNumber++) {
        const row = ws.getRow(rowNumber); if (!row || !row.hasValues) continue
        try {
            const codigo = toStr(row.getCell(2).value) || 'Desconocida'
            const descripcion = toStr(row.getCell(3).value) || 'Desconocida'
            const datos = toStr(row.getCell(4).value) || null
            const areaNombre = toStr(row.getCell(5).value)
            const sistemaNombre = toStr(row.getCell(6).value)
            const en_desarrollo = toBool(row.getCell(7).value)
            const capa = toStr(row.getCell(8).value) || null
            const usuario = toStr(row.getCell(11).value) || null
            const documento_detalle = toStr(row.getCell(12).value) || null
            const depende_de_la_plaza = toBool(row.getCell(13).value)
            const comentarios = toStr(row.getCell(14).value) || null
            const depende_del_entorno = toBool(row.getCell(15).value)
            const ambiente_testing = toStr(row.getCell(16).value) || null
            const paisNombre = toStr(row.getCell(17).value)
            const borrar = toBool(row.getCell(18).value)

            const areaFuncionalId = await findAreaId(areaNombre)
            const sistemaId = await findSistemaId(sistemaNombre)
            const paisId = await findPaisId(paisNombre)

            await app.prisma.inventario.create({
                data: {
                    codigo, descripcion, datos,
                    areaFuncionalId, sistemaId, paisId,
                    en_desarrollo, capa, usuario, documento_detalle,
                    depende_de_la_plaza, comentarios, depende_del_entorno,
                    ambiente_testing, borrar
                }
            })
            ok++
        } catch (e) {
            fail++
            app.log.warn({ row: rowNumber, e }, 'Error importando fila')
        }
    }

    return { ok, fail }
}
