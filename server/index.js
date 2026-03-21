import 'dotenv/config'
import { createApp } from './app.js'
import { createAiService } from './recommendations.js'

const port = Number(process.env.PORT || 8787)
const host = process.env.HOST || '0.0.0.0'

async function startServer() {
  const aiService = createAiService()
  const app = createApp({ aiService })

  app.listen(port, host, () => {
    console.log(`Triage API listening on http://${host}:${port}`)
  })
}

startServer().catch((error) => {
  console.error('Failed to start Triage API', error)
  process.exit(1)
})
