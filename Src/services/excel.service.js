// src/services/excel-prisma.service.js
import xlsx from 'xlsx'

/**
 * Lee un Excel (hoja "Datos") y:
 *  1. Crea una tabla en la BD vía SQL puro.
 *  2. Inserta todas las filas del Excel en esa tabla.
 *
 * - Fila 1: cabecera (Tabla, Sección, Campo, Descripción, Tipo de campo)
 * - Filas 2+: datos
 *
 * NO usa Prisma Migrate, NO toca schema.prisma.
 */
export async function processExcel(app, {
  buffer,
  filename = 'upload.xlsx',
  tableName, // opcional, si no se manda se deriva del nombre del archivo
} = {}) {
  if (!buffer) {
    throw app.httpErrors.badRequest('No se recibió el archivo Excel')
  }

  if (!app.prisma) {
    throw app.httpErrors.internalServerError('app.prisma no está disponible')
  }

  // 1. Leer workbook desde buffer
  const workbook = xlsx.read(buffer, { type: 'buffer' })

  // Buscar hoja "Datos" primero
  const sheetName =
    workbook.SheetNames.find(n => n.toLowerCase().trim() === 'datos') ??
    workbook.SheetNames[0]

  const sheet = workbook.Sheets[sheetName]
  if (!sheet) {
    throw app.httpErrors.badRequest('El Excel no contiene hojas válidas')
  }

  // Matriz [fila][columna], fila 0 = cabecera
  const rows = xlsx.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: true
  })

  if (rows.length < 2) {
    throw app.httpErrors.badRequest('El Excel debe tener cabecera y al menos una fila de datos')
  }

  const headerRow = rows[0]
  const dataRows = rows.slice(1).filter(r =>
    r && r.some(v => v !== null && String(v).trim() !== '')
  )

  if (!dataRows.length) {
    throw app.httpErrors.badRequest('No hay filas de datos (solo cabecera)')
  }

  // 2. Calcular nombre de tabla
  const finalTableName = normalizeTableName(tableName || filename)

  // 3. Construir columnas a partir de la cabecera
  const columns = buildColumnsFromHeader(headerRow)
  if (!columns.length) {
    throw app.httpErrors.badRequest('No se detectaron columnas válidas en la cabecera del Excel')
  }

  const colNamesSql = columns.map(c => c.dbName).join(', ')
  const colDefsSql  = columns.map(c => `${c.dbName} TEXT`).join(', ')

  // 4. Ejecutar SQL: DROP + CREATE + INSERTs
  // IMPORTANTE: esto funciona en la mayoría de RDBMS (Postgres, MySQL, SQL Server, etc.)
  await app.prisma.$executeRawUnsafe(
    `DROP TABLE IF EXISTS ${finalTableName};`
  )

  await app.prisma.$executeRawUnsafe(
    `CREATE TABLE ${finalTableName} (${colDefsSql});`
  )

  let inserted = 0

  for (const row of dataRows) {
    const valuesSql = columns.map(c => {
      const raw = row[c.index]

      if (raw === undefined || raw === null || String(raw).trim() === '') {
        return 'NULL'
      }

      // Guardamos todo como texto; la columna es TEXT
      const s = String(raw).replace(/'/g, "''")
      return `'${s}'`
    }).join(', ')

    const sql = `INSERT INTO ${finalTableName} (${colNamesSql}) VALUES (${valuesSql});`
    await app.prisma.$executeRawUnsafe(sql)
    inserted++
  }

  return {
    ok: true,
    message: 'Tabla creada desde Excel e importación de datos realizada (SQL directo)',
    tableName: finalTableName,
    columns: columns.map(c => ({ header: c.label, column: c.dbName })),
    rowsInserted: inserted,
    sheetName
  }
}

/* ===================== Helpers ===================== */

function buildColumnsFromHeader(headerRow) {
  const columns = []

  for (let i = 0; i < headerRow.length; i++) {
    const raw = headerRow[i]
    const label = raw != null ? String(raw).trim() : ''
    if (!label) continue  // cabecera vacía => ignorar columna

    let dbName = normalizeIdentifier(label)   // nombre en BD
    if (!dbName) continue

    // Evitar duplicados por si dos cabeceras se normalizan igual
    const base = dbName
    let n = 2
    while (columns.some(c => c.dbName === dbName)) {
      dbName = `${base}_${n}`
      n++
    }

    columns.push({
      index: i,
      label,
      dbName
    })
  }

  return columns
}

function normalizeTableName(name) {
  // partimos del nombre del archivo, sin extensión
  let base = name.replace(/\.[^.]+$/, '')
  if (!base) base = 'excel_data'
  let t = normalizeIdentifier(base)
  if (!t) t = 'excel_data'
  return t
}

// Convierte "Tipo de campo" -> "tipo_de_campo", sin acentos, solo [a-z0-9_]
function normalizeIdentifier(str) {
  if (!str) return ''
  let s = String(str)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar acentos
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')  // espacios y símbolos => _
    .replace(/^_+/, '')
    .replace(/_+$/, '')
    .replace(/_+/g, '_')

  if (!s) return ''
  if (/^[0-9]/.test(s)) s = 'c_' + s
  return s
}
