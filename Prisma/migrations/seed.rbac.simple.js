// prisma/seed.rbac.simple.js (puedes meterlo dentro de tu seed.js)
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function seedRBACSimple() {
    // Permisos de panel/menú (agrega/quita los que necesites)
    const menuPerms = [
        'menu:dashboard',
        'menu:inscripciones',
        'menu:administracion',
        'menu:matriculas',
        'menu:asistencia',
        'menu:configuracion',
        'menu:usuarios',
        'menu:roles',
        'menu:permisos',
        'menu:reportes',
        'menu:estadisticas',
    ]

    for (const slug of menuPerms) {
        const [resource, action] = slug.split(':')
        await prisma.permission.upsert({
            where: { action_resource: { action, resource } }, // requiere @@unique([action, resource])
            update: {},
            create: { resource, action, description: `Acceso a ${slug}` }
        })
    }

    // Roles básicos
    const roles = [
        { name: 'viewer', description: 'Solo menús básicos' },
        { name: 'admin', description: 'Todos los menús' },
    ]
    for (const r of roles) {
        await prisma.role.upsert({
            where: { name: r.name },
            update: { description: r.description },
            create: r
        })
    }

    // Asignar permisos a roles
    const allPerms = await prisma.permission.findMany()
    const mapPerm = s => allPerms.find(p => `${p.resource}:${p.action}` === s)?.id

    const byRole = {
        viewer: [
            'menu:dashboard',
            'menu:inscripciones',
            'menu:reportes',
        ],
        admin: menuPerms, // todo
    }

    for (const [roleName, slugs] of Object.entries(byRole)) {
        const role = await prisma.role.findUnique({ where: { name: roleName } })
        const ids = slugs.map(mapPerm).filter(Boolean)
        await prisma.rolePermission.deleteMany({ where: { roleId: role.id } })
        if (ids.length) {
            await prisma.rolePermission.createMany({
                data: ids.map(permissionId => ({ roleId: role.id, permissionId })),
                skipDuplicates: true
            })
        }
    }

    console.log('RBAC (simple) listo')
}

seedRBACSimple().finally(() => prisma.$disconnect())
