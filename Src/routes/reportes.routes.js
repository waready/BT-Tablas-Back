export default async function reportesRoutes(app) {

    // DASHBOARD - RESUMEN (cards)
    app.get('/dashboard/summary', {
        preHandler: [app.requireAuth],
        schema: {
            tags: ['Dashboard'],
            description: 'Resumen general para cards del dashboard',
            security: [{ bearerAuth: [] }]
        }
    }, async () => {
        const [
            totalPaises,
            totalAreasFuncionales,
            totalSistemas,
            totalTablas,
            totalUsuarios
        ] = await Promise.all([
            app.prisma.pais.count(),
            app.prisma.areaFuncional.count(),
            app.prisma.sistema.count(),
            app.prisma.inventarioTabla.count(),
            app.prisma.user.count()
        ])

        return {
            cards: [
                { key: 'paises', label: 'Países', value: totalPaises },
                { key: 'areas', label: 'Áreas funcionales', value: totalAreasFuncionales },
                { key: 'sistemas', label: 'Sistemas', value: totalSistemas },
                { key: 'tablas', label: 'Tablas registradas', value: totalTablas },
                { key: 'usuarios', label: 'Usuarios', value: totalUsuarios }
            ]
        }
    })

    // DASHBOARD - SISTEMAS POR ÁREA FUNCIONAL
    app.get('/dashboard/sistemas-por-area', {
        preHandler: [app.requireAuth],
        schema: {
            tags: ['Dashboard'],
            description: 'Cantidad de sistemas por área funcional',
            security: [{ bearerAuth: [] }]
        }
    }, async () => {
        const areas = await app.prisma.areaFuncional.findMany({
            include: { sistemas: true }
        })

        // armamos datos para chart
        const sorted = areas
            .map(a => ({
                codigo: a.codigo,
                nombre: a.nombre,
                totalSistemas: a.sistemas.length
            }))
            .sort((a, b) => b.totalSistemas - a.totalSistemas)

        return {
            labels: sorted.map(a => a.nombre),
            datasets: [
                {
                    label: 'Sistemas por área funcional',
                    data: sorted.map(a => a.totalSistemas)
                }
            ]
        }
    })

    // DASHBOARD - TOP SISTEMAS POR NÚMERO DE TABLAS
    app.get('/dashboard/tablas-por-sistema', {
        preHandler: [app.requireAuth],
        schema: {
            tags: ['Dashboard'],
            description: 'Top sistemas por cantidad de tablas inventariadas',
            security: [{ bearerAuth: [] }]
        }
    }, async (request) => {
        const limit = Number(request.query.limit) || 5

        const sistemas = await app.prisma.sistema.findMany({
            include: {
                _count: {
                    select: { inventarioTablas: true }
                }
            },
            orderBy: {
                inventarioTablas: {
                    _count: 'desc'
                }
            },
            take: limit
        })

        return {
            limit,
            labels: sistemas.map(s => s.sistema),
            datasets: [
                {
                    label: 'Tablas por sistema',
                    data: sistemas.map(s => s._count.inventarioTablas)
                }
            ]
        }
    })

    // DASHBOARD - TABLAS CREADAS POR MES
    app.get('/dashboard/tablas-por-mes', {
        preHandler: [app.requireAuth],
        schema: {
            tags: ['Dashboard'],
            description: 'Cantidad de tablas registradas por mes en un año',
            security: [{ bearerAuth: [] }]
        }
    }, async (request) => {
        const year = Number(request.query.year) || new Date().getFullYear()

        const start = new Date(year, 0, 1)      // 1 enero
        const end = new Date(year + 1, 0, 1)  // 1 enero año siguiente

        const rows = await app.prisma.inventarioTabla.findMany({
            where: {
                createdAt: {
                    gte: start,
                    lt: end
                }
            },
            select: { createdAt: true }
        })

        const counts = Array(12).fill(0)
        for (const r of rows) {
            const m = r.createdAt.getMonth() // 0-11
            counts[m]++
        }

        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
            'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

        return {
            year,
            labels: meses,
            datasets: [
                {
                    label: `Tablas creadas en ${year}`,
                    data: counts
                }
            ]
        }
    })

    // DASHBOARD - USUARIOS POR ROL
    app.get('/dashboard/usuarios-por-rol', {
        preHandler: [app.requireAuth],
        schema: {
            tags: ['Dashboard'],
            description: 'Cantidad de usuarios por rol (para gráfico pie/donut)',
            security: [{ bearerAuth: [] }]
        }
    }, async () => {
        // Traemos todos los roles con conteo de usuarios
        const roles = await app.prisma.role.findMany({
            include: {
                _count: {
                    select: { users: true } // 👈 relación se llama "users" en el modelo Role
                }
            },
            orderBy: {
                createdAt: 'asc'
            }
        })

        // Convertimos a formato de chart
        const data = roles
            .map(r => ({
                name: r.name,
                total: r._count.users
            }))
            .filter(r => r.total > 0) // solo roles que tengan al menos 1 usuario

        return {
            labels: data.map(r => r.name),
            datasets: [
                {
                    label: 'Usuarios por rol',
                    data: data.map(r => r.total)
                }
            ]
        }
    })
}  