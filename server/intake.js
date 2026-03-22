import crypto from 'node:crypto'

// In-memory store for prototype. Replace with Supabase table in production.
const tokens = new Map()

function generateToken() {
  return crypto.randomBytes(24).toString('base64url')
}

export function createIntakeRoutes(router) {
  // Doctor creates an intake link
  router.post('/api/intake-tokens', (req, res) => {
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

    tokens.set(token, record)
    res.status(201).json(record)
  })

  // Patient validates token and gets config
  router.get('/api/intake/:token', (req, res) => {
    const record = tokens.get(req.params.token)

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
  router.post('/api/intake/:token/submit', (req, res) => {
    const record = tokens.get(req.params.token)

    if (!record) {
      return res.status(404).json({ error: 'Link not found.' })
    }
    if (record.revoked || new Date(record.expiresAt) < new Date()) {
      return res.status(410).json({ error: 'This intake link is no longer valid.' })
    }
    if (record.submission) {
      return res.status(409).json({ error: 'Already submitted.' })
    }

    record.submission = {
      data: req.body,
      submittedAt: new Date().toISOString(),
    }

    res.json({ ok: true, submittedAt: record.submission.submittedAt })
  })

  // Doctor checks intake status
  router.get('/api/intake-tokens/:token/status', (req, res) => {
    const record = tokens.get(req.params.token)

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
  router.delete('/api/intake-tokens/:token', (req, res) => {
    const record = tokens.get(req.params.token)

    if (!record) {
      return res.status(404).json({ error: 'Token not found.' })
    }

    record.revoked = true
    res.json({ ok: true })
  })

  return router
}
