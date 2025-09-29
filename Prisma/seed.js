import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'


const prisma = new PrismaClient()


async function main() {
    const perms = [
        ['users', 'read'], ['users', 'create'], ['users', 'update'], ['users', 'delete'],
        ['reports', 'export'], ['sql', 'export']
    ]
    await prisma.permission.createMany({
        data: perms.map(([resource, action]) => ({ resource, action, description: `${resource}.${action}` })),
        skipDuplicates: true
    })


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


    const allPerms = await prisma.permission.findMany()
    // Admin tiene todos los permisos
    for (const p of allPerms) {
        await prisma.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: adminRole.id, permissionId: p.id } },
            update: {},
            create: { roleId: adminRole.id, permissionId: p.id }
        })
    }
    // Viewer solo lectura + export reportes
    const viewerAllowed = allPerms.filter(p => (
        (p.resource === 'users' && p.action === 'read') ||
        (p.resource === 'reports' && p.action === 'export')
    ))
    for (const p of viewerAllowed) {
        await prisma.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: viewerRole.id, permissionId: p.id } },
            update: {},
            create: { roleId: viewerRole.id, permissionId: p.id }
        })
    }


    const passwordHash = await bcrypt.hash('admin123', 10)
    const admin = await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: {},
        create: { email: 'admin@example.com', password: passwordHash, name: 'Admin' }
    })
    await prisma.userRole.upsert({
        where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
        update: {},
        create: { userId: admin.id, roleId: adminRole.id }
    })


    console.log('Seed completado')
}


main().finally(() => prisma.$disconnect())