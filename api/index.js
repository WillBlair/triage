import { createApp } from '../server/app.js'
import { createAiService } from '../server/recommendations.js'

let app
let aiService

try {
  aiService = createAiService()
  app = createApp({ aiService })
} catch (error) {
  console.error('Failed to initialize serverless function', error)
  // Fallback app if init fails, returns 500
  app = (req, res) => res.status(500).json({ error: error.message || 'Initialization error' })
}

export default app
