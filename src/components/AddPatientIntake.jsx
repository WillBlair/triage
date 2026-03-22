import { useCallback, useState } from 'react'
import ProfileCard from './ProfileCard'

const STEPS = [
  { id: 'basics', label: 'Basics' },
  { id: 'send-intake', label: 'Send intake' },
  { id: 'chart-merge', label: 'Chart & merge' },
]

const DOCUMENT_TYPES = [
  { value: 'discharge', label: 'Discharge summary' },
  { value: 'clinic', label: 'Clinic / ambulatory note' },
  { value: 'hp', label: 'H&P or consult' },
  { value: 'labs_only', label: 'Labs / imaging packet' },
  { value: 'other', label: 'Other' },
]

const CONCERN_OPTIONS = ['Hypertension', 'Hypotension']

const INTAKE_SECTION_DEFS = [
  { id: 'homeBp', label: 'Home BP readings', defaultOn: true },
  { id: 'symptoms', label: 'Symptoms checklist', defaultOn: true },
  { id: 'medsAllergies', label: 'Medications & allergies', defaultOn: true },
  { id: 'lifestyle', label: 'Lifestyle (diet, exercise, smoking)', defaultOn: false },
  { id: 'uploads', label: 'File uploads (labs, prior records)', defaultOn: false },
]

