// src/services/user.service.js
import bcrypt from 'bcrypt'

export async function listUsers (prisma) {
  const users = await prisma.user.findMany({
    include: {
      roles: {
        include: { role: true } // UserRole -> Role
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  // Normalizamos un poco para el front
  return users.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    isActive: u.isActive,
    createdAt: u.createdAt,
    roles: (u.roles || []).map(ur => ({
      id: ur.role.id,
      name: ur.role.name
    }))
  }))
}

export async function getUser (prisma, id) {
  const u = await prisma.user.findUnique({
    where: { id },
    include: {
      roles: {
        include: { role: true }
      }
    }
  })
  if (!u) return null

  return {
    id: u.id,
    email: u.email,
    name: u.name,
    isActive: u.isActive,
    createdAt: u.createdAt,
    roles: (u.roles || []).map(ur => ({
      id: ur.role.id,
      name: ur.role.name
    }))
  }
}

export async function createUser (prisma, payload) {
  const { email, name, password, isActive = true } = payload

  const hashed = await bcrypt.hash(password, 10)

  const u = await prisma.user.create({
    data: {
      email,
      name,
      password: hashed,
      isActive
    }
  })

  return {
    id: u.id,
    email: u.email,
    name: u.name,
    isActive: u.isActive,
    createdAt: u.createdAt
  }
}

export async function updateUser (prisma, id, payload) {
  const { email, name, isActive, password } = payload

  const data = {}
  if (email !== undefined) data.email = email
  if (name !== undefined) data.name = name
  if (isActive !== undefined) data.isActive = isActive
  if (password) {
    data.password = await bcrypt.hash(password, 10)
  }

  const u = await prisma.user.update({
    where: { id },
    data
  })

  return {
    id: u.id,
    email: u.email,
    name: u.name,
    isActive: u.isActive,
    createdAt: u.createdAt
  }
}

export async function deleteUser (prisma, id) {
  await prisma.user.delete({ where: { id } })
  return { ok: true }
}
