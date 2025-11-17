// src/controllers/user.controller.js
import {
    listUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser
} from '../services/users.service.js'

export function makeUserController(app) {
    const prisma = app.prisma

    return {
        list: async (req, reply) => {
            const users = await listUsers(prisma)
            return users
        },

        get: async (req, reply) => {
            const { id } = req.params
            const user = await getUser(prisma, id)
            if (!user) {
                return reply.notFound('Usuario no encontrado')
            }
            return user
        },

        create: async (req, reply) => {
            const { email, password } = req.body || {}
            if (!email || !password) {
                return reply.badRequest('email y password son requeridos')
            }

            const user = await createUser(prisma, req.body)
            reply.code(201)
            return user
        },

        update: async (req, reply) => {
            const { id } = req.params
            const user = await updateUser(prisma, id, req.body || {})
            return user
        },

        remove: async (req, reply) => {
            const { id } = req.params
            await deleteUser(prisma, id)
            return { ok: true }
        }
    }
}
