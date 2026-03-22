import cors from 'cors'
import express from 'express'
import multer from 'multer'
import { createIntakeRoutes } from './intake.js'

const upload = multer({ storage: multer.memoryStorage() })

export function createApp({ aiService }) {
  const app = express()

  app.use(cors())
  app.use(express.json())

  createIntakeRoutes(app)

  app.get('/api/health', (_request, response) => {
    response.json({ ok: true })
  })

  app.post('/api/parse-document', upload.single('document'), async (request, response, next) => {
    try {
      if (!request.file?.buffer) {
        response.status(400).json({ error: 'PDF document is required.' })
        return
      }

      const profile = await aiService.parseDocument(request.file.buffer)
      response.json({ profile })
    } catch (error) {
      next(error)
    }
  })

  app.post('/api/recommend', async (request, response, next) => {
    try {
      const { profile } = request.body ?? {}

      if (!profile) {
        response.status(400).json({ error: 'Parsed profile is required.' })
        return
      }

      const recommendations = await aiService.createRecommendations(profile)
      response.json({ recommendations })
    } catch (error) {
      next(error)
    }
  })

  app.post('/api/simulate', async (request, response, next) => {
    try {
      const { profile, recommendation } = request.body ?? {}

      if (!profile || !recommendation) {
        response.status(400).json({ error: 'Profile and recommendation are required.' })
        return
      }

      response.setHeader('Content-Type', 'application/x-ndjson')
      response.setHeader('Cache-Control', 'no-cache')
      response.setHeader('Connection', 'keep-alive')

      for await (const event of aiService.streamSimulation({ profile, recommendation })) {
        response.write(`${JSON.stringify(event)}\n`)
      }

      response.end()
    } catch (error) {
      next(error)
    }
  })

  app.post('/api/summarize-checkin', async (request, response, next) => {
    try {
      const { symptoms, freeText, medicationName } = request.body ?? {}
      const summary = await aiService.summarizeCheckin({ symptoms, freeText, medicationName })
      response.json({ summary })
    } catch (error) {
      next(error)
    }
  })

  app.use((error, _request, response, _next) => {
    response.status(500).json({
      error: error instanceof Error ? error.message : 'Unexpected server error.',
    })
  })

  return app
}
