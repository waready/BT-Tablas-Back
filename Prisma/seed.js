// prisma/seed.js
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

// =========================
// 1) ROLES, PERMISOS, ADMIN
// =========================
async function upsertPermissionsAndRoles () {
  const perms = [
    ['users', 'read'],
    ['users', 'create'],
    ['users', 'update'],
    ['users', 'delete'],
    ['reports', 'export'],
    ['sql', 'export']
  ]

  // Permisos
  for (const [resource, action] of perms) {
    const desc = `${resource}.${action}`
    const existing = await prisma.permission.findFirst({ where: { resource, action } })
    if (!existing) {
      await prisma.permission.create({
        data: { resource, action, description: desc }
      })
    }
  }

  // Roles admin y viewer
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin', description: 'Administrador' }
  })

  const viewerRole = await prisma.role.upsert({
    where: { name: 'viewer' },
    update: {},
    create: { name: 'viewer', description: 'Solo lectura' }
  })

  // Vincular permisos a admin
  const allPerms = await prisma.permission.findMany()
  for (const p of allPerms) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: p.id
        }
      },
      update: {},
      create: { roleId: adminRole.id, permissionId: p.id }
    })
  }

  // Permisos viewer (solo lectura + export reports)
  const viewerAllowed = allPerms.filter(p =>
    (p.resource === 'users' && p.action === 'read') ||
    (p.resource === 'reports' && p.action === 'export')
  )

  for (const p of viewerAllowed) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: viewerRole.id,
          permissionId: p.id
        }
      },
      update: {},
      create: { roleId: viewerRole.id, permissionId: p.id }
    })
  }

  // Usuario admin
  const adminEmail = 'admin@example.com'
  const passwordHash = await bcrypt.hash('admin123', 10)

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: passwordHash,
      name: 'Admin',
      isActive: true,
      username: 'admin'
    }
  })

  // Vincular admin -> rol admin
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: admin.id,
        roleId: adminRole.id
      }
    },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id }
  })
}

// =========================
// 2) VERSIONES DEL CATÁLOGO
// =========================
async function seedVersiones () {
  const versions = [
    {
      code: 'GL_V2R3',
      name: 'PRD_99000_GL_V2R3_ Inventario BBDD'
    },
    {
      code: 'GL_V3R1.1',
      name: 'PRD_99000_GL_V3R1.1_ Inventario BBDD'
    }
  ]

  for (const v of versions) {
    // ⚠️ OJO: el modelo se llama CatalogVersion → prisma.catalogVersion
    await prisma.catalogVersion.upsert({
      where: { code: v.code },
      update: {},
      create: v
    })
  }

  console.log('✅ Versiones sembradas')
}

// =========================
// 3) PAISES
// =========================
async function seedPaises () {
  const paises = [
    { nombre: 'Argentina', codigo: 'AR' },
    { nombre: 'Bolivia', codigo: 'BO' },
    { nombre: 'Chile', codigo: 'CH' },
    { nombre: 'Colombia', codigo: 'CO' },
    { nombre: 'El Salvador', codigo: 'ES' },
    { nombre: 'Global', codigo: 'GL' },
    { nombre: 'México', codigo: 'MX' },
    { nombre: 'Panamá', codigo: 'PA' },
    { nombre: 'Paraguay', codigo: 'PY' },
    { nombre: 'Perú', codigo: 'PE' },
    { nombre: 'Uruguay', codigo: 'UY' },
    { nombre: 'Honduras', codigo: 'HO' }
  ]

  for (const p of paises) {
    const exists = await prisma.pais.findFirst({ where: { nombre: p.nombre } })
    if (!exists) {
      await prisma.pais.create({
        data: { nombre: p.nombre, isoCode: p.codigo }
      })
    } else if (!exists.isoCode && p.codigo) {
      await prisma.pais.update({
        where: { id: exists.id },
        data: { isoCode: p.codigo }
      })
    }
  }

  console.log('✅ Países sembrados/actualizados')
}

// =========================
// 4) ÁREAS FUNCIONALES
// =========================
async function seedAreas () {
  const defaultVersion = await prisma.catalogVersion.findUnique({
    where: { code: 'GL_V2R3' }
  })

  if (!defaultVersion) {
    throw new Error('No existe CatalogVersion GL_V2R3, corre seedVersiones primero')
  }

  const areas = [
    { nombre: 'Núcleo', codigo: 10100 },
    { nombre: 'Colocaciones', codigo: 10200 },
    { nombre: 'Captaciones', codigo: 10300 },
    { nombre: 'Servicios', codigo: 10400 },
    { nombre: 'Mercados Financieros', codigo: 10500 },
    { nombre: 'Comercio Internacional', codigo: 10600 },
    { nombre: 'Canales', codigo: 10700 },
    { nombre: 'Módulo normativo', codigo: 10800 },
    { nombre: 'BTDevelopers', codigo: 10900 },
    { nombre: 'Genérico', codigo: 99000 }
  ]

  for (const a of areas) {
    const exists = await prisma.areaFuncional.findFirst({
      where: {
        codigo: a.codigo,
        versionId: defaultVersion.id
      }
    })

    if (!exists) {
      await prisma.areaFuncional.create({
        data: {
          nombre: a.nombre,
          codigo: a.codigo,
          versionId: defaultVersion.id
        }
      })
    } else {
      // opcional: actualizar nombre si cambió
      await prisma.areaFuncional.update({
        where: { id: exists.id },
        data: { nombre: a.nombre }
      })
    }
  }

  console.log('✅ Áreas funcionales sembradas/actualizadas')
}

