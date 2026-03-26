export default async function handler(req, res) {
  try {
    const { createApp } = await import('../server/app.js')
    const { createAiService } = await import('../server/recommendations.js')

    const aiService = createAiService()
    const app = createApp({ aiService })
    
    // Pass the request/response to the Express app
    return app(req, res)
  } catch (error) {
    console.error('Vercel cold-start error:', error)
    const isProd = process.env.NODE_ENV === 'production'
    const message =
      isProd
        ? 'Serverless initialization failed.'
        : `Serverless initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    res.status(500).json({ error: message })
  }
}
