// src/services/assistant.service.js

const CHAT_HISTORY_LIMIT = 15
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini'

/**
 * Helpers internos
 */

async function getOrCreateSession(app, { userId, sessionId }) {
  if (sessionId) {
    const existing = await app.prisma.chatSession.findFirst({
      where: { id: Number(sessionId), userId }
    })
    if (existing) return existing
  }

  return app.prisma.chatSession.create({
    data: {
      userId,
      title: 'Asistente BT-Tablas'
    }
  })
}

async function getLastMessages(app, sessionId, limit = CHAT_HISTORY_LIMIT) {
  return app.prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
    take: limit
  })
}

async function saveMessage(app, { sessionId, role, content }) {
  return app.prisma.chatMessage.create({
    data: {
      sessionId,
      role,     // 'user' | 'assistant' | 'system'
      content
    }
  })
}

/**
 * Genera una consulta SQL de solo lectura (SELECT) para responder una pregunta.
 * No ejecuta nada, solo devuelve el SQL validado.
 */
async function buildReadOnlySql(app, { question, userId }) {
  const messages = [
    {
      role: 'system',
      content:
        app.dbSchemaPrompt +
        '\n\nGenera SOLO una consulta SQL de lectura (SELECT) para responder la pregunta. ' +
        'Devuelve únicamente la consulta dentro de ```sql``` sin explicación adicional.'
    },
    {
      role: 'system',
      content: `El usuario autenticado es id=${userId}. No generes consultas de escritura ni de administración.`
    },
    {
      role: 'user',
      content: question
    }
  ]

  let content = ''
  try {
    const completion = await app.openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages
    })
    content = completion.choices?.[0]?.message?.content || ''
  } catch (e) {
    app.log.error({ err: e }, 'Error llamando a OpenAI (buildReadOnlySql)')
    throw app.httpErrors.internalServerError('Error al generar la consulta SQL')
  }

  const match = content.match(/```sql([\s\S]*?)```/i)
  const sql = (match ? match[1] : content).trim()

  if (!/^select\s/i.test(sql)) {
    throw app.httpErrors.badRequest('La consulta generada no es un SELECT')
  }

  if (/(insert|update|delete|drop|alter|truncate)\s/i.test(sql)) {
    throw app.httpErrors.badRequest('La consulta generada contiene operaciones no permitidas')
  }

  return sql
}

/**
 * Pide al modelo que explique resultados de una consulta SQL sobre BT-Tablas.
 */
async function explainResults(app, { question, sql, rows }) {
  const messages = [
    {
      role: 'system',
      content:
        'Eres un analista de datos experto en BT-Tablas. Explica en español claro y profesional ' +
        'qué significan estos resultados, resaltando los puntos clave para negocio.'
    },
    {
      role: 'user',
      content:
        `Pregunta del usuario: ${question}\n\n` +
        `Consulta SQL ejecutada:\n${sql}\n\n` +
        `Primeras filas devueltas (JSON):\n${JSON.stringify(rows, null, 2)}`
    }
  ]

  try {
    const completion = await app.openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages
    })
    return completion.choices?.[0]?.message?.content || ''
  } catch (e) {
    app.log.error({ err: e }, 'Error llamando a OpenAI (explainResults)')
    throw app.httpErrors.internalServerError('Error al generar la explicación de resultados')
  }
}

/**
 * Chat general: explica tablas, genera SQL, etc. (no ejecuta data).
 */
export async function chat(app, { userId, sessionId, message }) {
  if (!message || !message.trim()) {
    throw app.httpErrors.badRequest('El mensaje no puede estar vacío')
  }

  const user = await app.prisma.user.findUnique({
    where: { id: userId }
  }).catch(() => null)

  const session = await getOrCreateSession(app, { userId, sessionId })
  const history = await getLastMessages(app, session.id)

  const messages = []

  // Contexto: esquema BT-Tablas
  messages.push({
    role: 'system',
    content: app.dbSchemaPrompt
  })

  // Contexto: usuario autenticado
  messages.push({
    role: 'system',
    content:
      `El usuario autenticado es id=${userId}, email=${user?.email || ''}. ` +
      'Responde SIEMPRE en español neutro, tono profesional pero claro. ' +
      'Evita mostrar datos sensibles (passwords, tokens, etc.).'
  })

  // Historial de la sesión
  for (const m of history) {
    messages.push({
      role: m.role,
      content: m.content
    })
  }

  // Mensaje actual
  messages.push({
    role: 'user',
    content: message
  })

  let answer
  try {
    const completion = await app.openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages
    })
    answer =
      completion.choices?.[0]?.message?.content ||
      'No pude generar una respuesta en este momento.'
  } catch (e) {
    app.log.error({ err: e }, 'Error llamando a OpenAI (chat)')
    throw app.httpErrors.internalServerError('Error al consultar el asistente')
  }

  // Guardar mensajes
  await saveMessage(app, {
    sessionId: session.id,
    role: 'user',
    content: message
  })

  await saveMessage(app, {
    sessionId: session.id,
    role: 'assistant',
    content: answer
  })

  return {
    sessionId: session.id,
    answer
  }
}

/**
 * Pregunta con datos reales: NL -> SQL de solo lectura -> ejecutar -> explicar.
 */
export async function askWithData(app, { userId, question }) {
  if (!question || !question.trim()) {
    throw app.httpErrors.badRequest('La pregunta no puede estar vacía')
  }

  // 1) Generar SQL
  const sql = await buildReadOnlySql(app, { question, userId })

  // 2) Ejecutar SQL con Prisma (solo lectura)
  let rows
  try {
    rows = await app.prisma.$queryRawUnsafe(sql)
  } catch (e) {
    app.log.error({ err: e, sql }, 'Error ejecutando SQL generado por asistente')
    throw app.httpErrors.badRequest('Error al ejecutar la consulta generada')
  }

  // 3) Explicar resultados
  const explanation = await explainResults(app, { question, sql, rows })

  return {
    sql,
    rows,
    explanation
  }
}
