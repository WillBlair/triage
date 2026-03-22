import { useCallback, useEffect, useState } from 'react'

const INTAKE_STEPS = ['consent', 'bp', 'history', 'uploads', 'review']

function Disclaimer() {
  return (
    <aside className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/90 bg-white/92 px-3 py-2 text-center text-[11px] leading-snug text-slate-600 shadow-[0_-4px_24px_rgba(15,23,42,0.06)] backdrop-blur-md sm:px-4 sm:text-xs">
      <span className="font-semibold text-slate-700">Prototype.</span>{' '}
      Illustrative / not clinically validated / not a substitute for professional care.
    </aside>
  )
}

function StepDots({ steps, current }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {steps.map((s, i) => (
        <div
          key={s}
          className={`h-1.5 rounded-full transition-all ${
            i === current ? 'w-6 bg-teal-600' : i < current ? 'w-1.5 bg-teal-300' : 'w-1.5 bg-slate-200'
          }`}
        />
      ))}
    </div>
  )
}

/* ── Consent ── */
function ConsentStep({ patientName, onAccept }) {
  return (
    <div className="mx-auto max-w-lg text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Triage</p>
      <h1 className="mt-4 font-serif text-2xl font-semibold text-slate-950 sm:text-3xl">
        Welcome{patientName ? `, ${patientName}` : ''}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-500">
        Your doctor has requested some health information before your next visit.
        This form is secure and your responses will only be shared with your care team.
      </p>
      <div className="mt-6 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 text-left text-sm text-slate-600">
        <p className="font-semibold text-slate-800">Before you begin:</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>This takes about 3 – 5 minutes</li>
          <li>Have your recent BP readings handy if possible</li>
          <li>You can skip optional sections</li>
          <li>Your data is encrypted and only visible to your doctor</li>
        </ul>
      </div>
      <button
        type="button"
        onClick={onAccept}
        className="mt-6 w-full rounded-full bg-teal-600 px-8 py-3.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(13,148,136,0.25)] transition hover:bg-teal-500 sm:w-auto"
      >
        I understand — let&apos;s start
      </button>
    </div>
  )
}