/** Name, DOB, sex, and MRN required before Continue / generating an intake link. */
function isBasicsDraftComplete(draft) {
  return (
    Boolean(draft?.name?.trim()) &&
    Boolean(String(draft?.dob ?? '').trim()) &&
    Boolean(String(draft?.sex ?? '').trim()) &&
    Boolean(draft?.mrn?.trim())
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
  const toggleConcern = (concern) => {
    const current = draft.concerns || []
    const next = current.includes(concern)
      ? current.filter((c) => c !== concern)
      : [...current, concern]
    patch({ concerns: next })
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-sm font-semibold text-slate-900">Patient identifiers</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Required identifiers for a draft profile. More detail can come from the chart or patient intake.
        </p>
        <p className="mt-2 text-xs font-medium text-slate-600">
          Patient name, date of birth, sex, and MRN / identifier are required to continue.
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
              onChange={(e) => patch({ name: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-200"
            />
          </div>
          <div>
            <FieldLabel id="patient-dob">Date of birth</FieldLabel>
            <input
              id="patient-dob"
              type="date"
              required
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
              placeholder="e.g. clinic MRN or last 4 digits"
              value={draft.mrn || ''}
              onChange={(e) => patch({ mrn: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-200"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-sm font-semibold text-slate-900">Clinical concern</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Tag the primary concern so intake and recommendations are scoped correctly.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {CONCERN_OPTIONS.map((concern) => {
            const selected = (draft.concerns || []).includes(concern)
            return (
              <button
                key={concern}
                type="button"
                onClick={() => toggleConcern(concern)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  selected
                    ? 'border-teal-300 bg-teal-50 text-teal-800 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {selected && <span className="mr-1.5">✓</span>}
                {concern}
              </button>
            )
          })}
        </div>
        <div className="mt-4">
          <FieldLabel id="patient-notes" optional>Additional notes</FieldLabel>
          <textarea
            id="patient-notes"
            rows={2}
            placeholder="Anything the AI should know for scoping..."
            value={draft.notes || ''}
            onChange={(e) => patch({ notes: e.target.value })}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-200"
          />
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
}) {
  const [message, setMessage] = useState('')
  const [expiryHours, setExpiryHours] = useState(48)
  const [copied, setCopied] = useState(false)

  const toggleSection = (id, value) => {
    onSectionsChange((prev) => ({ ...prev, [id]: value }))
  }

  const handleGenerate = () => {
    onGenerateLink({ message, expiryHours })
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

      {/* Message + expiry */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-sm font-semibold text-slate-900">Delivery options</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Generate a secure link. Send it yourself via your clinic&apos;s SMS, email, or patient portal.
        </p>
        <div className="mt-5 grid gap-5">
          <div>
            <FieldLabel id="intake-message" optional>Message to patient</FieldLabel>
            <textarea
              id="intake-message"
              rows={2}
              placeholder="e.g. Please complete this before your Thursday appointment..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={!!intakeLink}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-200 disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>
          <div>
            <FieldLabel id="intake-expiry">Link expires after</FieldLabel>
            <select
              id="intake-expiry"
              value={expiryHours}
              onChange={(e) => setExpiryHours(Number(e.target.value))}
              disabled={!!intakeLink}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-200 disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value={24}>24 hours</option>
              <option value={48}>48 hours</option>
              <option value={72}>72 hours</option>
              <option value={168}>7 days</option>
            </select>
          </div>
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
              Generate secure link
            </button>
            {!basicsComplete ? (
              <p className="mt-2 text-xs text-slate-500">
                Go back to <strong className="font-semibold text-slate-700">Basics</strong> and fill patient name,
                date of birth, sex, and MRN to generate a link.
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
            {/* QR placeholder */}
            <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-6">
              <div className="text-center">
                <div className="mx-auto grid h-24 w-24 place-items-center rounded-lg bg-slate-100">
                  <span className="text-3xl text-slate-300">⊞</span>
                </div>
                <p className="mt-2 text-xs text-slate-400">QR code (scan to open)</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Step 3: Chart & merge ── */

function IntakeStatusPanel({ intakeLink, intakeSubmission, onRefreshStatus }) {
  if (!intakeLink) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 px-5 py-8 text-center">
        <p className="text-sm text-slate-400">No intake link sent yet.</p>
        <p className="mt-1 text-xs text-slate-400">Go back to &quot;Send intake&quot; to generate one.</p>
      </div>
    )
  }

  const submitted = !!intakeSubmission

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${submitted ? 'border-emerald-200 bg-emerald-50/40' : 'border-amber-200 bg-amber-50/30'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wide ${submitted ? 'text-emerald-600' : 'text-amber-600'}`}>
            {submitted ? 'Submitted' : 'Awaiting patient'}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-800">
            Patient intake {submitted ? 'received' : 'pending'}
          </p>
          {submitted && (
            <p className="mt-0.5 text-xs text-slate-500">
              Submitted {new Date(intakeSubmission.submittedAt).toLocaleString()}
            </p>
          )}
        </div>
        {!submitted && (
          <button
            type="button"
            onClick={onRefreshStatus}
            className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            Refresh
          </button>
        )}
      </div>
      {submitted && intakeSubmission.data && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-semibold text-emerald-700 hover:underline">
            Preview patient responses
          </summary>
          <div className="mt-2 max-h-60 overflow-y-auto rounded-xl border border-emerald-100 bg-white p-4 text-sm">
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
  intakeForm,
  onIntakeChange,
  intakeLink,
  intakeSubmission,
  onRefreshStatus,
  onMerge,
  merged,
  ...profileCardProps
}) {
  const patch = (updates) => onIntakeChange((prev) => ({ ...prev, ...updates }))

  const DOCUMENT_TYPES = [
    { value: 'discharge', label: 'Discharge summary' },
    { value: 'clinic', label: 'Clinic / ambulatory note' },
    { value: 'hp', label: 'H&P or consult' },
    { value: 'labs_only', label: 'Labs / imaging packet' },
    { value: 'other', label: 'Other' },
  ]

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-10">
      {/* Left: Doctor PDF upload + extract */}
      <div className="min-w-0 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Chart document & extract</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            Upload one clinical PDF. The structured snapshot below is generated from the document.
          </p>
        </div>
        <ProfileCard {...profileCardProps} embedded />
      </div>

      {/* Right: Encounter context + intake status */}
      <div className="min-w-0 space-y-5">
        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-sm font-semibold text-slate-900">Encounter context</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Session metadata and clinical framing.
            </p>
          </div>
          <div className="mt-5 grid gap-5">
            <div>
              <FieldLabel id="intake-visit-date" optional>Visit / encounter date</FieldLabel>
              <input
                id="intake-visit-date"
                type="date"
                value={intakeForm.visitDate}
                onChange={(e) => patch({ visitDate: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-200"
              />
            </div>
            <div>
              <FieldLabel id="intake-session-label" optional>Session label</FieldLabel>
              <input
                id="intake-session-label"
                type="text"
                placeholder="e.g. MRN last-4, bed, initials"
                value={intakeForm.sessionLabel}
                onChange={(e) => patch({ sessionLabel: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-200"
              />
            </div>
            <div>
              <FieldLabel id="intake-doc-type">Chart document type</FieldLabel>
              <select
                id="intake-doc-type"
                value={intakeForm.documentType}
                onChange={(e) => patch({ documentType: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-200"
              >
                {DOCUMENT_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel id="intake-patient-email" optional>Patient email (for follow-up check-in)</FieldLabel>
              <input
                id="intake-patient-email"
                type="email"
                placeholder="patient@example.com"
                value={intakeForm.patientEmail || ''}
                onChange={(e) => patch({ patientEmail: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-200"
              />
              <p className="mt-1 text-xs text-slate-400">
                Used to send the patient a post-appointment check-in via Discord.
              </p>
            </div>
          </div>
        </section>

        {/* Patient intake status */}
        <section>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Patient intake status</h3>
          <IntakeStatusPanel
            intakeLink={intakeLink}
            intakeSubmission={intakeSubmission}
            onRefreshStatus={onRefreshStatus}
          />
        </section>

        {/* Merge button */}
        {intakeSubmission && profileCardProps.profile && !merged && (
          <button
            type="button"
            onClick={onMerge}
            className="w-full rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(13,148,136,0.25)] transition hover:bg-teal-500"
          >
            Merge intake into profile
          </button>
        )}
        {merged && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-center text-sm font-medium text-emerald-800">
            Patient intake merged into profile
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Main component ── */

export default function AddPatientIntake({ intakeForm, onIntakeChange, ...profileCardProps }) {
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState({ name: '', dob: '', sex: '', mrn: '', concerns: [], notes: '' })
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
      setLinkError('Complete Basics: patient name, date of birth, sex, and MRN / identifier.')
      return
    }
    try {
      const res = await fetch('/api/intake-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient: { name: draft.name, dob: draft.dob, sex: draft.sex, mrn: draft.mrn, concerns: draft.concerns },
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
    // In a real app, this would merge patient-submitted data into the parsed profile.
    // For now, mark as merged.
    setMerged(true)
  }, [])

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
        />
      )}
      {step === 2 && (
        <StepChartMerge
          intakeForm={intakeForm}
          onIntakeChange={onIntakeChange}
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
