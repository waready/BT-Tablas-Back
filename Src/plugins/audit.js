export async function audit(prisma, { userId, action, entity, entityId, metadata, ip }) {
    await prisma.auditLog.create({ data: { userId, action, entity, entityId, metadata, ip } })
}