import fp from 'fastify-plugin'
import OpenAI from 'openai'
import dbSchemaPrompt from '../utils/dbSchemaPrompt.js'

async function openaiPlugin (fastify) {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  })

  fastify.decorate('openai', client)
  fastify.decorate('dbSchemaPrompt', dbSchemaPrompt)
}

export default fp(openaiPlugin)
