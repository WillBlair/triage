import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

// ── Supabase client (server-side) ──
// Uses the same env vars as the frontend client.
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

// In-memory fallback for local dev without Supabase table
const localTokens = new Map()

function generateToken() {
  return crypto.randomBytes(24).toString('base64url')
}

/** True when we have a working Supabase connection AND the table exists. */
let useSupabase = !!supabase

async function dbInsert(record) {
  if (!useSupabase) {
    localTokens.set(record.token, record)
    return
  }
  try {
    const { error } = await supabase.from('intake_tokens').insert({
      token: record.token,
      patient: record.patient,
      sections: record.sections,
      message: record.message,
      created_at: record.createdAt,
      expires_at: record.expiresAt,
      revoked: record.revoked,
      submission: record.submission,
    })
    if (error) {
      // Table might not exist yet – fall back silently
      console.warn('Supabase insert failed, falling back to memory:', error.message)
      useSupabase = false
      localTokens.set(record.token, record)
    }
  } catch {
    useSupabase = false
    localTokens.set(record.token, record)
  }
}

async function dbFind(token) {
  if (!useSupabase) return localTokens.get(token) ?? null
  try {
    const { data, error } = await supabase
      .from('intake_tokens')
      .select('*')
      .eq('token', token)
      .single()
    if (error || !data) return null
    // Normalize column names to camelCase for the rest of the code
    return {
      token: data.token,
      patient: data.patient,
      sections: data.sections,
      message: data.message,
      createdAt: data.created_at,
      expiresAt: data.expires_at,
      revoked: data.revoked,
      submission: data.submission,
    }
  } catch {
    return null
  }
}

async function dbUpdate(token, fields) {
  if (!useSupabase) {
    const record = localTokens.get(token)
    if (record) Object.assign(record, fields)
    return
  }
  // Convert camelCase fields to snake_case for Supabase
  const mapped = {}
  if ('revoked' in fields) mapped.revoked = fields.revoked
  if ('submission' in fields) mapped.submission = fields.submission
  await supabase.from('intake_tokens').update(mapped).eq('token', token)
}

export function createIntakeRoutes(router) {
  // Doctor creates an intake link
  router.post('/api/intake-tokens', async (req, res) => {
    const { patient, sections, expiresInHours = 48, message } = req.body ?? {}

    if (!patient?.name?.trim()) {
      return res.status(400).json({ error: 'Patient name is required.' })
    }
    if (!String(patient.dob ?? '').trim()) {
      return res.status(400).json({ error: 'Date of birth is required.' })
    }
    if (!String(patient.sex ?? '').trim()) {
      return res.status(400).json({ error: 'Sex is required.' })
    }
    if (!String(patient.mrn ?? '').trim()) {
      return res.status(400).json({ error: 'MRN or identifier is required.' })
    }

    const token = generateToken()
    const record = {
      token,
      patient,
      sections: sections ?? {},
      message: message ?? '',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + expiresInHours * 3600_000).toISOString(),
      revoked: false,
      submission: null,
    }

    await dbInsert(record)
    res.status(201).json(record)
  })

  // Patient validates token and gets config
  router.get('/api/intake/:token', async (req, res) => {
    const record = await dbFind(req.params.token)

    if (!record) {
      return res.status(404).json({ error: 'Link not found or expired.' })
    }
    if (record.revoked) {
      return res.status(410).json({ error: 'This intake link has been revoked.' })
    }
    if (new Date(record.expiresAt) < new Date()) {
      return res.status(410).json({ error: 'This intake link has expired.' })
    }
    if (record.submission) {
      return res.status(410).json({ error: 'This intake has already been submitted.' })
    }

    res.json({
      patient: { name: record.patient.name },
      sections: record.sections,
      message: record.message,
      expiresAt: record.expiresAt,
    })
  })

  // Patient submits intake
  router.post('/api/intake/:token/submit', async (req, res) => {
    const record = await dbFind(req.params.token)

    if (!record) {
      return res.status(404).json({ error: 'Link not found.' })
    }
    if (record.revoked || new Date(record.expiresAt) < new Date()) {
      return res.status(410).json({ error: 'This intake link is no longer valid.' })
    }
    if (record.submission) {
      return res.status(409).json({ error: 'Already submitted.' })
    }

    const submission = {
      data: req.body,
      submittedAt: new Date().toISOString(),
    }

    await dbUpdate(req.params.token, { submission })

    res.json({ ok: true, submittedAt: submission.submittedAt })
  })

  // Doctor checks intake status
  router.get('/api/intake-tokens/:token/status', async (req, res) => {
    const record = await dbFind(req.params.token)

    if (!record) {
      return res.status(404).json({ error: 'Token not found.' })
    }

    res.json({
      token: record.token,
      patient: record.patient,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      revoked: record.revoked,
      submission: record.submission
        ? { submittedAt: record.submission.submittedAt, data: record.submission.data }
        : null,
    })
  })

  // Doctor revokes an intake link
  router.delete('/api/intake-tokens/:token', async (req, res) => {
    const record = await dbFind(req.params.token)

    if (!record) {
      return res.status(404).json({ error: 'Token not found.' })
    }

    await dbUpdate(req.params.token, { revoked: true })
    res.json({ ok: true })
  })

  return router
}
