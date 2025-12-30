import * as ExcelPrismaService from '../services/excel.service.js'

export async function process(app, req, reply) {
  const { file } = req.body || {}

  if (!file) {
    throw app.httpErrors.badRequest('Debes enviar el Excel en el campo "file"')
  }

  // gracias a attachFieldsToBody: true, `file` es el objeto de multipart
  const buffer = await file.toBuffer()
  const filename = file.filename || 'modelo.xlsx'

  // aquí NO pedimos schemaPath ni migrationName, todo es interno
  const result = await ExcelPrismaService.processExcel(app, {
    buffer,
    filename
    // schemaPath y migrationName se resuelven por defecto en el service
  })

  return reply.send(result)
}
