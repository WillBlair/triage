import 'dotenv/config'
import { createApp } from './app.js'
import { createAiService } from './recommendations.js'

const port = Number(process.env.PORT || 8787)
const host = process.env.HOST || '0.0.0.0'

async function startServer() {
  let aiService
  try {
    aiService = createAiService()
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }

  const app = createApp({ aiService })

  app.listen(port, host, () => {
    console.log(`Triage API listening on http://${host}:${port}`)
  })
}

startServer().catch((error) => {
  console.error('Failed to start Triage API', error)
  process.exit(1)
})
