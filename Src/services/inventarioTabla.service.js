// src/services/inventarioTabla.service.js
import ExcelJS from 'exceljs'
import fs from 'node:fs/promises'
import path from 'node:path'

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
        app.prisma.inventarioTabla.findMany({
            where, skip, take, orderBy,
            include: { areaFuncional: true, sistema: true, pais: true, user: { select: { id: true, email: true, name: true } } }
        }),
        app.prisma.inventarioTabla.count({ where })
    ])

    return { items, page: Number(page) || 1, limit: Number(limit) || 10, total }
}

export async function getById(app, id) {
    const item = await app.prisma.inventarioTabla.findUnique({
        where: { id: Number(id) },
        include: { areaFuncional: true, sistema: true, pais: true, user: { select: { id: true, email: true, name: true } } }
    })
    if (!item) throw app.httpErrors.notFound('Inventario no encontrado')
    return item
}

export async function ensureFKs(app, data) {
    const tasks = []

    if (data.areaFuncionalId != null) {
        tasks.push(app.prisma.areaFuncional.findUnique({
            where: { id: Number(data.areaFuncionalId) }
        }))
    } else tasks.push(Promise.resolve(true))

    if (data.sistemaId != null) {
        tasks.push(app.prisma.sistema.findUnique({
            where: { id: Number(data.sistemaId) }
        }))
    } else tasks.push(Promise.resolve(true))

    if (data.paisId != null) {
        tasks.push(app.prisma.pais.findUnique({
            where: { id: Number(data.paisId) }
        }))
    } else tasks.push(Promise.resolve(true))

    const [areaOk, sistOk, paisOk] = await Promise.all(tasks)
    if (data.areaFuncionalId != null && !areaOk) throw app.httpErrors.badRequest('areaFuncionalId inválido')
    if (data.sistemaId != null && !sistOk) throw app.httpErrors.badRequest('sistemaId inválido')
    if (data.paisId != null && !paisOk) throw app.httpErrors.badRequest('paisId inválido')
}


export async function create(app, payload) {
    await ensureFKs(app, payload)
    const item = await app.prisma.inventarioTabla.create({ data: payload })
    return item
}

