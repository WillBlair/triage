import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { createApp } from './app.js'

describe('createApp', () => {
  it('returns health metadata', async () => {
    const app = createApp({
      aiService: {
        isDemoMode: false,
        parseDocument: vi.fn(),
        createRecommendations: vi.fn(),
        streamSimulation: vi.fn(),
      },
    })

    const response = await request(app).get('/api/health')

    expect(response.status).toBe(200)
    expect(response.body.ok).toBe(true)
    expect(response.body.demoMode).toBe(false)
  })

  it('rejects parse requests without an uploaded document', async () => {
    const app = createApp({
      aiService: {
        isDemoMode: false,
        parseDocument: vi.fn(),
        createRecommendations: vi.fn(),
        streamSimulation: vi.fn(),
      },
    })

    const response = await request(app).post('/api/parse-document')

    expect(response.status).toBe(400)
    expect(response.body.error).toMatch(/document/i)
  })

  it('parses an uploaded pdf into a profile card', async () => {
    const profile = { patientName: 'Margaret Chen' }
    const aiService = {
      isDemoMode: false,
      parseDocument: vi.fn().mockResolvedValue(profile),
      createRecommendations: vi.fn(),
      streamSimulation: vi.fn(),
    }

    const app = createApp({
      aiService,
    })

    const response = await request(app)
      .post('/api/parse-document')
      .attach('document', Buffer.from('fake pdf'), 'chart.pdf')

    expect(response.status).toBe(200)
    expect(aiService.parseDocument).toHaveBeenCalledTimes(1)
    expect(response.body.profile).toEqual(profile)
  })

  it('returns recommendations for a parsed profile', async () => {
    const recommendations = { drugs: [{ name: 'Amlodipine 5 mg daily' }] }
    const app = createApp({
      aiService: {
        isDemoMode: false,
        parseDocument: vi.fn(),
        createRecommendations: vi.fn().mockResolvedValue(recommendations),
        streamSimulation: vi.fn(),
      },
    })

    const response = await request(app).post('/api/recommend').send({
      profile: { patientName: 'Margaret Chen' },
    })

    expect(response.status).toBe(200)
    expect(response.body.recommendations).toEqual(recommendations)
  })

  it('streams simulation events', async () => {
    async function* simulationEvents() {
      yield { type: 'thinking', chunk: 'Analyzing baseline blood pressure...' }
      yield { type: 'result', simulation: { summary: 'Projected improvement' } }
    }

    const app = createApp({
      aiService: {
        isDemoMode: false,
        parseDocument: vi.fn(),
        createRecommendations: vi.fn(),
        streamSimulation: vi.fn().mockReturnValue(simulationEvents()),
      },
    })

    const response = await request(app)
      .post('/api/simulate')
      .send({
        profile: { patientName: 'Margaret Chen' },
        recommendation: { name: 'Amlodipine 5 mg daily' },
      })
      .buffer(true)
      .parse((res, callback) => {
        let text = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => {
          text += chunk
        })
        res.on('end', () => callback(null, text))
      })

    expect(response.status).toBe(200)
    expect(response.body).toContain('"type":"thinking"')
    expect(response.body).toContain('"type":"result"')
  })
})
