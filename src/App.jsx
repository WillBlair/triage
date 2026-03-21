import { useCallback, useMemo, useState } from 'react'
import ProfileCard from './components/ProfileCard'
import RecommendationList from './components/RecommendationList'
import SimulationPanel from './components/SimulationPanel'
import { getRecommendations, parseDocument, runSimulation } from './services/api'

const STEPS = [
  {
    id: 1,
    short: 'Intake',
    title: 'Upload the chart',
    description:
      'One PDF becomes a structured profile. Parsing runs first; recommendations load in the background so you can move on when you are ready.',
  },
  {
    id: 2,
    short: 'Decide',
    title: 'Pick a treatment direction',
    description:
      'Review ranked options with reasoning, choose the line you want to simulate, then advance to the timeline.',
  },
  {
    id: 3,
    short: 'Simulate',
    title: 'Run the what-if',
    description:
      'Generate the eight-week projection first, then read risks and clinical pearls underneath.',
  },
]

function Stepper({ step, unlockedStep, onStepChange }) {
  return (
    <nav aria-label="Progress">
      <ol className="flex items-center gap-0">
        {STEPS.map((s, index) => {
          const isDone = step > s.id
          const isCurrent = step === s.id
          const isReachable = s.id <= unlockedStep
          const showConnector = index < STEPS.length - 1

          return (
            <li key={s.id} className="flex flex-1 items-center min-w-0">
              <button
                type="button"
                disabled={!isReachable}
                onClick={() => isReachable && onStepChange(s.id)}
                className={`group flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition sm:max-w-none ${
                  isCurrent
                    ? 'border-teal-300 bg-teal-50/90 shadow-sm ring-1 ring-teal-200/60'
                    : isDone
                      ? 'border-slate-200/80 bg-white hover:border-teal-200'
                      : 'border-slate-200/60 bg-slate-50/80 opacity-60'
                } ${!isReachable ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums ${
                    isDone
                      ? 'bg-emerald-500 text-white'
                      : isCurrent
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isDone ? '✓' : s.id}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Step {s.id}
                  </span>
                  <span className="block truncate text-sm font-semibold text-slate-900">
                    {s.short}
                  </span>
                </span>
              </button>
              {showConnector && (
                <div
                  className={`mx-1 hidden h-px w-6 shrink-0 sm:block ${
                    step > s.id ? 'bg-teal-300' : 'bg-slate-200'
                  }`}
                  aria-hidden
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function App() {
  const [wizardStep, setWizardStep] = useState(1)
  const [fileName, setFileName] = useState('')
  const [profile, setProfile] = useState(null)
  const [recommendations, setRecommendations] = useState(null)
  const [selectedDrug, setSelectedDrug] = useState(null)
  const [simulation, setSimulation] = useState(null)
  const [error, setError] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false)
  const [isRunningSimulation, setIsRunningSimulation] = useState(false)

  const unlockedStep = useMemo(() => {
    if (!profile) {
      return 1
    }
    if (!recommendations || !selectedDrug) {
      return 2
    }
    return 3
  }, [profile, recommendations, selectedDrug])

  const stepReady = useMemo(
    () => ({
      1: Boolean(profile) && !isParsing && !isLoadingRecommendations,
      2: Boolean(recommendations?.drugs?.length) && Boolean(selectedDrug),
      3: true,
    }),
    [profile, isParsing, isLoadingRecommendations, recommendations, selectedDrug],
  )

  const goToStep = useCallback(
    (next) => {
      if (next < 1 || next > 3) {
        return
      }
      if (next <= unlockedStep) {
        setWizardStep(next)
      }
    },
    [unlockedStep],
  )

  const handleSelectFile = async (file) => {
    setFileName(file.name)
    setError('')
    setProfile(null)
    setRecommendations(null)
    setSelectedDrug(null)
    setSimulation(null)
    setWizardStep(1)
    setIsParsing(true)
    setIsLoadingRecommendations(false)

    try {
      const parsedProfile = await parseDocument(file)
      setProfile(parsedProfile)

      setIsLoadingRecommendations(true)
      const nextRecommendations = await getRecommendations(parsedProfile)
      setRecommendations(nextRecommendations)
      setSelectedDrug(nextRecommendations.drugs[0] || null)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed.')
    } finally {
      setIsParsing(false)
      setIsLoadingRecommendations(false)
    }
  }

  const handleRunSimulation = async () => {
    if (!profile || !selectedDrug) {
      return
    }

    setSimulation(null)
    setError('')
    setIsRunningSimulation(true)

    try {
      await runSimulation(profile, selectedDrug, (event) => {
        if (event.type === 'result') {
          setSimulation(event.simulation)
        }
      })
    } catch (simulationError) {
      setError(
        simulationError instanceof Error
          ? simulationError.message
          : 'Simulation failed.',
      )
    } finally {
      setIsRunningSimulation(false)
    }
  }

  const currentMeta = STEPS[wizardStep - 1]

  return (
    <div className="min-h-screen text-slate-900">
      <main className="mx-auto max-w-3xl px-4 py-10 pb-24 sm:px-6 lg:max-w-4xl lg:px-8">
        <header className="mb-10 text-center sm:mb-12 sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">
            Triage
          </p>
          <h1 className="mt-3 max-w-3xl font-serif text-3xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl sm:leading-[1.12]">
            Turn a clinic PDF into treatment options you can compare
            <span className="text-teal-700"> — and a week-by-week picture of what might happen next.</span>
          </h1>
        </header>

        <Stepper step={wizardStep} unlockedStep={unlockedStep} onStepChange={goToStep} />

        {error && (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}

        <article className="mt-8 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/95 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <div className="border-b border-slate-100 bg-linear-to-r from-teal-50/40 via-white to-slate-50/50 px-6 py-6 sm:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
              Step {wizardStep} of 3
            </p>
            <h2 className="mt-2 font-serif text-2xl font-semibold text-slate-950 sm:text-3xl">
              {currentMeta.title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              {currentMeta.description}
            </p>
          </div>

          <div className="px-6 py-6 sm:px-8 sm:py-8">
            {wizardStep === 1 && (
              <ProfileCard
                embedded
                fileName={fileName}
                profile={profile}
                isParsing={isParsing}
                isLoadingRecommendations={isLoadingRecommendations}
                onSelectFile={handleSelectFile}
                error=""
              />
            )}

            {wizardStep === 2 && (
              <RecommendationList
                embedded
                recommendations={recommendations}
                selectedDrugName={selectedDrug?.name || ''}
                isLoading={isLoadingRecommendations}
                onSelect={(drug) => {
                  setSelectedDrug(drug)
                  setSimulation(null)
                }}
              />
            )}

            {wizardStep === 3 && (
              <SimulationPanel
                embedded
                selectedDrug={selectedDrug}
                simulation={simulation}
                isRunning={isRunningSimulation}
                onRun={handleRunSimulation}
              />
            )}
          </div>

          <footer className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div className="text-xs text-slate-500">
              {wizardStep === 1 && !stepReady[1] && isParsing && (
                <span>Parsing PDF — structured summary loads in the panel above.</span>
              )}
              {wizardStep === 1 && !stepReady[1] && !isParsing && isLoadingRecommendations && (
                <span>Options generating — continue once the footer enables (summary is already visible).</span>
              )}
              {wizardStep === 1 && stepReady[1] && (
                <span>Chart summary and options are ready. Continue when the snapshot looks right.</span>
              )}
              {wizardStep === 2 && !stepReady[2] && <span>Loading treatment options…</span>}
              {wizardStep === 2 && stepReady[2] && (
                <span>
                  Selected:{' '}
                  <span className="font-semibold text-slate-700">{selectedDrug?.name}</span>
                </span>
              )}
              {wizardStep === 3 && (
                <span>
                  Run the simulation when you are narrating the &quot;wow&quot; moment.
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {wizardStep > 1 && (
                <button
                  type="button"
                  onClick={() => goToStep(wizardStep - 1)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Back
                </button>
              )}
              {wizardStep === 1 && (
                <button
                  type="button"
                  disabled={!stepReady[1]}
                  onClick={() => goToStep(2)}
                  className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(13,148,136,0.25)] transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Continue to options
                </button>
              )}
              {wizardStep === 2 && (
                <button
                  type="button"
                  disabled={!stepReady[2]}
                  onClick={() => goToStep(3)}
                  className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(13,148,136,0.25)] transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Continue to simulation
                </button>
              )}
              {wizardStep === 3 && simulation && (
                <button
                  type="button"
                  onClick={() => {
                    setWizardStep(1)
                    setFileName('')
                    setProfile(null)
                    setRecommendations(null)
                    setSelectedDrug(null)
                    setSimulation(null)
                    setError('')
                  }}
                  className="rounded-xl border border-teal-200 bg-teal-50/80 px-4 py-2.5 text-sm font-semibold text-teal-900 transition hover:bg-teal-100"
                >
                  Start over
                </button>
              )}
            </div>
          </footer>
        </article>
      </main>
    </div>
  )
}

export default App
