// src/controllers/auth.controller.js
import * as AuthService from '../services/auth.service.js'

export async function login (app, req, reply) {
  const { email, password } = req.body

  const result = await AuthService.login(app, { email, password })
  // result: { token, expiresIn, user, roles, permissions, refreshToken, refreshMaxAge }

  // Log opcional
  app.log.info({ userId: result.user?.id }, 'Login OK (con refreshToken)')

  // 👇 YA NO USAMOS COOKIES PARA REFRESH
  // reply.setCookie('refresh_token', result.refreshToken, { ... })

  // Enviamos TODO al front, incluido refreshToken
  return reply.send(result)
}

export async function register (app, req, reply) {
  const { email, password } = req.body
  const result = await AuthService.register(app, { email, password })
  return reply.code(201).send(result)
}

export async function refresh (app, req, reply) {
  // AHORA el refreshToken viene en el BODY, no en cookies
  const { refreshToken } = req.body || {}

  // DEBUG: ver qué llega del front
  app.log.info({ body: req.body }, 'Petición refresh')

  const result = await AuthService.refresh(app, refreshToken)

  return reply.send({
    access_token: result.token,
    token_type: 'bearer',
    expires_in: result.expiresIn
  })
}
