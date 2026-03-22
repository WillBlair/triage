import { useCallback, useEffect, useMemo, useState } from 'react'
import { DEFAULT_INTAKE_FORM } from './constants/intake'
import { SECTION } from './constants/navigation'
import AddPatientIntake from './components/AddPatientIntake'
import AppSidebar from './components/AppSidebar'
import PatientLibraryDetail from './components/PatientLibraryDetail'
import PatientLibraryPanel from './components/PatientLibraryPanel'
import PlaceholderSection from './components/PlaceholderSection'
import PrescribeSummary from './components/PrescribeSummary'
import RecommendationList from './components/RecommendationList'
import SimulationPanel from './components/SimulationPanel'
import { sortDrugsByModelFitRank } from '../lib/sortRecommendationDrugs.js'
import { getRecommendations, parseDocument, runSimulation } from './services/api'

function ClinicalDisclaimer() {
  return (
    <aside
      aria-label="Prototype disclaimer"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/90 bg-white/92 px-3 py-2 text-center text-[11px] leading-snug text-slate-600 shadow-[0_-4px_24px_rgba(15,23,42,0.06)] backdrop-blur-md sm:px-4 sm:text-xs"
    >
      <span className="font-semibold text-slate-700">Prototype.</span>{' '}
      Illustrative projections for discussion. Not a substitute for clinical judgment or verified dosing.
    </aside>
  )
}

const SECTION_HEADER = {
  [SECTION.ADD_PATIENT]: {
    kicker: 'Intake',
    title: 'Add new patient',
    description:
      'Upload a chart on the left; add encounter context on the right. Continue when the extract looks right.',
  },
  [SECTION.PROFILES]: {
    kicker: 'Records',
    title: 'Patient profiles',
    description:
      'Demo charts focus on hypertension and hypotension. Open one for details, then request AI options. Saved runs would list here once storage exists.',
  },
  [SECTION.RECOMMENDATIONS]: {
    kicker: 'Compare',
    title: 'Drug comparison',
    description: '',
  },
  [SECTION.SIMULATION]: {
    kicker: 'Monitor',
    title: 'Monitoring & follow-up scenario',
    description:
      'Generate an educational multi-week scenario for the selected contrast option, then review projected trends, risks, and follow-up pearls.',
  },
  [SECTION.PRESCRIPTION]: {
    kicker: 'Handoff',
    title: 'Draft handoff text',
    description:
      'Draft text derived from the last monitoring scenario. Use it as a handoff excerpt, then complete any real prescribing workflow elsewhere.',
  },
  [SECTION.FOLLOW_UP]: {
    kicker: 'Care plan',
    title: 'Follow up',
    description: 'Schedule visits, tasks, and reminders in a future release.',
  },
  [SECTION.SETTINGS]: {
    kicker: 'Workspace',
    title: 'Settings',
    description: 'Preferences and integrations will appear here.',
  },
  [SECTION.DOCTOR_PROFILE]: {
    kicker: 'Account',
    title: 'Doctor profile',
    description: 'Your professional details for this workspace.',
  },
}

