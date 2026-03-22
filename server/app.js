import cors from 'cors'
import express from 'express'
import multer from 'multer'
import { createClient } from '@supabase/supabase-js'
import { createIntakeRoutes } from './intake.js'
import { createEmailRoutes } from './email.js'

const upload = multer({ storage: multer.memoryStorage() })

// Server-side Supabase client for prescription persistence
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

export function createApp({ aiService }) {
  const app = express()

  app.use(cors())
  app.use(express.json({ limit: '2mb' }))
  createIntakeRoutes(app)
  createEmailRoutes(app)

  // ── Save prescription data ──
  app.post('/api/prescriptions', async (request, response, next) => {
    try {
      const { doctorId, patientProfile, selectedDrug, allRecommendations, simulation } = request.body ?? {}

      if (!patientProfile || !selectedDrug) {
        return response.status(400).json({ error: 'Patient profile and selected drug are required.' })
      }

      if (!supabase) {
        return response.status(503).json({ error: 'Database not configured.' })
      }

      const { data, error } = await supabase.from('prescriptions').insert({
        doctor_id: doctorId || null,
        patient_name: patientProfile.patientName || 'Unknown',
        patient_profile: patientProfile,
        selected_drug: selectedDrug,
        all_recommendations: allRecommendations || null,
        simulation: simulation || null,
      }).select('id').single()

      if (error) {
        console.error('Supabase prescriptions insert error:', error)
        return response.status(500).json({ error: 'Failed to save prescription.' })
      }

      response.status(201).json({ id: data.id, saved: true })
    } catch (error) {
      next(error)
    }
  })

  // ── List prescriptions for a doctor ──
  app.get('/api/prescriptions', async (request, response, next) => {
    try {
      if (!supabase) return response.status(503).json({ error: 'Database not configured.' })

      const doctorId = request.query.doctorId
      let query = supabase
        .from('prescriptions')
        .select('id, doctor_id, patient_name, selected_drug, created_at')
        .order('created_at', { ascending: false })
        .limit(50)

      if (doctorId) query = query.eq('doctor_id', doctorId)

      const { data, error } = await query
      if (error) return response.status(500).json({ error: error.message })

      response.json({ prescriptions: data })
    } catch (error) {
      next(error)
    }
  })

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

  app.use((error, _request, response, _next) => {
    response.status(500).json({
      error: error instanceof Error ? error.message : 'Unexpected server error.',
    })
  })

  return app
}
