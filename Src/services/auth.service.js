// src/services/auth.service.js
import bcrypt from 'bcrypt'
import { getUserRoles, getUserPermissions } from '../utils/rbac.js'

function parseExpiresToSeconds (exp) {
  if (!exp) return 3600
  if (typeof exp === 'number') return exp
  if (typeof exp === 'string') {
    const m = exp.match(/^(\d+)([smhd])$/i)
    if (!m) return 3600
    const value = parseInt(m[1], 10)
    const unit = m[2].toLowerCase()
    switch (unit) {
      case 's': return value
      case 'm': return value * 60
      case 'h': return value * 60 * 60
      case 'd': return value * 24 * 60 * 60
      default:  return 3600
    }
  }
  return 3600
}

// 🔐 Access token
async function signAccessJwt (app, user, roles) {
  return app.jwt.sign({
    sub: user.id,
    email: user.email,
    roles: roles.map(r => r.name),
    type: 'access'
  })
}

// 🔁 Refresh token
async function signRefreshJwt (app, user) {
  const refreshExp = process.env.JWT_REFRESH_EXPIRES || '15m'
  return app.jwt.sign(
    { sub: user.id, type: 'refresh' },
    { expiresIn: refreshExp }
  )
}

export async function login (app, { email, password }) {
  const emailLower = String(email).toLowerCase().trim()
  const user = await app.prisma.user.findUnique({ where: { email: emailLower } })

  if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
    throw app.httpErrors.unauthorized('Credenciales inválidas')
  }

  const roles = await getUserRoles(app.prisma, user.id)
  const permissions = await getUserPermissions(app.prisma, user.id)

  const token = await signAccessJwt(app, user, roles)

  const accessExp  = process.env.JWT_ACCESS_EXPIRES  || '15m'
  const refreshExp = process.env.JWT_REFRESH_EXPIRES || '15m'

  const refreshToken = await signRefreshJwt(app, user)

  return {
    token,
    expiresIn: accessExp,                        // sigues usando '15m'
    user: {
      id: user.id,
      email: user.email,
      username: user.username ?? null,
      name: user.name ?? null
    },
    roles,
    permissions,
    refreshToken,
    refreshMaxAge: parseExpiresToSeconds(refreshExp)
  }
}

export async function register (app, { email, password }) {
  const emailLower = String(email).toLowerCase().trim()
  const exists = await app.prisma.user.findUnique({ where: { email: emailLower } })
  if (exists) throw app.httpErrors.badRequest('Email ya existe')

  const hash = await bcrypt.hash(password, 10)

  const result = await app.prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: emailLower,
        username: emailLower,
        password: hash,
        isActive: true,
        name: emailLower.split('@')[0]
      }
    })
    const viewer = await tx.role.findUnique({ where: { name: 'viewer' } })
    if (viewer) {
      await tx.userRole.create({ data: { userId: user.id, roleId: viewer.id } })
    }
    return user
  })

  const roles = await getUserRoles(app.prisma, result.id)
  const permissions = await getUserPermissions(app.prisma, result.id)
  const token = await signAccessJwt(app, result, roles)

  return {
    token,
    user: {
      id: result.id,
      email: result.email,
      username: result.username ?? null,
      name: result.name ?? null
    },
    roles,
    permissions
  }
}

// 🔁 REFRESH SERVICE – ahora recibe el token por parámetro, NO por cookies
export async function refresh (app, refreshToken) {
  if (!refreshToken) {
    throw app.httpErrors.unauthorized('No hay refresh token')
  }

  let payload
  try {
    payload = app.jwt.verify(refreshToken, {
      maxAge: process.env.JWT_REFRESH_EXPIRES || '15m'
    })
  } catch (err) {
    throw app.httpErrors.unauthorized('No se pudo refrescar el token')
  }

  if (payload.type !== 'refresh') {
    throw app.httpErrors.unauthorized('Token inválido')
  }

  const userId = payload.sub

  const user = await app.prisma.user.findUnique({
    where: { id: userId }
  })

  if (!user || !user.isActive) {
    throw app.httpErrors.unauthorized('Usuario inválido')
  }

  const roles = await getUserRoles(app.prisma, user.id)
  const permissions = await getUserPermissions(app.prisma, user.id)

  const token = await signAccessJwt(app, user, roles)
  const accessExp = process.env.JWT_ACCESS_EXPIRES || '15m'

  return {
    token,
    expiresIn: accessExp,
    user: {
      id: user.id,
      email: user.email,
      username: user.username ?? null,
      name: user.name ?? null
    },
    roles,
    permissions
  }
}