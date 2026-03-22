import cors from 'cors'
import express from 'express'
import multer from 'multer'
import { createClient } from '@supabase/supabase-js'
import { createIntakeRoutes } from './intake.js'
import { sendTelegramMessage, setTelegramWebhook } from './telegram.js'

const upload = multer({ storage: multer.memoryStorage() })

// Server-side Supabase client for prescription persistence
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

export function createApp({ aiService }) {
  const app = express()

  app.use(cors())
  createIntakeRoutes(app)

  // ── Telegram Webhook ──
  app.post('/api/telegram-webhook', async (request, response) => {
    try {
      const { message } = request.body || {}
      if (!message || !message.text) return response.json({ ok: true })

      const chatId = message.chat.id
      const text = message.text
      const username = message.from?.username ? `@${message.from.username}` : null

      if (supabase && username) {
        // For the hackathon demo: save their username so the doctor can just type it in the UI and the bot can find their chat ID.
        // We can just upsert this into a simple table or even the doctor_profiles table if we want, 
        // but let's assume we have a way to store it. Actually, the easiest hack for now is to use 
        // the `intake_tokens` table if they have one, OR just tell the user to make a simple `telegram_users` table.
        // Let's upsert to a `telegram_users` table.
        await supabase.from('telegram_users').upsert({
          username: username.toLowerCase(),
          chat_id: chatId.toString()
        }, { onConflict: 'username' })
      }

      // Handle the /start link that patient clicks
      if (text.startsWith('/start ')) {
        const token = text.split(' ')[1]

        if (supabase) {
          // Link this Telegram chat ID to the intake token
          const { error } = await supabase
            .from('intake_tokens')
            .update({ telegram_chat_id: chatId.toString() })
            .eq('token', token)

          if (!error) {
            await sendTelegramMessage(
              chatId,
              `👋 Welcome! Dr. Blair has requested some health information before your visit.\n\n📋 <a href="https://triageplus.vercel.app/intake/${token}">Fill out your intake form here</a>\n\nThis takes about 3-5 minutes.`
            )
            return response.json({ ok: true })
          } else {
            console.error('Webhook Supabase error:', error)
          }
        }
      }

      // Default reply for any other messages right now
      response.json({ ok: true })
    } catch (error) {
      console.error('Telegram webhook error:', error)
      response.status(500).json({ error: error.message })
    }
  })

  // ── Telegram Webhook Setup ──
  app.get('/api/telegram-setup', async (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol
    const host = req.headers['x-forwarded-host'] || req.get('host')
    const url = `${protocol}://${host}/api/telegram-webhook`
    
    try {
      const result = await setTelegramWebhook(url)
      res.json({ success: true, url, result })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // ── Weekly Follow-Up Cron ──
  app.get('/api/cron/weekly-followup', async (request, response) => {
    // Vercel Cron sends a Bearer token (if configured)
    const authHeader = request.headers.authorization
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return response.status(401).json({ error: 'Unauthorized' })
    }

    try {
      if (!supabase) return response.status(503).json({ error: 'Database not configured.' })

      // Fetch recent prescriptions
      const { data: prescriptions, error: rxError } = await supabase
        .from('prescriptions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      
      if (rxError) throw rxError

      // Fetch intake tokens to get telegram_chat_ids
      const { data: intakeTokens, error: tokenError } = await supabase
        .from('intake_tokens')
        .select('patient, telegram_chat_id')
        .not('telegram_chat_id', 'is', null)

      if (tokenError) throw tokenError

      let messagesSent = 0
      for (const rx of prescriptions) {
        // Match the prescription to the patient's Telegram ID via name
        const match = intakeTokens?.find(t => t.patient?.name === rx.patient_name)
        if (!match || !match.telegram_chat_id) continue

        // Send check-in message
        const drugName = rx.selected_drug?.name || 'medication'
        const firstName = rx.patient_name.split(' ')[0]
        
        // In a full production app, you would pass `rx.simulation` to Claude to generate
        // a highly specific, side-effect-aware follow-up question.
        const msg = `👋 Hi ${firstName}, it's your weekly check-in for your ${drugName} prescription.\n\nHow are you feeling this week? Any side effects or unexpected symptoms? Just reply here and Dr. Blair's team will review it.`

        await sendTelegramMessage(match.telegram_chat_id, msg)
        messagesSent++
      }

      response.json({ success: true, messagesSent })
    } catch (error) {
      console.error('Follow-up cron error:', error)
      response.status(500).json({ error: error.message })
    }
  })

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
        patient_name: patientProfile.name || 'Unknown',
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