/* ── BP Readings ── */
function BpStep({ readings, onChange }) {
  const addReading = () => {
    onChange([...readings, { systolic: '', diastolic: '', date: '', time: '' }])
  }

  const updateReading = (index, field, value) => {
    const next = [...readings]
    next[index] = { ...next[index], [field]: value }
    onChange(next)
  }

  const removeReading = (index) => {
    onChange(readings.filter((_, i) => i !== index))
  }

  return (
    <div>
      <h2 className="font-serif text-xl font-semibold text-slate-950">Home BP readings</h2>
      <p className="mt-1 text-sm text-slate-500">
        Enter any blood pressure readings you&apos;ve taken at home recently.
      </p>
      <div className="mt-5 space-y-3">
        {readings.map((r, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500">Reading {i + 1}</p>
              {readings.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeReading(i)}
                  className="text-xs font-medium text-rose-500 hover:text-rose-700"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="block text-xs text-slate-500">Systolic</label>
                <input
                  type="number"
                  placeholder="120"
                  value={r.systolic}
                  onChange={(e) => updateReading(i, 'systolic', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500">Diastolic</label>
                <input
                  type="number"
                  placeholder="80"
                  value={r.diastolic}
                  onChange={(e) => updateReading(i, 'diastolic', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500">Date</label>
                <input
                  type="date"
                  value={r.date}
                  onChange={(e) => updateReading(i, 'date', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500">Time <span className="text-slate-400">(opt.)</span></label>
                <input
                  type="time"
                  value={r.time}
                  onChange={(e) => updateReading(i, 'time', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addReading}
        className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:border-teal-400 hover:text-teal-700"
      >
        + Add another reading
      </button>
    </div>
  )
}

/* ── History / Meds ── */
const SYMPTOM_OPTIONS = [
  'Headache', 'Dizziness', 'Blurred vision', 'Chest pain', 'Shortness of breath',
  'Fatigue', 'Nausea', 'Palpitations', 'Swelling (ankles/feet)', 'Nosebleeds',
]

function HistoryStep({ symptoms, onSymptomsChange, medications, onMedicationsChange, allergies, onAllergiesChange }) {
  const toggleSymptom = (s) => {
    onSymptomsChange(
      symptoms.includes(s)
        ? symptoms.filter((x) => x !== s)
        : [...symptoms, s]
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-xl font-semibold text-slate-950">Symptoms & history</h2>
        <p className="mt-1 text-sm text-slate-500">Select any symptoms you&apos;ve experienced recently.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {SYMPTOM_OPTIONS.map((s) => {
            const active = symptoms.includes(s)
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleSymptom(s)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? 'border-teal-300 bg-teal-50 text-teal-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {active && <span className="mr-1">✓</span>}{s}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Current medications
        </label>
        <textarea
          rows={3}
          placeholder="List your current medications, doses, and frequency..."
          value={medications}
          onChange={(e) => onMedicationsChange(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Allergies
        </label>
        <textarea
          rows={2}
          placeholder="Any known drug allergies or sensitivities..."
          value={allergies}
          onChange={(e) => onAllergiesChange(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
        />
      </div>
    </div>
  )
}

/* ── File Uploads ── */
function UploadsStep({ files, onFilesChange }) {
  const handleFiles = (e) => {
    const selected = Array.from(e.target.files || [])
    onFilesChange([...files, ...selected])
  }

  const removeFile = (index) => {
    onFilesChange(files.filter((_, i) => i !== index))
  }

  return (
    <div>
      <h2 className="font-serif text-xl font-semibold text-slate-950">Upload files</h2>
      <p className="mt-1 text-sm text-slate-500">
        Attach any relevant documents — lab results, prior records, photos of readings. Optional.
      </p>
      <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white px-6 py-10 text-center transition hover:border-teal-400 hover:bg-teal-50/20">
        <input type="file" multiple onChange={handleFiles} className="hidden" />
        <p className="text-sm font-semibold text-slate-700">Drop files here or tap to upload</p>
        <p className="mt-1 text-xs text-slate-400">PDF, images, or documents</p>
      </label>
      {files.length > 0 && (
        <ul className="mt-4 space-y-2">
          {files.map((f, i) => (
            <li key={i} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <span className="min-w-0 truncate text-slate-700">{f.name}</span>
              <button type="button" onClick={() => removeFile(i)} className="ml-2 shrink-0 text-xs font-medium text-rose-500 hover:text-rose-700">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ── Review & Submit ── */
function ReviewStep({ readings, symptoms, medications, allergies, files, notes, onNotesChange }) {
  return (
    <div>
      <h2 className="font-serif text-xl font-semibold text-slate-950">Review & submit</h2>
      <p className="mt-1 text-sm text-slate-500">Check your information before sending it to your doctor.</p>

      <div className="mt-5 space-y-4">
        <ReviewSection title="BP readings" empty={readings.length === 0}>
          <ul className="space-y-0.5 text-sm text-slate-700">
            {readings.filter((r) => r.systolic && r.diastolic).map((r, i) => (
              <li key={i}>{r.systolic}/{r.diastolic} mmHg{r.date ? ` — ${r.date}` : ''}{r.time ? ` ${r.time}` : ''}</li>
            ))}
          </ul>
        </ReviewSection>

        <ReviewSection title="Symptoms" empty={symptoms.length === 0}>
          <p className="text-sm text-slate-700">{symptoms.join(', ')}</p>
        </ReviewSection>

        <ReviewSection title="Medications" empty={!medications}>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{medications}</p>
        </ReviewSection>

        <ReviewSection title="Allergies" empty={!allergies}>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{allergies}</p>
        </ReviewSection>

        <ReviewSection title="Uploaded files" empty={files.length === 0}>
          <ul className="space-y-0.5 text-sm text-slate-700">
            {files.map((f, i) => <li key={i}>{f.name}</li>)}
          </ul>
        </ReviewSection>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Anything else? <span className="font-normal normal-case text-slate-400">(optional)</span>
          </label>
          <textarea
            rows={2}
            placeholder="Additional notes for your doctor..."
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
          />
        </div>
      </div>
    </div>
  )
}

function ReviewSection({ title, empty, children }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <div className="mt-1.5">
        {empty ? <p className="text-sm italic text-slate-400">None provided</p> : children}
      </div>
    </div>
  )
}

/* ── Thank you ── */
function ThankYou() {
  return (
    <div className="mx-auto max-w-lg text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-3xl">
        ✓
      </div>
      <h1 className="mt-5 font-serif text-2xl font-semibold text-slate-950">Thank you</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-500">
        Your responses have been securely submitted to your care team.
        They&apos;ll review everything before your next appointment.
      </p>
      <p className="mt-6 text-xs text-slate-400">You can close this page now.</p>
    </div>
  )
}

/* ── Main ── */

export default function PatientIntakeForm({ token }) {
  const [status, setStatus] = useState('loading') // loading | ready | submitted | error
  const [config, setConfig] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [stepIndex, setStepIndex] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form data
  const [bpReadings, setBpReadings] = useState([{ systolic: '', diastolic: '', date: '', time: '' }])
  const [symptoms, setSymptoms] = useState([])
  const [medications, setMedications] = useState('')
  const [allergies, setAllergies] = useState('')
  const [files, setFiles] = useState([])
  const [notes, setNotes] = useState('')

  useEffect(() => {
    fetch(`/api/intake/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || 'This link is no longer valid.')
        }
        return res.json()
      })
      .then((data) => {
        setConfig(data)
        setStatus('ready')
      })
      .catch((err) => {
        setErrorMsg(err.message)
        setStatus('error')
      })
  }, [token])

  // Filter steps based on enabled sections
  const activeSteps = ['consent']
  if (config?.sections?.homeBp !== false) activeSteps.push('bp')
  if (config?.sections?.medsAllergies !== false || config?.sections?.symptoms !== false) activeSteps.push('history')
  if (config?.sections?.uploads !== false) activeSteps.push('uploads')
  activeSteps.push('review')

  const currentStep = activeSteps[stepIndex]
  const isLast = stepIndex === activeSteps.length - 1

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/intake/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bpReadings: bpReadings.filter((r) => r.systolic && r.diastolic),
          symptoms,
          medications,
          allergies,
          notes,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Submission failed.')
      }
      setStatus('submitted')
    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }, [token, bpReadings, symptoms, medications, allergies, notes])

  const next = () => {
    if (isLast) {
      handleSubmit()
    } else {
      setStepIndex((i) => i + 1)
    }
  }
  const back = () => setStepIndex((i) => Math.max(i - 1, 0))

  if (status === 'loading') {
    return (
      <Shell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="text-sm text-slate-400">Loading intake form&hellip;</p>
        </div>
      </Shell>
    )
  }

  if (status === 'error') {
    return (
      <Shell>
        <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center text-center">
          <h1 className="font-serif text-2xl font-semibold text-slate-950">Link unavailable</h1>
          <p className="mt-3 text-sm text-slate-500">{errorMsg}</p>
        </div>
      </Shell>
    )
  }

  if (status === 'submitted') {
    return (
      <Shell>
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <ThankYou />
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="mx-auto max-w-2xl px-4 py-8 pb-20 sm:px-6">
        {/* Header */}
        {currentStep !== 'consent' && (
          <div className="mb-6">
            <StepDots steps={activeSteps} current={stepIndex} />
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
            {errorMsg}
          </div>
        )}

        {/* Step content */}
        {currentStep === 'consent' && (
          <ConsentStep
            patientName={config?.patient?.name}
            onAccept={next}
          />
        )}

        {currentStep === 'bp' && (
          <BpStep readings={bpReadings} onChange={setBpReadings} />
        )}

        {currentStep === 'history' && (
          <HistoryStep
            symptoms={symptoms}
            onSymptomsChange={setSymptoms}
            medications={medications}
            onMedicationsChange={setMedications}
            allergies={allergies}
            onAllergiesChange={setAllergies}
          />
        )}

        {currentStep === 'uploads' && (
          <UploadsStep files={files} onFilesChange={setFiles} />
        )}

        {currentStep === 'review' && (
          <ReviewStep
            readings={bpReadings}
            symptoms={symptoms}
            medications={medications}
            allergies={allergies}
            files={files}
            notes={notes}
            onNotesChange={setNotes}
          />
        )}

        {/* Navigation (not shown on consent — it has its own CTA) */}
        {currentStep !== 'consent' && (
          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={back}
              className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={next}
              disabled={isSubmitting}
              className="rounded-full bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(13,148,136,0.25)] transition hover:bg-teal-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting\u2026' : isLast ? 'Submit to doctor' : 'Continue'}
            </button>
          </div>
        )}

        {config?.message && currentStep === 'consent' && (
          <div className="mt-6 rounded-xl border border-teal-100 bg-teal-50/40 px-4 py-3 text-sm text-teal-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">From your doctor</p>
            <p className="mt-1">{config.message}</p>
          </div>
        )}
      </div>
    </Shell>
  )
}

function Shell({ children }) {
  return (
    <div className="min-h-screen pb-14 text-slate-900 sm:pb-12">
      <Disclaimer />
      {children}
    </div>
  )
}