function App() {
  const [flowStarted, setFlowStarted] = useState(false)
  const [activeSection, setActiveSection] = useState(SECTION.ADD_PATIENT)
  const [fileName, setFileName] = useState('')
  const [profile, setProfile] = useState(null)
  const [recommendations, setRecommendations] = useState(null)
  const [selectedDrug, setSelectedDrug] = useState(null)
  const [simulation, setSimulation] = useState(null)
  const [thinkingText, setThinkingText] = useState('')
  const [error, setError] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false)
  const [isRunningSimulation, setIsRunningSimulation] = useState(false)
  const [intakeForm, setIntakeForm] = useState(() => ({ ...DEFAULT_INTAKE_FORM }))
  const [librarySelectedEntry, setLibrarySelectedEntry] = useState(null)

  const intakeReady = useMemo(
    () => Boolean(profile) && !isParsing && !isLoadingRecommendations,
    [profile, isParsing, isLoadingRecommendations],
  )

  const recReady = useMemo(
    () => Boolean(recommendations?.drugs?.length) && Boolean(selectedDrug),
    [recommendations, selectedDrug],
  )

  const resetWizard = useCallback(() => {
    setActiveSection(SECTION.ADD_PATIENT)
    setFileName('')
    setProfile(null)
    setRecommendations(null)
    setSelectedDrug(null)
    setSimulation(null)
    setError('')
    setIsParsing(false)
    setIsLoadingRecommendations(false)
    setIsRunningSimulation(false)
    setIntakeForm({ ...DEFAULT_INTAKE_FORM })
    setLibrarySelectedEntry(null)
  }, [])

  const returnToLanding = useCallback(() => {
    resetWizard()
    setFlowStarted(false)
  }, [resetWizard])

  useEffect(() => {
    if (activeSection !== SECTION.PROFILES) {
      setLibrarySelectedEntry(null)
    }
  }, [activeSection])

  const openLibraryPatientDetail = useCallback((entry) => {
    setLibrarySelectedEntry(entry)
  }, [])

  const requestRecommendationsFromLibraryPatient = useCallback(async (entry) => {
    if (!entry?.profile) {
      return
    }
    setError('')
    setFileName(entry.chartLabel)
    setProfile(entry.profile)
    setRecommendations(null)
    setSelectedDrug(null)
    setSimulation(null)
    setIsLoadingRecommendations(true)
    try {
      const nextRecommendations = await getRecommendations(entry.profile)
      const sorted = {
        ...nextRecommendations,
        drugs: sortDrugsByModelFitRank(nextRecommendations.drugs ?? []),
      }
      setRecommendations(sorted)
      setSelectedDrug(sorted.drugs[0] || null)
      setLibrarySelectedEntry(null)
      setActiveSection(SECTION.RECOMMENDATIONS)
    } catch (recError) {
      setError(recError instanceof Error ? recError.message : 'Could not load treatment options.')
    } finally {
      setIsLoadingRecommendations(false)
    }
  }, [])

  const handleSelectFile = async (file) => {
    setFileName(file.name)
    setError('')
    setProfile(null)
    setRecommendations(null)
    setSelectedDrug(null)
    setSimulation(null)
    setIsParsing(true)
    setIsLoadingRecommendations(false)

    try {
      const parsedProfile = await parseDocument(file)
      setProfile(parsedProfile)

      setIsLoadingRecommendations(true)
      const nextRecommendations = await getRecommendations(parsedProfile)
      const sorted = {
        ...nextRecommendations,
        drugs: sortDrugsByModelFitRank(nextRecommendations.drugs ?? []),
      }
      setRecommendations(sorted)
      setSelectedDrug(sorted.drugs[0] || null)
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
    setThinkingText('')
    setError('')
    setIsRunningSimulation(true)

    try {
      await runSimulation(profile, selectedDrug, (event) => {
        if (event.type === 'thinking') {
          setThinkingText((prev) => prev + event.chunk)
        }
        if (event.type === 'result') {
          setSimulation(event.simulation)
        }
      })
    } catch (simulationError) {
      setError(
        simulationError instanceof Error
          ? simulationError.message
          : 'Monitoring scenario failed.',
      )
    } finally {
      setIsRunningSimulation(false)
    }
  }

  const sectionMeta = useMemo(() => {
    if (activeSection === SECTION.PROFILES && librarySelectedEntry) {
      return {
        kicker: 'Records',
        title: librarySelectedEntry.profile.patientName || 'Patient details',
        description:
          'Review this chart snapshot. When you are ready, request AI treatment options to compare regimens.',
      }
    }
    return SECTION_HEADER[activeSection]
  }, [activeSection, librarySelectedEntry])

  const beginFlow = useCallback(() => {
    setFlowStarted(true)
    setActiveSection(SECTION.ADD_PATIENT)
  }, [])

  if (!flowStarted) {
    return (
      <div className="min-h-screen pb-14 text-slate-900 sm:pb-12">
        <ClinicalDisclaimer />
        <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-16 sm:px-6 lg:max-w-4xl lg:px-8">
          <header className="text-center sm:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">
              Triage
            </p>
            <h1 className="mt-4 max-w-3xl font-serif text-3xl font-semibold leading-tight tracking-tight text-slate-950 sm:mt-5 sm:text-5xl sm:leading-[1.12]">
              Upload a chart. Compare three regimens side by side.
            </h1>
          </header>
          <div className="mt-10 flex flex-col gap-3 sm:mt-12 sm:flex-row sm:justify-center sm:gap-4 lg:justify-start">
            <button
              type="button"
              onClick={beginFlow}
              className="rounded-2xl bg-teal-600 px-6 py-3.5 text-center text-sm font-semibold text-white shadow-[0_12px_28px_rgba(13,148,136,0.25)] transition hover:bg-teal-500 sm:min-w-[11rem]"
            >
              Get started
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden text-slate-900">
      <ClinicalDisclaimer />
      <div className="flex min-h-0 flex-1 flex-col px-3 pb-11 pt-3 sm:px-5 sm:pb-12 sm:pt-4 lg:px-8">
        <div className="mx-auto flex min-h-0 w-full max-w-[min(100%,86rem)] flex-1 overflow-hidden rounded-[2rem] border border-slate-200/90 bg-white shadow-[0_20px_64px_rgba(15,23,42,0.09),0_0_0_1px_rgba(15,23,42,0.04)] backdrop-blur-md">
            <AppSidebar
              activeSection={activeSection}
              onSelectSection={setActiveSection}
              onLogout={returnToLanding}
            />
            <main className="flex min-h-0 min-w-0 flex-1 flex-col border-l border-slate-200/80 bg-white">
              <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-4 py-4 sm:px-6 sm:py-5 lg:pl-10 lg:pr-12">
          {error ? (
            <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          ) : null}

          <article className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-50/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
            <div
              className={`border-b border-slate-100 bg-linear-to-r from-teal-50/40 via-white to-slate-50/50 px-6 sm:px-8 ${
                activeSection === SECTION.RECOMMENDATIONS || activeSection === SECTION.PROFILES
                  ? 'py-4 sm:py-4'
                  : 'py-6 sm:py-6'
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
                {sectionMeta.kicker}
              </p>
              <div
                className={
                  activeSection === SECTION.ADD_PATIENT
                    ? 'mt-2 flex flex-col gap-4 sm:mt-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6'
                    : 'mt-2'
                }
              >
                <div className="min-w-0 flex-1">
                  <h2
                    className={`font-serif font-semibold text-slate-950 ${
                      activeSection === SECTION.RECOMMENDATIONS || activeSection === SECTION.PROFILES
                        ? 'text-xl sm:text-2xl'
                        : 'text-2xl sm:text-3xl'
                    }`}
                  >
                    {sectionMeta.title}
                  </h2>
                  {sectionMeta.description ? (
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                      {sectionMeta.description}
                    </p>
                  ) : null}
                </div>
                {activeSection === SECTION.ADD_PATIENT ? (
                  <button
                    type="button"
                    disabled={!intakeReady}
                    onClick={() => setActiveSection(SECTION.RECOMMENDATIONS)}
                    className="w-full shrink-0 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(13,148,136,0.25)] transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-40 sm:mt-1 sm:w-auto sm:self-start"
                  >
                    Continue to comparison
                  </button>
                ) : null}
              </div>
            </div>

            <div
              className={`min-h-0 flex-1 sm:px-8 ${
                activeSection === SECTION.RECOMMENDATIONS
                  ? 'flex flex-col overflow-y-auto overscroll-contain px-6 py-3 sm:py-4'
                  : activeSection === SECTION.PROFILES
                    ? 'flex min-h-0 flex-col overflow-y-auto overscroll-contain px-6 py-3 sm:py-4'
                    : 'overflow-y-auto overscroll-contain px-6 py-5 sm:py-6'
              }`}
            >
              {activeSection === SECTION.ADD_PATIENT ? (
                <AddPatientIntake
                  intakeForm={intakeForm}
                  onIntakeChange={setIntakeForm}
                  fileName={fileName}
                  profile={profile}
                  isParsing={isParsing}
                  isLoadingRecommendations={isLoadingRecommendations}
                  onSelectFile={handleSelectFile}
                  error=""
                />
              ) : null}

              {activeSection === SECTION.PROFILES && librarySelectedEntry ? (
                <PatientLibraryDetail
                  entry={librarySelectedEntry}
                  onBack={() => setLibrarySelectedEntry(null)}
                  onRequestRecommendations={() =>
                    requestRecommendationsFromLibraryPatient(librarySelectedEntry)
                  }
                  isLoadingRecommendations={isLoadingRecommendations}
                />
              ) : null}

              {activeSection === SECTION.PROFILES && !librarySelectedEntry ? (
                <PatientLibraryPanel onOpenPatientDetail={openLibraryPatientDetail} />
              ) : null}

              {activeSection === SECTION.RECOMMENDATIONS ? (
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
              ) : null}

              {activeSection === SECTION.SIMULATION ? (
                <SimulationPanel
                  embedded
                  selectedDrug={selectedDrug}
                  simulation={simulation}
                  isRunning={isRunningSimulation}
                  thinkingText={thinkingText}
                  onRun={handleRunSimulation}
                />
              ) : null}

              {activeSection === SECTION.PRESCRIPTION ? (
                simulation && selectedDrug ? (
                  <PrescribeSummary
                    profile={profile}
                    selectedDrug={selectedDrug}
                    simulation={simulation}
                  />
                ) : (
                  <PlaceholderSection title="Run a monitoring scenario first">
                    <p>
                      The <strong className="font-semibold text-slate-800">Draft handoff</strong>{' '}
                      screen shows a compact version of your last eight-week scenario so you can
                      paste draft text for a pharmacist or other recipient and pair it with your
                      usual sign-off process.
                    </p>
                    <p className="mt-3 text-slate-500">
                      {!selectedDrug
                        ? 'Choose a regimen under Drug comparison, then open Monitoring & follow-up.'
                        : 'Open Monitoring & follow-up and run the scenario, then return here or use Continue to handoff from that screen.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveSection(SECTION.SIMULATION)}
                      className="mt-5 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(13,148,136,0.25)] transition hover:bg-teal-500"
                    >
                      Go to monitoring
                    </button>
                  </PlaceholderSection>
                )
              ) : null}

              {activeSection === SECTION.FOLLOW_UP ? (
                <PlaceholderSection>
                  Follow-up scheduling, tasks, and patient messaging will live here in a future version.
                </PlaceholderSection>
              ) : null}

              {activeSection === SECTION.SETTINGS ? (
                <PlaceholderSection>
                  <p>Workspace preferences, API keys, and integrations will be configurable here.</p>
                  <ul className="mt-4 list-inside list-disc space-y-1 text-slate-500">
                    <li>Theme and density</li>
                    <li>Data retention policy</li>
                    <li>Connected EHR (not available in this build)</li>
                  </ul>
                </PlaceholderSection>
              ) : null}

              {activeSection === SECTION.DOCTOR_PROFILE ? (
                <PlaceholderSection>
                  <p>
                    Your display name, specialty, and NPI can be shown on generated summaries when this
                    section is connected to an account backend.
                  </p>
                  <dl className="mt-6 grid gap-4 border-t border-slate-200/80 pt-6 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Display name
                      </dt>
                      <dd className="mt-1 text-slate-500">—</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Specialty
                      </dt>
                      <dd className="mt-1 text-slate-500">—</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">NPI</dt>
                      <dd className="mt-1 text-slate-500">—</dd>
                    </div>
                  </dl>
                </PlaceholderSection>
              ) : null}
            </div>

            <footer className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <div className="text-xs text-slate-500">
                {activeSection === SECTION.ADD_PATIENT && !intakeReady && isParsing ? (
                  <span>Parsing PDF — structured summary loads in the panel above.</span>
                ) : null}
                {activeSection === SECTION.ADD_PATIENT && !intakeReady && !isParsing && isLoadingRecommendations ? (
                  <span>
                    Comparison rows generating — continue when the button above enables (summary is already visible).
                  </span>
                ) : null}
                {activeSection === SECTION.ADD_PATIENT && intakeReady ? (
                  <span>Chart summary and comparison rows are ready. Continue when the snapshot looks right.</span>
                ) : null}
                {activeSection === SECTION.RECOMMENDATIONS && isLoadingRecommendations ? (
                  <span>Loading treatment contrast…</span>
                ) : null}
                {activeSection === SECTION.RECOMMENDATIONS &&
                !isLoadingRecommendations &&
                !recommendations?.drugs?.length ? (
                  <span>Upload a chart under Add new patient to generate a treatment contrast.</span>
                ) : null}
                {activeSection === SECTION.RECOMMENDATIONS &&
                !isLoadingRecommendations &&
                Boolean(recommendations?.drugs?.length) ? (
                  <span>
                    Selected contrast:{' '}
                    <span className="font-semibold text-slate-700">{selectedDrug?.name || '—'}</span>
                  </span>
                ) : null}
                {activeSection === SECTION.SIMULATION && !selectedDrug ? (
                  <span>Choose a regimen under Drug comparison first.</span>
                ) : null}
                {activeSection === SECTION.SIMULATION && selectedDrug && !simulation ? (
                  <span>Run the monitoring scenario when you are ready to discuss projected follow-up.</span>
                ) : null}
                {activeSection === SECTION.SIMULATION && selectedDrug && simulation ? (
                  <span>Scenario complete. Continue to Draft handoff for editable text.</span>
                ) : null}
                {activeSection === SECTION.PRESCRIPTION && simulation && selectedDrug ? (
                  <span>Draft handoff text is based on the selected regimen and the last monitoring scenario.</span>
                ) : null}
                {activeSection === SECTION.PRESCRIPTION && (!simulation || !selectedDrug) ? (
                  <span>Complete a monitoring scenario to populate this draft.</span>
                ) : null}
                {activeSection === SECTION.PROFILES && librarySelectedEntry ? (
                  <span>
                    Review the snapshot, then use <strong className="font-semibold text-slate-600">Get AI treatment options</strong>{' '}
                    to generate regimen comparisons.
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {activeSection === SECTION.RECOMMENDATIONS ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveSection(SECTION.ADD_PATIENT)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={!recReady}
                      onClick={() => setActiveSection(SECTION.SIMULATION)}
                      className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(13,148,136,0.25)] transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Continue to monitoring
                    </button>
                  </>
                ) : null}
                {activeSection === SECTION.SIMULATION ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveSection(SECTION.RECOMMENDATIONS)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      Back
                    </button>
                    {simulation ? (
                      <>
                        <button
                          type="button"
                          onClick={resetWizard}
                          className="rounded-xl border border-teal-200 bg-teal-50/80 px-4 py-2.5 text-sm font-semibold text-teal-900 transition hover:bg-teal-100"
                        >
                          Start over
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveSection(SECTION.PRESCRIPTION)}
                          className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(13,148,136,0.25)] transition hover:bg-teal-500"
                        >
                          Continue to handoff
                        </button>
                      </>
                    ) : null}
                  </>
                ) : null}
                {activeSection === SECTION.PRESCRIPTION ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveSection(SECTION.SIMULATION)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      Back to monitoring
                    </button>
                  </>
                ) : null}
              </div>
            </footer>
          </article>
              </div>
            </main>
        </div>
      </div>
    </div>
  )
}

export default App
