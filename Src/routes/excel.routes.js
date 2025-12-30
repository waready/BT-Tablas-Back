import * as ExcelPrismaController from '../controllers/excel.controller.js'

export default async function excelPrismaRoutes(app) {
  const ExcelPrismaBody = {
    type: 'object',
    required: ['file'],
    properties: {
      // 👈 SOLO el archivo
      file: { isFile: true }
    }
  }

  app.post('/excel/prisma/process', {
    schema: {
      tags: ['ExcelPrisma'],
      summary: 'Subir Excel de modelo de datos y generar tablas Prisma',
      consumes: ['multipart/form-data'],
      body: ExcelPrismaBody
    }
  }, (req, reply) => ExcelPrismaController.process(app, req, reply))
}
