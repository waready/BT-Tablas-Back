// src/controllers/assistant.controller.js
import * as AssistantService from '../services/assistant.service.js'

export async function chat(app, req, reply) {
  const userId = req.user.id
  const { message, sessionId } = req.body || {}

  const data = await AssistantService.chat(app, {
    userId,
    sessionId,
    message
  })

  return reply.send(data)
}

export async function askWithData(app, req, reply) {
  const userId = req.user.id
  const { question } = req.body || {}

  const data = await AssistantService.askWithData(app, {
    userId,
    question
  })

  return reply.send(data)
}
