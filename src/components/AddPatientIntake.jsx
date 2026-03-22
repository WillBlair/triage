import { useCallback, useState } from 'react'
import ProfileCard from './ProfileCard'

const STEPS = [
  { id: 'basics', label: 'Basics' },
  { id: 'send-intake', label: 'Send intake' },
  { id: 'chart-merge', label: 'Chart & merge' },
]

const INTAKE_SECTION_DEFS = [
  { id: 'homeBp', label: 'Home BP readings', defaultOn: false },
  { id: 'symptoms', label: 'Symptoms checklist', defaultOn: false },
  { id: 'medsAllergies', label: 'Medications & allergies', defaultOn: false },
  { id: 'lifestyle', label: 'Lifestyle (diet, exercise, smoking)', defaultOn: false },
  { id: 'uploads', label: 'File uploads (labs, prior records)', defaultOn: false },
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const MRN_RE = /^[A-Z0-9][A-Z0-9\-.]{4,11}$/i

function isValidEmail(email) {
  return EMAIL_RE.test(email?.trim() ?? '')
}

function isValidMrn(mrn) {
  return MRN_RE.test(mrn?.trim() ?? '')
}

/** Strips non-digits and checks for exactly 10 digits (US number). Empty is valid (optional). */
function isValidPhone(phone) {
  const raw = (phone ?? '').replace(/\D/g, '')
  return raw.length === 0 || raw.length === 10
}

/** Name, DOB, sex, MRN, valid email, and valid phone (if provided) required before Continue. */
function isBasicsDraftComplete(draft) {
  return (
    Boolean(draft?.name?.trim()) &&
    Boolean(String(draft?.dob ?? '').trim()) &&
    Boolean(String(draft?.sex ?? '').trim()) &&
    isValidMrn(draft?.mrn) &&
    isValidEmail(draft?.email) &&
    isValidPhone(draft?.phone)
  )
}

/** Readable error when POST /api/intake-tokens fails (HTML 502, network, JSON error). */
function errorMessageFromResponse(res, text) {
  try {
    const j = JSON.parse(text)
    if (j?.error && typeof j.error === 'string') return j.error
  } catch {
    /* not JSON */
  }
  const lower = text.slice(0, 500).toLowerCase()
  if (lower.includes('<!doctype') || lower.includes('<html')) {
    return 'The API returned a web page instead of JSON — usually the backend is not running or /api is not proxied. Use npm run dev (starts API + Vite), or run npm run server on port 8787 with Vite proxy / preview.proxy enabled.'
  }
  if (res.status >= 502 && res.status <= 504) {
    return 'Cannot reach the API server (bad gateway). Start the backend: npm run dev or npm run server (port 8787).'
  }
  return `Failed to create intake link (HTTP ${res.status}).`
}

/* ── Shared helpers ── */

function FieldLabel({ id, children, optional }) {
  return (
    <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
      {optional ? <span className="font-normal normal-case text-slate-400"> (optional)</span> : null}
    </label>
  )
}

function StepIndicator({ steps, currentIndex }) {
  return (
    <nav className="flex items-center gap-2" aria-label="Progress">
      {steps.map((step, i) => {
        const done = i < currentIndex
        const active = i === currentIndex
        return (
          <div key={step.id} className="flex items-center gap-2">
            {i > 0 && <div className={`h-px w-6 sm:w-10 ${done ? 'bg-teal-400' : 'bg-slate-200'}`} />}
            <div className="flex items-center gap-1.5">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  done
                    ? 'bg-teal-600 text-white'
                    : active
                      ? 'border-2 border-teal-500 bg-white text-teal-700'
                      : 'bg-slate-100 text-slate-400'
                }`}
              >
                {done ? '✓' : i + 1}
              </span>
              <span
                className={`hidden text-xs font-medium sm:inline ${
                  active ? 'text-slate-900' : done ? 'text-teal-700' : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>
        )
      })}
    </nav>
  )
}

function SectionToggle({ id, label, checked, onChange }) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm transition hover:border-slate-300"
    >
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
      />
    </label>
  )
}

/* ── Step 1: Basics ── */