export async function update(app, id, payload) {
    await ensureFKs(app, payload)
    try {
        const item = await app.prisma.inventarioTabla.update({
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
        await app.prisma.inventarioTabla.delete({ where: { id: Number(id) } })
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
export async function importFromExcel(app, _filePathIgnored) {
  // Archivo fijo dentro de publick/public
  const FILE_NAME = 'PRD_99000_GL_V3R1_ Inventario BBDD.4-1.xlsm'
  const baseDirs = [
    app.publicDir && path.resolve(app.publicDir),
    path.resolve(process.cwd(), 'Src/public'),
  ].filter(Boolean)

  // Localiza el archivo
  let absPath
  for (const base of baseDirs) {
    const p = path.normalize(path.join(base, FILE_NAME))
    try { await fs.access(p); absPath = p; break } catch {}
  }
  if (!absPath) {
    throw app.httpErrors.badRequest(`No se encontró el archivo en: ${baseDirs.join(' | ')}`)
  }

  // Carga Excel
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(absPath)
  const ws = wb.getWorksheet('Inventario') || wb.worksheets[0]
  if (!ws) throw app.httpErrors.badRequest('El libro no contiene hojas (ni “Inventario” ni primera hoja)')

  // Helpers
  const toStr = (v) => {
    if (v == null) return ''
    if (typeof v === 'object') {
      if (v.text != null) return String(v.text).trim()
      if (v.result != null) return String(v.result).trim() // fórmulas
      return String(v).trim()
    }
    return String(v).trim()
  }
  const toBool = (v, def = false) => {
    const s = toStr(v).toLowerCase()
    if (s === '' || s === 'n/a' || s === '-') return def
    if (['s','si','sí','y','yes','true','1','x','✓'].includes(s)) return true
    if (['n','no','false','0'].includes(s)) return false
    return def
  }
  // Para columnas String que conceptualmente son booleanas
  const toSiNo = (v, defNo = 'NO') => (toBool(v, false) ? 'SI' : defNo)

  // Normalización básica y alias de país
  const norm = (s) => String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase()
  const countryAlias = (s) => {
    const k = norm(s)
    if (k === 'mejico' || k === 'mejico.') return 'mexico'
    return k
  }

  // Caches y finders (sin `mode`, ya que usas MySQL)
  const cache = { area: new Map(), sist: new Map(), pais: new Map() }

  const findAreaId = async (nombre) => {
    const key = norm(nombre); if (!key) return undefined
    if (cache.area.has(key)) return cache.area.get(key)
    const r = await app.prisma.areaFuncional.findFirst({
      where: { nombre: key }, // MySQL suele ser case/accents insensitive por collation
      select: { id: true },
    })
    const id = r?.id; cache.area.set(key, id); return id
  }

  const findSistemaId = async (nombre) => {
    const key = norm(nombre); if (!key) return undefined
    if (cache.sist.has(key)) return cache.sist.get(key)
    const r = await app.prisma.sistema.findFirst({
      where: { sistema: key },
      select: { id: true },
    })
    const id = r?.id; cache.sist.set(key, id); return id
  }

  const findPaisId = async (nombre) => {
    const key = countryAlias(nombre); if (!key) return undefined
    if (cache.pais.has(key)) return cache.pais.get(key)
    const r = await app.prisma.pais.findFirst({
      where: { nombre: key },
      select: { id: true },
    })
    const id = r?.id; cache.pais.set(key, id); return id
  }

  let ok = 0, fail = 0

  for (let rowNumber = 5; rowNumber <= ws.rowCount; rowNumber++) {
    const row = ws.getRow(rowNumber); if (!row || !row.hasValues) continue
    try {
      // Lectura de columnas
      const codigo              = toStr(row.getCell(2).value) || 'Desconocida'
      const descripcion         = toStr(row.getCell(3).value) || 'Desconocida'
      const datos               = toStr(row.getCell(4).value) || 'Datos'
      const areaNombre          = toStr(row.getCell(5).value)
      const sistemaNombre       = toStr(row.getCell(6).value)
      const en_desarrollo       = toSiNo(row.getCell(7).value)           // String? -> "SI"/"NO"
      const capa                = toStr(row.getCell(8).value) || 'Core'
      const usuario             = toStr(row.getCell(11).value) || 'default_user'
      const documento_detalle   = toStr(row.getCell(12).value) || 'N/A'
      const depende_de_la_plaza = toBool(row.getCell(13).value)          // Boolean?
      const comentarios         = toStr(row.getCell(14).value) || ''     // String?
      const depende_del_entorno = toBool(row.getCell(15).value)          // Boolean?
      const ambiente_testing    = toSiNo(row.getCell(16).value, 'NO')    // String? -> "SI"/"NO"
      const paisNombre          = toStr(row.getCell(17).value)
      const borrar              = toBool(row.getCell(18).value)          // Boolean?

      const areaFuncionalId = await findAreaId(areaNombre)
      const sistemaId       = await findSistemaId(sistemaNombre)
      const paisId          = await findPaisId(paisNombre)

      // Construcción del payload conforme a tu schema Prisma (tipos correctos)
      const data = {
        codigo,
        descripcion,
        datos,                       // String?
        en_desarrollo,               // String? ("SI"/"NO")
        capa,                        // String?
        usuario,                     // String?
        documento_detalle,           // String?
        depende_de_la_plaza,         // Boolean?
        comentarios,                 // String?
        depende_del_entorno,         // Boolean?
        ambiente_testing,            // String? ("SI"/"NO")
        borrar,                      // Boolean?
        ...(areaFuncionalId !== undefined ? { areaFuncionalId } : {}),
        ...(sistemaId       !== undefined ? { sistemaId }       : {}),
        ...(paisId          !== undefined ? { paisId }          : {}),
      }

      await app.prisma.inventarioTabla.create({ data })
      ok++
    } catch (e) {
      fail++
      app.log.warn({
        row: rowNumber,
        name: e?.name,
        message: (e?.message || '').slice(0, 600)
      }, 'Error importando fila')
    }
  }

  return { ok, fail }
}

