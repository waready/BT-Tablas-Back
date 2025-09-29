// Solo lógica HTTP (lee req/res) y delega al service
import * as AuthService from '../services/auth.service.js'

export async function login(app, req, reply) {
    const { email, password } = req.body
    const result = await AuthService.login(app, { email, password })
    return reply.send(result)
}

export async function register(app, req, reply) {
    const { email, password } = req.body
    const result = await AuthService.register(app, { email, password })
    return reply.code(201).send(result)
}
