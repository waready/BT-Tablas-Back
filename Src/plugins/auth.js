// src/plugins/auth.js
import fp from 'fastify-plugin'

export default fp(async (app) => {
    app.register(import('@fastify/jwt'), {
        secret: process.env.JWT_SECRET,
        sign: {
            // ⏱️ tiempo de vida del token (p.ej. 15 minutos)
            expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
        },
        verify: {
            // ✅ forza que el verify falle cuando el token ya venció
            maxAge: process.env.JWT_ACCESS_EXPIRES || '15m',
        },
    })

    app.decorate('auth', async (req, reply) => {
        try {
            await req.jwtVerify()           // si expiró -> 401
            // opcional: guardar el userId para Auditoría
            app.lastReqUserId = req.user?.sub ?? null
        } catch {
            return reply.unauthorized()
        }
    })
})
