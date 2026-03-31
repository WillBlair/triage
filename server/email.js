import { Resend } from 'resend'

/** Escapes HTML special chars to prevent XSS in email templates. */
function escapeHtml(str) {
  if (typeof str !== 'string') return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

/** Returns true only for http/https URLs — blocks javascript: and data: URIs. */
function isSafeUrl(url) {
  try {
    const { protocol } = new URL(url)
    return protocol === 'https:' || protocol === 'http:'
  } catch {
    return false
  }
}

export function createEmailRoutes(router) {
  router.post('/api/send-intake-email', async (req, res) => {
    const apiKey = process.env.RESEND_API_KEY?.trim() || ''
    if (!apiKey) {
      return res.status(500).json({ error: 'RESEND_API_KEY is not configured on the server.' })
    }

    const { patientEmail, patientName, doctorName, doctorEmail, intakeUrl, message } = req.body ?? {}

    if (!patientEmail?.trim()) {
      return res.status(400).json({ error: 'Patient email is required.' })
    }
    if (!intakeUrl?.trim()) {
      return res.status(400).json({ error: 'Intake link URL is required.' })
    }
    if (!isSafeUrl(intakeUrl)) {
      return res.status(400).json({ error: 'Invalid intake link URL.' })
    }

    const resend = new Resend(apiKey)

    // Resend free tier requires sending from onboarding@resend.dev
    // With a verified custom domain you can use the doctor's real email.
    const fromAddress = 'Triage <onboarding@resend.dev>'
    const replyTo = doctorEmail || undefined

    // Escape all user-supplied values before interpolating into HTML
    const safeName      = escapeHtml(patientName)
    const safeDoctor    = escapeHtml(doctorName)
    const safeMessage   = escapeHtml(message)
    const safeDoctorId  = escapeHtml(doctorName || doctorEmail)

    try {
      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: [patientEmail.trim()],
        replyTo,
        subject: `${safeDoctor || 'Your doctor'} sent you a patient intake form`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px;">
            <p style="font-size: 13px; color: #0d9488; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; margin: 0;">Triage</p>
            <h1 style="font-size: 22px; color: #0f172a; margin: 16px 0 8px;">Patient intake form</h1>
            <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 16px;">
              Hi${safeName ? ` ${safeName}` : ''},
            </p>
            ${safeMessage ? `<p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 16px;">${safeMessage}</p>` : ''}
            <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 24px;">
              ${safeDoctor || 'Your doctor'} has requested that you complete a brief intake form before your appointment. Please click the button below to get started.
            </p>
            <a href="${intakeUrl}" style="display: inline-block; background: #0d9488; color: #fff; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 10px; text-decoration: none;">
              Complete intake form
            </a>
            <p style="font-size: 13px; color: #94a3b8; margin-top: 24px; line-height: 1.5;">
              This link is secure and will expire. If you did not expect this email, you can safely ignore it.
            </p>
            ${doctorEmail ? `<p style="font-size: 13px; color: #94a3b8; margin-top: 8px;">Sent on behalf of ${safeDoctorId}</p>` : ''}
          </div>
        `,
      })

      if (error) {
        console.error('Resend error:', error)
        return res.status(502).json({ error: error.message || 'Failed to send email.' })
      }

      res.json({ ok: true, emailId: data?.id })
    } catch (err) {
      console.error('Email send error:', err)
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to send email.' })
    }
  })

  return router
}
