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
    res.status(500).json({
      error: 'Serverless initialization failed: ' + error.message,
      stack: error.stack
    })
  }
}
