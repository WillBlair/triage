export default function LandingPage({ onGetStarted, onLogin }) {
  return (
    <div className="min-h-screen pb-14 text-slate-900 sm:pb-12">
      {/* ── Top nav ── */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <p className="font-serif text-xl font-semibold tracking-tight text-teal-700">
          Triage
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onLogin}
            className="rounded-full px-5 py-2 text-sm font-semibold text-slate-700 transition hover:text-teal-700"
          >
            Log in
          </button>
          <button
            type="button"
            onClick={onGetStarted}
            className="rounded-full bg-teal-600 px-5 py-2 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(13,148,136,0.25)] transition hover:bg-teal-500"
          >
            Get started
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-5xl px-4 pb-20 pt-12 sm:px-6 sm:pt-20 lg:px-8">
        <div className="text-center">
          <h1 className="mx-auto max-w-3xl font-serif text-3xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl sm:leading-[1.12]">
            Triage gives you the clinical intelligence.{' '}
            <span className="text-teal-700">You make the call.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-500 sm:text-lg">
            AI-powered decision support for doctors managing hypertension and
            hypotension. Smart triage, drug recommendations you confirm, and a
            patient check-in bot that keeps you in the loop between visits.
          </p>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
            <button
              type="button"
              onClick={onGetStarted}
              className="rounded-full bg-teal-600 px-8 py-3.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(13,148,136,0.25)] transition hover:bg-teal-500 sm:min-w-[13rem]"
            >
              Get started
            </button>
            <a
              href="#how-it-works"
              className="rounded-full border border-slate-200 bg-white px-8 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:min-w-[13rem]"
            >
              See how it works
            </a>
          </div>
        </div>
      </section>

      {/* ── Pain → Solution ── */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
          The problem — and the fix
        </p>
        <h2 className="mt-3 text-center font-serif text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          What changes when Triage is in your workflow
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {PAIN_SOLUTIONS.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-slate-200/70 bg-white/80 p-6 shadow-sm backdrop-blur-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-500/80">
                Before
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                {item.before}
              </p>
              <div className="my-4 h-px bg-slate-100" />
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">
                After
              </p>
              <p className="mt-1 font-serif text-lg font-semibold leading-snug text-slate-900">
                {item.title}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                {item.after}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature cards ── */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
          Features
        </p>
        <h2 className="mt-3 text-center font-serif text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          Built for how you actually work
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-200/70 bg-linear-to-b from-teal-50/30 to-white p-6 shadow-sm"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600/10 text-lg text-teal-700">
                {f.icon}
              </span>
              <h3 className="mt-4 font-serif text-lg font-semibold text-slate-900">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section
        id="how-it-works"
        className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8"
      >
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
          How it works
        </p>
        <h2 className="mt-3 text-center font-serif text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          Three steps. Full picture.
        </h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title} className="text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-teal-200 bg-teal-50 font-serif text-xl font-semibold text-teal-700">
                {i + 1}
              </span>
              <h3 className="mt-4 font-serif text-lg font-semibold text-slate-900">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <h2 className="font-serif text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          Ready to make better-informed BP decisions?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-500">
          Triage gives you the clinical intelligence. You make the call.
        </p>
        <button
          type="button"
          onClick={onGetStarted}
          className="mt-8 rounded-full bg-teal-600 px-10 py-4 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(13,148,136,0.25)] transition hover:bg-teal-500"
        >
          Get started — it&apos;s free
        </button>
      </section>
    </div>
  )
}

/* ── Data ── */

const PAIN_SOLUTIONS = [
  {
    before: 'Scattered BP readings across charts, notes, and faxes.',
    title: 'Unified patient timeline',
    after:
      'Upload a chart and get a structured profile with BP history, meds, and comorbidities in one view.',
  },
  {
    before: 'Drug decisions without full context or evidence at hand.',
    title: 'AI surfaces options you confirm',
    after:
      'Triage ranks treatment options by guidelines and patient context. You review, you decide.',
  },
  {
    before: 'Patients unmonitored between appointments.',
    title: 'Check-in bot keeps you in the loop',
    after:
      'An automated bot checks in with patients on schedule and surfaces alerts when readings need attention.',
  },
]

const FEATURES = [
  {
    icon: '♡',
    title: 'Smart BP triage',
    description:
      'Extracts and structures blood pressure data from discharge PDFs, labs, and notes into a single clinical timeline.',
  },
  {
    icon: '℞',
    title: 'AI drug recommendations',
    description:
      'Compares medication options with projected outcomes. Every recommendation requires your confirmation before it reaches the patient.',
  },
  {
    icon: '⚡',
    title: 'Patient check-in bot',
    description:
      'Automated between-visit monitoring that asks patients about readings, symptoms, and adherence — then alerts you when something needs attention.',
  },
]

const STEPS = [
  {
    title: 'Upload a chart',
    description:
      'Drop a discharge PDF or clinical note. Triage parses it into a structured patient profile in seconds.',
  },
  {
    title: 'Review AI-powered options',
    description:
      'See ranked treatment recommendations with projected BP outcomes. Simulate what-if scenarios before deciding.',
  },
  {
    title: 'Confirm and monitor',
    description:
      'Approve a treatment direction and let the check-in bot keep tabs on your patient between visits.',
  },
]