// =========================
// 5) SISTEMAS
// =========================
async function seedSistemas () {
  const defaultVersion = await prisma.catalogVersion.findUnique({
    where: { code: 'GL_V2R3' }
  })

  if (!defaultVersion) {
    throw new Error('No existe CatalogVersion GL_V2R3, corre seedVersiones primero')
  }

  const sistemas = [
    { sistema: 'Configuración Bantotal', cod_area_funcional: 10100, corr: 1, cod_sistema: 10101 },
    { sistema: 'Utilitarios Bantotal', cod_area_funcional: 10100, corr: 2, cod_sistema: 10102 },
    { sistema: 'Sistema de Integracion con Workflow', cod_area_funcional: 10100, corr: 3, cod_sistema: 10103 },
    { sistema: 'Sistema de Carpeta digital', cod_area_funcional: 10100, corr: 4, cod_sistema: 10104 },
    { sistema: 'Bantotal Impresor |Sistema de Definición y resolución de impresos', cod_area_funcional: 10100, corr: 5, cod_sistema: 10105 },
    { sistema: 'Sistema de Impuestos', cod_area_funcional: 10100, corr: 6, cod_sistema: 10106 },
    { sistema: 'Sistema de Auditoría', cod_area_funcional: 10100, corr: 7, cod_sistema: 10107 },
    { sistema: 'Sistema de Seguridad', cod_area_funcional: 10100, corr: 8, cod_sistema: 10108 },
    { sistema: 'Sistema de Contrapartes', cod_area_funcional: 10100, corr: 9, cod_sistema: 10109 },
    { sistema: 'Sistema de Contabilidad', cod_area_funcional: 10100, corr: 10, cod_sistema: 10110 },
    { sistema: 'Sistema de Conciliaciones', cod_area_funcional: 10100, corr: 11, cod_sistema: 10111 },
    { sistema: 'Sistema Motor de Reglas de Negocio', cod_area_funcional: 10100, corr: 12, cod_sistema: 10112 },
    { sistema: 'Sistema de Definición y ejecución de transacciones', cod_area_funcional: 10100, corr: 13, cod_sistema: 10113 },
    { sistema: 'Sistema de Administración del riesgo de crédito', cod_area_funcional: 10100, corr: 14, cod_sistema: 10114 },
    { sistema: 'Sistema de Administración de Precios', cod_area_funcional: 10100, corr: 15, cod_sistema: 10115 },
    { sistema: 'Sistema de Mensajería', cod_area_funcional: 10100, corr: 16, cod_sistema: 10116 },
    { sistema: 'Sistema de Alertas de Lavado de Dinero', cod_area_funcional: 10100, corr: 17, cod_sistema: 10117 },
    { sistema: 'Sistema de Control documentario', cod_area_funcional: 10100, corr: 18, cod_sistema: 10118 },
    { sistema: 'Sistema de Resolución de Datos', cod_area_funcional: 10100, corr: 19, cod_sistema: 10119 },
    { sistema: 'Sistema de Facultades y Poderes', cod_area_funcional: 10100, corr: 20, cod_sistema: 10120 },
    { sistema: 'Sistema de Evaluacion Automática', cod_area_funcional: 10100, corr: 21, cod_sistema: 10121 },
    { sistema: 'Sistema de Reclamos *En proceso Bantotal', cod_area_funcional: 10100, corr: 22, cod_sistema: 10122 },
    { sistema: 'Sistema de Préstamos', cod_area_funcional: 10200, corr: 1, cod_sistema: 10201 },
    { sistema: 'Sistema de Descuentos', cod_area_funcional: 10200, corr: 2, cod_sistema: 10202 },
    { sistema: 'Sistema de Garantías otorgadas', cod_area_funcional: 10200, corr: 3, cod_sistema: 10203 },
    { sistema: 'Sistema de Garantías recibidas', cod_area_funcional: 10200, corr: 4, cod_sistema: 10204 },
    { sistema: 'Sistema de Límites de crédito', cod_area_funcional: 10200, corr: 5, cod_sistema: 10205 },
    { sistema: 'Sistema de Préstamos Hipotecario', cod_area_funcional: 10200, corr: 6, cod_sistema: 10206 },
    { sistema: 'Bantotal Microfinanzas', cod_area_funcional: 10200, corr: 7, cod_sistema: 10207 },
    { sistema: 'Sistema de Préstamos por Convenios', cod_area_funcional: 10200, corr: 8, cod_sistema: 10208 },
    { sistema: 'Sistema de Microseguros', cod_area_funcional: 10200, corr: 9, cod_sistema: 10209 },
    { sistema: 'Sistema de Gestión de Cobranza', cod_area_funcional: 10200, corr: 10, cod_sistema: 10210 },
    { sistema: 'Sistema de Préstamos Consumo', cod_area_funcional: 10200, corr: 11, cod_sistema: 10211 },
    { sistema: 'Fondos de Inversión', cod_area_funcional: 10200, corr: 12, cod_sistema: 10212 },
    { sistema: 'Sistema de Préstamos Vehiculares', cod_area_funcional: 10200, corr: 13, cod_sistema: 10213 },
    { sistema: 'Sistema de Cajas', cod_area_funcional: 10300, corr: 1, cod_sistema: 10301 },
    { sistema: 'Sistema de Cuentas de Ahorro', cod_area_funcional: 10300, corr: 2, cod_sistema: 10302 },
    { sistema: 'Sistema de Cuentas Corrientes', cod_area_funcional: 10300, corr: 3, cod_sistema: 10303 },
    { sistema: 'Sistema de Depósitos a plazo', cod_area_funcional: 10300, corr: 4, cod_sistema: 10304 },
    { sistema: 'Sistema de Tarjetas de débito', cod_area_funcional: 10300, corr: 5, cod_sistema: 10305 },
    { sistema: 'Sistema de Cofres de Seguridad', cod_area_funcional: 10300, corr: 6, cod_sistema: 10306 },
    { sistema: 'Sistema de Cash Management', cod_area_funcional: 10300, corr: 7, cod_sistema: 10307 },
    { sistema: 'Sistema de Cámara de compensación de Cheques', cod_area_funcional: 10300, corr: 8, cod_sistema: 10308 },
    { sistema: 'Sistema de Cuenta Corriente y Caja de Ahorro', cod_area_funcional: 10300, corr: 9, cod_sistema: 10309 },
    { sistema: 'Sistema de Tesorería', cod_area_funcional: 10300, corr: 10, cod_sistema: 10310 },
    { sistema: 'Sistema Nacional de Pagos', cod_area_funcional: 10300, corr: 11, cod_sistema: 10311 },
    { sistema: 'Bantotal Servicios', cod_area_funcional: 10400, corr: 1, cod_sistema: 10401 },
    { sistema: 'Mercados | Títulos y Valores', cod_area_funcional: 10500, corr: 1, cod_sistema: 10501 },
    { sistema: 'Mercados | Cambios Mayoristas', cod_area_funcional: 10500, corr: 2, cod_sistema: 10502 },
    { sistema: 'Mercados | Dinero', cod_area_funcional: 10500, corr: 3, cod_sistema: 10503 },
    { sistema: 'Mercados | Cambios Minoristas', cod_area_funcional: 10500, corr: 4, cod_sistema: 10504 },
    { sistema: 'Mercados | Títulos Posición Propia', cod_area_funcional: 10500, corr: 5, cod_sistema: 10505 },
    { sistema: 'Comercio exterior - Cartas de crédito y Cobranzas', cod_area_funcional: 10600, corr: 1, cod_sistema: 10601 },
    { sistema: 'Transferencias y Órdenes de pago', cod_area_funcional: 10600, corr: 2, cod_sistema: 10602 },
    { sistema: 'Cheques del exterior', cod_area_funcional: 10600, corr: 3, cod_sistema: 10603 },
    { sistema: 'Valores al cobro', cod_area_funcional: 10600, corr: 4, cod_sistema: 10604 },
    { sistema: 'Operaciones de cambio del exterior', cod_area_funcional: 10600, corr: 5, cod_sistema: 10605 },
    { sistema: 'Servicios bancarios internacionales', cod_area_funcional: 10600, corr: 6, cod_sistema: 10606 },
    { sistema: 'Factoring', cod_area_funcional: 10700, corr: 1, cod_sistema: 10701 },
    { sistema: 'Fondos de Inversión', cod_area_funcional: 10800, corr: 1, cod_sistema: 10801 },
    { sistema: 'Fideicomisos', cod_area_funcional: 10800, corr: 2, cod_sistema: 10802 }
  ]

  for (const s of sistemas) {
    const exists = await prisma.sistema.findFirst({
      where: {
        cod_sistema: s.cod_sistema,
        versionId: defaultVersion.id
      }
    })

    if (!exists) {
      await prisma.sistema.create({
        data: {
          sistema: s.sistema,
          cod_area_funcional: s.cod_area_funcional,
          cod_sistema: s.cod_sistema,
          corr: s.corr,
          versionId: defaultVersion.id
        }
      })
    } else {
      await prisma.sistema.update({
        where: { id: exists.id },
        data: {
          sistema: s.sistema,
          cod_area_funcional: s.cod_area_funcional,
          corr: s.corr
        }
      })
    }
  }

  console.log('✅ Sistemas sembrados/actualizados')
}

// =========================
// MAIN
// =========================
async function main () {
  await upsertPermissionsAndRoles()
  await seedVersiones()
  await seedPaises()
  await seedAreas()
  await seedSistemas()

  console.log('🌱 Seed completado ✅')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
