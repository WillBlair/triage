import cors from 'cors'
import express from 'express'
import multer from 'multer'
import { createClient } from '@supabase/supabase-js'
import { createIntakeRoutes } from './intake.js'
import { createEmailRoutes } from './email.js'

const MAX_PDF_BYTES = 15 * 1024 * 1024

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PDF_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const mimeOk = file.mimetype === 'application/pdf'
    const nameOk = file.originalname?.toLowerCase().endsWith('.pdf')
    if (mimeOk || nameOk) {
      cb(null, true)
    } else {
      cb(new Error('Only PDF uploads are allowed.'))
    }
  },
})

function corsMiddleware() {
  const allowed = process.env.ALLOWED_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean) ?? []
  return cors({
    origin(origin, callback) {
      if (allowed.length === 0) {
        callback(null, true)
        return
      }
      if (!origin) {
        callback(null, true)
        return
      }
      if (allowed.includes(origin)) {
        callback(null, true)
        return
      }
      callback(null, false)
    },
  })
}

const isProduction = process.env.NODE_ENV === 'production'

// Server-side Supabase client for prescription persistence
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

export function createApp({ aiService }) {
  const app = express()

  app.disable('x-powered-by')
  app.use(corsMiddleware())
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    next()
  })
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
        patient_email: patientProfile.email || null,
        medication_name: selectedDrug.name || selectedDrug.medication || null,
        patient_profile: patientProfile,
        selected_drug: selectedDrug,
        all_recommendations: allRecommendations || null,
        simulation: simulation || null,
        prescribed_at: new Date().toISOString(),
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
      if (error) {
        console.error('Supabase prescriptions list error:', error)
        return response.status(500).json({ error: 'Failed to list prescriptions.' })
      }

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
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return response.status(413).json({ error: 'PDF must be 15 MB or smaller.' })
      }
      return response.status(400).json({ error: 'Upload could not be processed.' })
    }

    if (error instanceof Error && error.message === 'Only PDF uploads are allowed.') {
      return response.status(400).json({ error: error.message })
    }

    const status = typeof error?.status === 'number' ? error.status : 500
    let message = 'Unexpected server error.'
    if (error instanceof Error) {
      if (status < 500) {
        message = error.message
      } else if (!isProduction) {
        message = error.message
      }
    }

    response.status(status).json({ error: message })
  })

  return app
}
