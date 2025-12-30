// src/services/inventarioTabla.service.js
import ExcelJS from 'exceljs'
import fs from 'node:fs/promises'
import path from 'node:path'

const takeCap = (n, cap = 100) => Math.min(Math.max(Number(n) || 10, 1), cap)
const toIntOrNull = (v) => {
  if (v === undefined || v === null) return null
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase()
    if (s === '' || s === 'null' || s === 'undefined') return null
  }
  const n = Number(v)
  // Si no quieres aceptar 0/negativos, descomenta:
  // if (!Number.isFinite(n) || n <= 0) return null
  return Number.isFinite(n) ? n : null
}


export async function list(app, { page = 1, limit = 10, search = '', sortBy = 'id', order = 'asc' }) {
  const skip = (Math.max(Number(page) || 1, 1) - 1) * (Number(limit) || 10)
  const take = takeCap(limit, 100)

  // Campos permitidos para orden
  const dir = order === 'desc' ? 'desc' : 'asc'

  const sortMap = {
    id: { id: dir },
    codigo: { codigo: dir },
    descripcion: { descripcion: dir },
    datos: { datos: dir },
    createdAt: { createdAt: dir },
    updatedAt: { updatedAt: dir },
    en_desarrollo: { en_desarrollo: dir },
    capa: { capa: dir },
    // 👇 ordenar por relación (texto)
    area_funcional: { areaFuncional: { nombre: dir } },
    sistema: { sistema: { sistema: dir } },   // si tu campo es "nombre", cambia a { nombre: dir }
    pais: { pais: { nombre: dir } },
  }

  const orderBy = sortMap[sortBy] ?? { id: 'asc' }

  const where = search
    ? {
      OR: [
        { codigo: { contains: search } },
        { descripcion: { contains: search } }
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
  if ('areaFuncionalId' in data) data.areaFuncionalId = toIntOrNull(data.areaFuncionalId)
  if ('sistemaId'       in data) data.sistemaId       = toIntOrNull(data.sistemaId)
  if ('paisId'          in data) data.paisId          = toIntOrNull(data.paisId)

  if (data.areaFuncionalId != null) {
    const ok = await app.prisma.areaFuncional.findUnique({ where: { id: data.areaFuncionalId } })
    if (!ok) data.areaFuncionalId = null   // ← sin error
  }
  if (data.sistemaId != null) {
    const ok = await app.prisma.sistema.findUnique({ where: { id: data.sistemaId } })
    if (!ok) data.sistemaId = null         // ← sin error
  }
  if (data.paisId != null) {
    const ok = await app.prisma.pais.findUnique({ where: { id: data.paisId } })
    if (!ok) data.paisId = null            // ← sin error
  }
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
  // ============================
  // 1) Archivo y versión
  // ============================
  const FILE_NAME = 'PRD_99000_GL_V3R1.1_ Inventario BBDD.45 1.xlsm'

  // ⚠️ AJUSTA ESTE CODE según la versión que corresponda a ese Excel
  const VERSION_CODE = 'GL_V3R1.1'

  // Localiza el archivo en posibles carpetas
  const baseDirs = [
    app.publicDir && path.resolve(app.publicDir),
    path.resolve(process.cwd(), 'Src/public'),
  ].filter(Boolean)

  let absPath
  for (const base of baseDirs) {
    const p = path.normalize(path.join(base, FILE_NAME))
    try {
      await fs.access(p)
      absPath = p
      break
    } catch {
      // ignorar y seguir probando
    }
  }

  if (!absPath) {
    throw app.httpErrors.badRequest(`No se encontró el archivo en: ${baseDirs.join(' | ')}`)
  }

  // ============================
  // 2) Obtener CatalogVersion
  // ============================
  const version = await app.prisma.catalogVersion.findUnique({
    where: { code: VERSION_CODE },
  })

  if (!version) {
    throw app.httpErrors.badRequest(
      `No existe CatalogVersion con code="${VERSION_CODE}". Corre el seed de versiones o ajusta VERSION_CODE.`
    )
  }

  const versionId = version.id
  app.log.info({ versionId, VERSION_CODE }, 'Importando inventario para esta versión')

  // Si quieres limpiar antes de importar, descomenta:
  // await app.prisma.inventarioTabla.deleteMany({ where: { versionId } })

  // ============================
  // 3) Cargar Excel
  // ============================
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(absPath)
  const ws = wb.getWorksheet('Inventario') || wb.worksheets[0]
  if (!ws) {
    throw app.httpErrors.badRequest('El libro no contiene hojas (ni “Inventario” ni primera hoja)')
  }

  // ============================
  // 4) Helpers
  // ============================
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
    if (['s', 'si', 'sí', 'y', 'yes', 'true', '1', 'x', '✓'].includes(s)) return true
    if (['n', 'no', 'false', '0'].includes(s)) return false
    return def
  }

  // Para columnas String que conceptualmente son booleanas
  const toSiNo = (v, defNo = 'NO') => (toBool(v, false) ? 'SI' : defNo)

  // Normalización básica y alias de país
  const norm = (s) =>
    String(s || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '') // quitar acentos
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()

  const countryAlias = (s) => {
    const k = norm(s)
    if (k === 'mejico' || k === 'mejico.') return 'mexico'
    return k
  }

  // ============================
  // 5) Caches y finders
  // ============================
  const cache = {
    area: new Map(),
    sist: new Map(),
    pais: new Map(),
  }

  const findAreaId = async (nombre) => {
    const key = norm(nombre)
    if (!key) return undefined
    if (cache.area.has(key)) return cache.area.get(key)

    // Igual que antes, sin complicarnos con versionId aquí
    const r = await app.prisma.areaFuncional.findFirst({
      where: { nombre: key }, // MySQL lo suele comparar según la collation
      select: { id: true },
    })

    const id = r?.id
    cache.area.set(key, id)
    return id
  }

  const findSistemaId = async (nombre) => {
    const key = norm(nombre)
    if (!key) return undefined
    if (cache.sist.has(key)) return cache.sist.get(key)

    const r = await app.prisma.sistema.findFirst({
      where: { sistema: key },
      select: { id: true },
    })

    const id = r?.id
    cache.sist.set(key, id)
    return id
  }

  const findPaisId = async (nombre) => {
    const key = countryAlias(nombre)
    if (!key) return undefined
    if (cache.pais.has(key)) return cache.pais.get(key)

    const r = await app.prisma.pais.findFirst({
      where: { nombre: key },
      select: { id: true },
    })

    const id = r?.id
    cache.pais.set(key, id)
    return id
  }

  // ============================
  // 6) Loop de filas
  // ============================
  let ok = 0
  let fail = 0

  for (let rowNumber = 5; rowNumber <= ws.rowCount; rowNumber++) {
    const row = ws.getRow(rowNumber)
    if (!row || !row.hasValues) continue

    try {
      // Lectura de columnas (lo mismo que tenías)
      const codigo = toStr(row.getCell(2).value) || 'Desconocida'
      const descripcion = toStr(row.getCell(3).value) || 'Desconocida'
      const datos = toStr(row.getCell(4).value)
      const areaNombre = toStr(row.getCell(5).value)
      const sistemaNombre = toStr(row.getCell(6).value)

      const en_desarrollo = toStr(row.getCell(7).value) // String? -> "SI"/"NO"
      const capa = toStr(row.getCell(8).value)  || '—'
      const usuario = toStr(row.getCell(11).value) || ''
      const documento_detalle = toStr(row.getCell(12).value) || 'N/A'
      const depende_de_la_plaza = toBool(row.getCell(13).value)
      const comentarios = toStr(row.getCell(14).value) || ''
      const depende_del_entorno = toBool(row.getCell(15).value)
      const ambiente_testing = toSiNo(row.getCell(16).value, 'NO')
      const paisNombre = toStr(row.getCell(17).value)
      const borrar = toBool(row.getCell(18).value)

      const areaFuncionalId = await findAreaId(areaNombre)
      const sistemaId = await findSistemaId(sistemaNombre)
      const paisId = await findPaisId(paisNombre)

      // Construcción del payload conforme a tu schema Prisma
      const data = {
        codigo,
        descripcion,
        datos,
        en_desarrollo,          // String? ("SI"/"NO")
        capa,
        usuario,
        documento_detalle,
        depende_de_la_plaza,    // Boolean?
        comentarios,
        depende_del_entorno,    // Boolean?
        ambiente_testing,       // String? ("SI"/"NO")
        borrar,                 // Boolean?

        // 🔹 versión SIEMPRE
        versionId,

        ...(areaFuncionalId !== undefined ? { areaFuncionalId } : {}),
        ...(sistemaId !== undefined ? { sistemaId } : {}),
        ...(paisId !== undefined ? { paisId } : {}),
      }

      await app.prisma.inventarioTabla.create({ data })
      ok++
    } catch (e) {
      fail++
      app.log.warn(
        {
          row: rowNumber,
          name: e?.name,
          message: (e?.message || '').slice(0, 600),
        },
        'Error importando fila'
      )
    }
  }

  app.log.info({ ok, fail, versionId }, 'Importación desde Excel finalizada')
  return { ok, fail, versionId }
}