function StepBasics({ draft, onDraftChange }) {
  const patch = (updates) => onDraftChange((prev) => ({ ...prev, ...updates }))
  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-sm font-semibold text-slate-900">Patient identifiers</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Required identifiers for a draft profile. More detail can come from the chart or patient intake.
        </p>
        <p className="mt-2 text-xs font-medium text-slate-600">
          Patient name, date of birth, sex, MRN / identifier, and email are required to continue.
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <FieldLabel id="patient-name">Patient name</FieldLabel>
            <input
              id="patient-name"
              type="text"
              required
              placeholder="e.g. Jane Doe"
              value={draft.name || ''}
              onChange={(e) => {
                const v = e.target.value.replace(/[^a-zA-Z\s]/g, '')
                patch({ name: v })
              }}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-200"
            />
          </div>
          <div>
            <FieldLabel id="patient-dob">Date of birth</FieldLabel>
            <input
              id="patient-dob"
              type="date"
              required
              max={new Date().toISOString().split('T')[0]}
              value={draft.dob || ''}
              onChange={(e) => patch({ dob: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-200"
            />
          </div>
          <div>
            <FieldLabel id="patient-sex">Sex</FieldLabel>
            <select
              id="patient-sex"
              required
              value={draft.sex || ''}
              onChange={(e) => patch({ sex: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-200"
            >
              <option value="">Select…</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <FieldLabel id="patient-mrn">MRN / identifier</FieldLabel>
            <input
              id="patient-mrn"
              type="text"
              required
              placeholder="e.g. MRN-12345 or AB12345"
              value={draft.mrn || ''}
              onChange={(e) => patch({ mrn: e.target.value })}
              className={`mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-2 ${
                draft.mrn && !isValidMrn(draft.mrn)
                  ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-200'
                  : 'border-slate-200 focus:border-teal-400 focus:ring-teal-200'
              }`}
            />
            {draft.mrn && !isValidMrn(draft.mrn) && (
              <p className="mt-1 text-xs text-rose-500">
                {'5\u201312 characters: letters, numbers, dashes, or dots'}
              </p>
            )}
          </div>
          <div>
            <FieldLabel id="patient-email">Patient email</FieldLabel>
            <input
              id="patient-email"
              type="email"
              required
              placeholder="e.g. jane@example.com"
              value={draft.email || ''}
              onChange={(e) => patch({ email: e.target.value })}
              className={`mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-2 ${
                draft.email && !isValidEmail(draft.email)
                  ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-200'
                  : 'border-slate-200 focus:border-teal-400 focus:ring-teal-200'
              }`}
            />
            {draft.email && !isValidEmail(draft.email) && (
              <p className="mt-1 text-xs text-rose-500">Enter a valid email address</p>
            )}
          </div>
          <div>
            <FieldLabel id="patient-phone" optional>Phone number</FieldLabel>
            <input
              id="patient-phone"
              type="tel"
              placeholder="e.g. 5551234567"
              value={draft.phone || ''}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 10)
                patch({ phone: v })
              }}
              className={`mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-2 ${
                draft.phone && !isValidPhone(draft.phone)
                  ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-200'
                  : 'border-slate-200 focus:border-teal-400 focus:ring-teal-200'
              }`}
            />
            {draft.phone && !isValidPhone(draft.phone) && (
              <p className="mt-1 text-xs text-rose-500">Enter a 10-digit US phone number</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Step 2: Send intake ── */

function StepSendIntake({
  basicsComplete,
  intakeSections,
  onSectionsChange,
  intakeLink,
  onGenerateLink,
  onRevokeLink,
  patientEmail,
  patientName,
  doctorEmail,
  doctorName,
}) {
  const [copied, setCopied] = useState(false)
  const [emailStatus, setEmailStatus] = useState('') // '' | 'sending' | 'sent' | 'error'
  const [emailError, setEmailError] = useState('')

  const toggleSection = (id, value) => {
    onSectionsChange((prev) => ({ ...prev, [id]: value }))
  }

  const handleGenerate = () => {
    onGenerateLink({ message: '', expiryHours: 48 })
  }

  const handleCopy = async () => {
    if (!intakeLink?.url) return
    try {
      await navigator.clipboard.writeText(intakeLink.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select a hidden input
    }
  }

  const handleSendEmail = async () => {
    if (!intakeLink?.url || !patientEmail) return
    setEmailStatus('sending')
    setEmailError('')
    try {
      const res = await fetch('/api/send-intake-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientEmail,
          patientName,
          doctorName,
          doctorEmail,
          intakeUrl: intakeLink.url,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to send email.')
      }
      setEmailStatus('sent')
    } catch (err) {
      setEmailStatus('error')
      setEmailError(err instanceof Error ? err.message : 'Failed to send email.')
    }
  }

  return (
    <div className="grid gap-6">
      {/* Configure sections */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-sm font-semibold text-slate-900">Configure patient intake</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Toggle which sections the patient sees. BP-focused by default.
        </p>
        <div className="mt-4 grid gap-2">
          {INTAKE_SECTION_DEFS.map((sec) => (
            <SectionToggle
              key={sec.id}
              id={`sec-${sec.id}`}
              label={sec.label}
              checked={intakeSections[sec.id] ?? sec.defaultOn}
              onChange={(val) => toggleSection(sec.id, val)}
            />
          ))}
        </div>
      </div>

      {/* Link generation / display */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-sm font-semibold text-slate-900">Magic link</h3>
        {!intakeLink ? (
          <>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Creates a one-time, opaque link. No PHI in the URL.
            </p>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!basicsComplete}
              className="mt-4 w-full rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(13,148,136,0.25)] transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Send intake form and generate secure link
            </button>
            {!basicsComplete ? (
              <p className="mt-2 text-xs text-slate-500">
                Go back to <strong className="font-semibold text-slate-700">Basics</strong> and fill patient name,
                date of birth, sex, MRN, and email to generate a link.
              </p>
            ) : null}
          </>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5">
              <code className="min-w-0 flex-1 truncate text-xs text-slate-600">
                {intakeLink.url}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-500"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                Expires {new Date(intakeLink.expiresAt).toLocaleDateString(undefined, {
                  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                })}
              </span>
              <button
                type="button"
                onClick={onRevokeLink}
                className="font-semibold text-rose-500 transition hover:text-rose-700"
              >
                Revoke link
              </button>
            </div>
            {/* Email to patient */}
            {patientEmail && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Send via email</p>
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-white px-3 py-2 border border-slate-100">
                  <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                  </svg>
                  <span className="text-sm text-slate-700">{patientEmail}</span>
                </div>
                {doctorEmail && (
                  <p className="mt-1.5 text-xs text-slate-400">
                    From: {doctorName || doctorEmail} (reply-to: {doctorEmail})
                  </p>
                )}
                {emailStatus === 'sent' ? (
                  <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-sm font-medium text-emerald-700">
                    Email sent successfully
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendEmail}
                    disabled={emailStatus === 'sending'}
                    className="mt-3 w-full rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {emailStatus === 'sending' ? 'Sending\u2026' : 'Send to patient\u2019s email'}
                  </button>
                )}
                {emailStatus === 'error' && emailError && (
                  <p className="mt-2 text-xs text-rose-600">{emailError}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Step 3: Chart & merge ── */

function IntakeStatusAlert({ intakeLink, intakeSubmission, onRefreshStatus }) {
  if (!intakeLink) {
    return (
      <div
        role="status"
        className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-xl border border-dashed border-slate-200 bg-slate-50/90 px-4 py-2.5 text-sm text-slate-600"
      >
        <span className="font-semibold text-slate-800">Patient intake</span>
        <span className="text-slate-300" aria-hidden>
          ·
        </span>
        <span>No link yet — use <span className="font-medium text-slate-700">Send intake</span> to generate one.</span>
      </div>
    )
  }

  const submitted = !!intakeSubmission

  return (
    <div
      role="status"
      className={`rounded-xl border px-4 py-2.5 shadow-sm ${
        submitted ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/50'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${submitted ? 'text-emerald-900' : 'text-amber-900'}`}>
            {submitted ? 'Intake received' : 'Waiting for patient intake'}
          </p>
          {submitted ? (
            <p className="text-xs text-emerald-800/80">
              {new Date(intakeSubmission.submittedAt).toLocaleString()}
            </p>
          ) : (
            <p className="text-xs text-amber-800/70">Refresh after the patient submits.</p>
          )}
        </div>
        {!submitted ? (
          <button
            type="button"
            onClick={onRefreshStatus}
            className="shrink-0 rounded-lg border border-amber-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 shadow-sm transition hover:bg-amber-50/80"
          >
            Refresh
          </button>
        ) : null}
      </div>
      {submitted && intakeSubmission.data && (
        <details className="mt-2 border-t border-emerald-200/50 pt-2">
          <summary className="cursor-pointer text-xs font-semibold text-emerald-800 hover:underline">
            Preview patient responses
          </summary>
          <div className="mt-2 max-h-60 overflow-y-auto rounded-lg border border-emerald-100 bg-white p-3 text-sm">
            {intakeSubmission.data.bpReadings?.length > 0 && (
              <div className="mb-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Home BP readings</p>
                <ul className="mt-1 space-y-0.5 text-slate-700">
                  {intakeSubmission.data.bpReadings.map((r, i) => (
                    <li key={i}>{r.systolic}/{r.diastolic} mmHg — {r.date || 'no date'}{r.time ? `, ${r.time}` : ''}</li>
                  ))}
                </ul>
              </div>
            )}
            {intakeSubmission.data.symptoms?.length > 0 && (
              <div className="mb-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Symptoms</p>
                <p className="mt-1 text-slate-700">{intakeSubmission.data.symptoms.join(', ')}</p>
              </div>
            )}
            {intakeSubmission.data.medications && (
              <div className="mb-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Medications</p>
                <p className="mt-1 text-slate-700">{intakeSubmission.data.medications}</p>
              </div>
            )}
            {intakeSubmission.data.allergies && (
              <div className="mb-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Allergies</p>
                <p className="mt-1 text-slate-700">{intakeSubmission.data.allergies}</p>
              </div>
            )}
            {intakeSubmission.data.notes && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Additional notes</p>
                <p className="mt-1 text-slate-700">{intakeSubmission.data.notes}</p>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  )
}

function StepChartMerge({
  intakeLink,
  intakeSubmission,
  onRefreshStatus,
  onMerge,
  merged,
  ...profileCardProps
}) {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <IntakeStatusAlert
        intakeLink={intakeLink}
        intakeSubmission={intakeSubmission}
        onRefreshStatus={onRefreshStatus}
      />

      <div className="min-w-0 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Chart document & extract</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            Upload one clinical PDF. The structured snapshot below is generated from the document.
          </p>
        </div>
        <ProfileCard {...profileCardProps} embedded />
      </div>

      {intakeSubmission && profileCardProps.profile && !merged && (
        <button
          type="button"
          onClick={onMerge}
          className="w-full rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(13,148,136,0.25)] transition hover:bg-teal-500 sm:w-auto sm:self-start"
        >
          Merge intake into profile
        </button>
      )}
      {merged ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-2.5 text-sm font-medium text-emerald-800">
          Patient intake merged into profile
        </div>
      ) : null}
    </div>
  )
}

/* ── Main component ── */

export default function AddPatientIntake({ doctorEmail, doctorName, onMergePatient, ...profileCardProps }) {
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState({ name: '', dob: '', sex: '', mrn: '', email: '', phone: '', concerns: [], notes: '' })
  const [intakeSections, setIntakeSections] = useState(() => {
    const defaults = {}
    INTAKE_SECTION_DEFS.forEach((s) => { defaults[s.id] = s.defaultOn })
    return defaults
  })
  const [intakeLink, setIntakeLink] = useState(null)
  const [intakeSubmission, setIntakeSubmission] = useState(null)
  const [merged, setMerged] = useState(false)
  const [linkError, setLinkError] = useState('')

  const canAdvanceFromBasics = isBasicsDraftComplete(draft)

  const handleGenerateLink = useCallback(async ({ message, expiryHours }) => {
    setLinkError('')
    if (!isBasicsDraftComplete(draft)) {
      setLinkError('Complete Basics: patient name, date of birth, sex, MRN / identifier, and email.')
      return
    }
    try {
      const res = await fetch('/api/intake-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient: { name: draft.name, dob: draft.dob, sex: draft.sex, mrn: draft.mrn, email: draft.email, phone: draft.phone, concerns: draft.concerns },
          sections: intakeSections,
          expiresInHours: expiryHours,
          message,
        }),
      })
      const text = await res.text()
      if (!res.ok) {
        throw new Error(errorMessageFromResponse(res, text))
      }
      let record
      try {
        record = JSON.parse(text)
      } catch {
        throw new Error('Invalid JSON from server when creating intake link.')
      }
      if (!record?.token) {
        throw new Error('Server response missing token.')
      }
      setIntakeLink({
        token: record.token,
        url: `${window.location.origin}/intake/${record.token}`,
        expiresAt: record.expiresAt,
      })
    } catch (err) {
      const messageText =
        err instanceof TypeError && err.message === 'Failed to fetch'
          ? 'Network error — is the API running? Use npm run dev or npm run server (port 8787).'
          : err instanceof Error
            ? err.message
            : 'Failed to create intake link.'
      setLinkError(messageText)
    }
  }, [draft, intakeSections])

  const handleRevokeLink = useCallback(async () => {
    if (!intakeLink?.token) return
    try {
      await fetch(`/api/intake-tokens/${intakeLink.token}`, { method: 'DELETE' })
    } catch {
      // best-effort
    }
    setIntakeLink(null)
    setIntakeSubmission(null)
  }, [intakeLink])

  const handleRefreshStatus = useCallback(async () => {
    if (!intakeLink?.token) return
    try {
      const res = await fetch(`/api/intake-tokens/${intakeLink.token}/status`)
      if (!res.ok) return
      const data = await res.json()
      if (data.submission) {
        setIntakeSubmission(data.submission)
      }
    } catch {
      // ignore
    }
  }, [intakeLink])

  const handleMerge = useCallback(() => {
    setMerged(true)

    // Build a patient entry in the same format as DEMO_PATIENTS
    const parsedProfile = profileCardProps.profile
    const age = draft.dob
      ? Math.floor((Date.now() - new Date(draft.dob).getTime()) / (365.25 * 24 * 3600_000))
      : null

    const entry = {
      id: `patient-${Date.now()}`,
      chartLabel: `${draft.name}`,
      avatarSrc: '',
      profile: {
        patientName: draft.name || parsedProfile?.patientName || 'Unknown',
        age: age ?? parsedProfile?.age ?? null,
        sex: draft.sex || parsedProfile?.sex || '',
        chiefConcern: (draft.concerns || []).join(', ') || parsedProfile?.chiefConcern || '',
        summary: parsedProfile?.summary || '',
        diagnoses: parsedProfile?.diagnoses || [],
        medications: parsedProfile?.medications || [],
        allergies: parsedProfile?.allergies || [],
        vitals: parsedProfile?.vitals || [],
        labs: parsedProfile?.labs || [],
        sourceHighlights: parsedProfile?.sourceHighlights || [],
        // Extra fields from draft
        email: draft.email || '',
        phone: draft.phone || '',
        mrn: draft.mrn || '',
        dob: draft.dob || '',
      },
    }

    // Merge intake submission data if available
    if (intakeSubmission?.data) {
      const sub = intakeSubmission.data
      if (sub.medications) entry.profile.medications = [...entry.profile.medications, sub.medications]
      if (sub.allergies) entry.profile.allergies = [...entry.profile.allergies, sub.allergies]
      if (sub.symptoms?.length) entry.profile.chiefConcern += (entry.profile.chiefConcern ? '; ' : '') + sub.symptoms.join(', ')
    }

    if (onMergePatient) onMergePatient(entry)
  }, [draft, intakeSubmission, profileCardProps.profile, onMergePatient])

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1))
  const back = () => setStep((s) => Math.max(s - 1, 0))

  return (
    <div className="flex flex-col gap-6">
      <StepIndicator steps={STEPS} currentIndex={step} />

      {linkError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
          {linkError}
        </div>
      )}

      {step === 0 && <StepBasics draft={draft} onDraftChange={setDraft} />}
      {step === 1 && (
        <StepSendIntake
          basicsComplete={canAdvanceFromBasics}
          intakeSections={intakeSections}
          onSectionsChange={setIntakeSections}
          intakeLink={intakeLink}
          onGenerateLink={handleGenerateLink}
          onRevokeLink={handleRevokeLink}
          patientEmail={draft.email}
          patientName={draft.name}
          doctorEmail={doctorEmail}
          doctorName={doctorName}
        />
      )}
      {step === 2 && (
        <StepChartMerge
          intakeLink={intakeLink}
          intakeSubmission={intakeSubmission}
          onRefreshStatus={handleRefreshStatus}
          onMerge={handleMerge}
          merged={merged}
          {...profileCardProps}
        />
      )}

      {/* Nav buttons */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-4">
        <div>
          {step > 0 && (
            <button
              type="button"
              onClick={back}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              Back
            </button>
          )}
        </div>
        <div>
          {step < STEPS.length - 1 && (
            <button
              type="button"
              onClick={next}
              disabled={step === 0 && !canAdvanceFromBasics}
              className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(13,148,136,0.25)] transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
