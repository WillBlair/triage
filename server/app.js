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

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

// ── Simple in-memory rate limiter (no extra dependency needed) ──
// Resets the counter for each IP every windowMs milliseconds.
function createRateLimiter({ windowMs, max }) {
  const counts = new Map()
  setInterval(() => counts.clear(), windowMs).unref()
  return (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown'
    const count = (counts.get(ip) ?? 0) + 1
    counts.set(ip, count)
    if (count > max) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' })
    }
    next()
  }
}

// 20 AI requests per 60 s per IP — limits Claude API cost amplification
const aiRateLimit = createRateLimiter({ windowMs: 60_000, max: 20 })

// ── JWT auth middleware ──
// Reads Authorization: Bearer <token>, verifies it with Supabase, and attaches
// req.user and req.supabaseClient (user-scoped so RLS is enforced automatically).
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' })
  }
  if (!supabaseUrl || !supabaseKey) {
    return res.status(503).json({ error: 'Database not configured.' })
  }
  const token = authHeader.slice(7)
  const userClient = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: { user }, error } = await userClient.auth.getUser()
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token.' })
  }
  req.user = user
  req.supabaseClient = userClient
  next()
}

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
  app.post('/api/prescriptions', requireAuth, async (request, response, next) => {
    try {
      const { patientProfile, selectedDrug, allRecommendations, simulation } = request.body ?? {}

      if (!patientProfile || !selectedDrug) {
        return response.status(400).json({ error: 'Patient profile and selected drug are required.' })
      }

      // doctor_id is sourced from the verified JWT, not the request body
      const { data, error } = await request.supabaseClient.from('prescriptions').insert({
        doctor_id: request.user.id,
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

  // ── List prescriptions for authenticated doctor ──
  app.get('/api/prescriptions', requireAuth, async (request, response, next) => {
    try {
      // doctor_id filter is enforced server-side from verified JWT — no query param accepted
      const { data, error } = await request.supabaseClient
        .from('prescriptions')
        .select('id, doctor_id, patient_name, selected_drug, created_at')
        .eq('doctor_id', request.user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Supabase prescriptions list error:', error)
        return response.status(500).json({ error: 'Failed to retrieve prescriptions.' })
      }

      response.json({ prescriptions: data })
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/health', (_request, response) => {
    response.json({ ok: true })
  })

  app.post('/api/parse-document', aiRateLimit, upload.single('document'), async (request, response, next) => {
    try {
      if (!request.file?.buffer) {
        return response.status(400).json({ error: 'PDF document is required.' })
      }

      // Reject non-PDFs by checking the %PDF magic bytes
      if (
        request.file.buffer.length < 4 ||
        request.file.buffer.slice(0, 4).toString('ascii') !== '%PDF'
      ) {
        return response.status(400).json({ error: 'Uploaded file must be a valid PDF.' })
      }

      const profile = await aiService.parseDocument(request.file.buffer)
      response.json({ profile })
    } catch (error) {
      next(error)
    }
  })

  app.post('/api/recommend', aiRateLimit, async (request, response, next) => {
    try {
      const { profile } = request.body ?? {}

      if (!profile) {
        return response.status(400).json({ error: 'Parsed profile is required.' })
      }

      const recommendations = await aiService.createRecommendations(profile)
      response.json({ recommendations })
    } catch (error) {
      next(error)
    }
  })

  app.post('/api/simulate', aiRateLimit, async (request, response, next) => {
    try {
      const { profile, recommendation } = request.body ?? {}

      if (!profile || !recommendation) {
        return response.status(400).json({ error: 'Profile and recommendation are required.' })
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

  app.post('/api/summarize-checkin', aiRateLimit, async (request, response, next) => {
    try {
      const { symptoms, freeText, medicationName } = request.body ?? {}
      const summary = await aiService.summarizeCheckin({ symptoms, freeText, medicationName })
      response.json({ summary })
    } catch (error) {
      next(error)
    }
  })

  // Generic error handler — no stack traces sent to clients
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
