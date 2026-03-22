import { useState } from 'react'

const TOTAL_STEPS = 3

function StepDots({ current, total }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i <= current ? 'w-5 bg-teal-600' : 'w-1.5 bg-slate-200'
          }`}
        />
      ))}
    </div>
  )
}

function FieldLabel({ htmlFor, children, optional }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
      {optional ? <span className="font-normal normal-case text-slate-400"> (optional)</span> : null}
    </label>
  )
}

const inputClass =
  'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-200'

/* ──────────────────────────────────
   Step 1 — Doctor profile
   ────────────────────────────────── */

function StepProfile({ data, onChange }) {
  const patch = (field, value) => onChange({ ...data, [field]: value })

  return (
    <>
      <h2 className="font-serif text-xl font-semibold text-slate-950">Set up your profile</h2>
      <p className="mt-1 text-sm text-slate-500">
        This appears on generated summaries and recommendations.
      </p>
      <div className="mt-6 grid gap-4">
        <div>
          <FieldLabel htmlFor="ob-name">Display name</FieldLabel>
          <input id="ob-name" type="text" placeholder="e.g. Dr. Sarah Chen" value={data.displayName} onChange={(e) => patch('displayName', e.target.value)} className={inputClass} />
        </div>
        <div>
          <FieldLabel htmlFor="ob-specialty">Specialty</FieldLabel>
          <input id="ob-specialty" type="text" placeholder="e.g. Cardiology" value={data.specialty} onChange={(e) => patch('specialty', e.target.value)} className={inputClass} />
        </div>
        <div>
          <FieldLabel htmlFor="ob-hospital">Hospital / Institution</FieldLabel>
          <input id="ob-hospital" type="text" placeholder="e.g. St. Mary's Hospital" value={data.hospital} onChange={(e) => patch('hospital', e.target.value)} className={inputClass} />
        </div>
        <div>
          <FieldLabel htmlFor="ob-npi" optional>NPI</FieldLabel>
          <input id="ob-npi" type="text" placeholder="10-digit NPI number" value={data.npi} onChange={(e) => patch('npi', e.target.value)} className={inputClass} />
        </div>
      </div>
    </>
  )
}

/* ──────────────────────────────────
   Step 2 — Workspace setup
   ────────────────────────────────── */

function StepWorkspace({ data, onChange }) {
  const patch = (field, value) => onChange({ ...data, [field]: value })

  return (
    <>
      <h2 className="font-serif text-xl font-semibold text-slate-950">Name your workspace</h2>
      <p className="mt-1 text-sm text-slate-500">
        Shown in the sidebar. You can change this later in Settings.
      </p>
      <div className="mt-6">
        <div>
          <FieldLabel htmlFor="ob-ws-name">Workspace name</FieldLabel>
          <input id="ob-ws-name" type="text" placeholder="e.g. Downtown Cardiology Clinic" value={data.workspaceName} onChange={(e) => patch('workspaceName', e.target.value)} className={inputClass} />
        </div>
      </div>
    </>
  )
}

/* ──────────────────────────────────
   Step 3 — Quick tour
   ────────────────────────────────── */

const TOUR_SLIDES = [
  {
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
      </svg>
    ),
    title: 'Start with a patient',
    body: 'Add a new patient, tag their clinical concern, send an intake link, and upload the chart document.',
  },
  {
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
      </svg>
    ),
    title: 'Get a recommendation',
    body: 'Once a chart is uploaded, Triage suggests a treatment direction based on BP readings, medications, and clinical guidelines. You choose the regimen.',
  },
  {
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
    title: 'Simulate and document',
    body: 'Run an 8-week what-if projection for any regimen. Then move to Prescription and Follow up to complete the care plan.',
  },
]

function StepTour({ slideIndex, onSlideChange }) {
  const slide = TOUR_SLIDES[slideIndex]
  const isFirst = slideIndex === 0
  const isLast = slideIndex === TOUR_SLIDES.length - 1

  return (
    <>
      <h2 className="font-serif text-xl font-semibold text-slate-950">Here&apos;s how Triage works</h2>
      <p className="mt-1 text-sm text-slate-500">
        A quick look at the three core steps.
      </p>
      <div className="mt-6 rounded-xl bg-slate-50 p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-600/10 text-teal-700">
            {slide.icon}
          </span>
          <div className="min-w-0">
            <h3 className="font-serif text-lg font-semibold text-slate-900">{slide.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{slide.body}</p>
          </div>
        </div>
        {/* Slide dots + nav */}
        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onSlideChange(slideIndex - 1)}
            disabled={isFirst}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:invisible"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div className="flex gap-1.5">
            {TOUR_SLIDES.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === slideIndex ? 'w-4 bg-teal-600' : 'w-1.5 bg-slate-300'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => onSlideChange(slideIndex + 1)}
            disabled={isLast}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:invisible"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>
    </>
  )
}

/* ──────────────────────────────────
   Main onboarding
   ────────────────────────────────── */

export default function Onboarding({ onFinish }) {
  const [step, setStep] = useState(0)
  const [slideIndex, setSlideIndex] = useState(0)

  const [doctorProfile, setDoctorProfile] = useState({
    displayName: '',
    specialty: '',
    hospital: '',
    npi: '',
  })

  const [workspace, setWorkspace] = useState({
    workspaceName: '',
  })

  const profileValid =
    doctorProfile.displayName.trim() !== '' &&
    doctorProfile.specialty.trim() !== '' &&
    doctorProfile.hospital.trim() !== ''

  const workspaceValid = workspace.workspaceName.trim() !== ''

  const canContinue = step === 0 ? profileValid : step === 1 ? workspaceValid : true

  const handleContinue = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1)
    } else {
      handleFinish()
    }
  }

  const handleFinish = () => {
    onFinish({
      doctorProfile,
      workspace,
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200/90 bg-white p-8 shadow-[0_20px_64px_rgba(15,23,42,0.09),0_0_0_1px_rgba(15,23,42,0.04)] sm:p-10">
        {/* Brand + progress */}
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">Triage</p>
          <div className="mt-3">
            <StepDots current={step} total={TOTAL_STEPS} />
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Step {step + 1} of {TOTAL_STEPS}
          </p>
        </div>

        {/* Step content */}
        {step === 0 && <StepProfile data={doctorProfile} onChange={setDoctorProfile} />}
        {step === 1 && <StepWorkspace data={workspace} onChange={setWorkspace} />}
        {step === 2 && <StepTour slideIndex={slideIndex} onSlideChange={setSlideIndex} />}

        {/* Footer nav */}
        <div className="mt-8 flex items-center justify-between">
          <div>
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-teal-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
                Back
              </button>
            )}
            {step === 2 && (
              <button
                type="button"
                onClick={handleFinish}
                className="text-sm font-medium text-slate-400 transition hover:text-slate-600"
              >
                Skip tour
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue}
            className="rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(13,148,136,0.25)] transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {step === 2 ? 'Go to workspace \u2192' : 'Continue \u2192'}
          </button>
        </div>
      </div>
    </div>
  )
}
