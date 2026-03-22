import { useCallback, useEffect, useMemo, useState } from 'react'
import AddPatientIntake, { DEFAULT_INTAKE_FORM } from './components/AddPatientIntake'
import AppSidebar, { SECTION } from './components/AppSidebar'
import AuthPage, { AUTH_MODE } from './components/AuthPage'
import LandingPage from './components/LandingPage'
import Onboarding from './components/Onboarding'
import PatientProfile from './components/PatientProfile'
import DoctorProfilePanel from './components/DoctorProfilePanel'
import PlaceholderSection from './components/PlaceholderSection'
import RecommendationList from './components/RecommendationList'
import SimulationPanel from './components/SimulationPanel'
import { getRecommendations, parseDocument, runSimulation } from './services/api'
import { supabase } from './services/supabase'

function ClinicalDisclaimer() {
  return (
    <aside
      aria-label="Prototype disclaimer"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/90 bg-white/92 px-3 py-2 text-center text-[11px] leading-snug text-slate-600 shadow-[0_-4px_24px_rgba(15,23,42,0.06)] backdrop-blur-md sm:px-4 sm:text-xs"
    >
      <span className="font-semibold text-slate-700">Prototype.</span>{' '}
      Illustrative / not clinically validated / not a substitute for professional care.
    </aside>
  )
}

const SECTION_HEADER = {
  [SECTION.ADD_PATIENT]: {
    kicker: 'Intake',
    title: 'Add new patient',
    description:
      'Create a draft profile, send a patient intake, then upload and merge a chart.',
  },
  [SECTION.PROFILES]: {
    kicker: 'Records',
    title: 'Patient profiles',
    description: '',
  },
  [SECTION.RECOMMENDATIONS]: {
    kicker: 'Decide',
    title: 'Pick a treatment direction',
    description: '',
  },
  [SECTION.SIMULATION]: {
    kicker: 'Simulate',
    title: 'Run the what-if',
    description:
      'Generate the eight-week projection first, then read risks and clinical pearls underneath.',
  },
  [SECTION.PRESCRIPTION]: {
    kicker: 'Prescribe',
    title: 'Prescription',
    description: 'Draft and document orders in a future release.',
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

const VIEW = { LOADING: 'loading', LANDING: 'landing', AUTH: 'auth', EMAIL_CONFIRMED: 'email-confirmed', WORKSPACE: 'workspace' }

function App() {
  const [view, setView] = useState(VIEW.LOADING)
  const [authMode, setAuthMode] = useState(AUTH_MODE.SIGN_IN)
  const [activeSection, setActiveSection] = useState(SECTION.ADD_PATIENT)
  const [fileName, setFileName] = useState('')
  const [profile, setProfile] = useState(null)
  const [recommendations, setRecommendations] = useState(null)
  const [selectedDrug, setSelectedDrug] = useState(null)
  const [simulation, setSimulation] = useState(null)
  const [error, setError] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false)
  const [isRunningSimulation, setIsRunningSimulation] = useState(false)
  const [intakeForm, setIntakeForm] = useState(() => ({ ...DEFAULT_INTAKE_FORM }))
  const [onboardingComplete, setOnboardingComplete] = useState(() => {
    try { return localStorage.getItem('triage_onboarded') === 'true' } catch { return false }
  })
  const [doctorProfile, setDoctorProfile] = useState(() => {
    try { const s = localStorage.getItem('triage_doctor'); return s ? JSON.parse(s) : null } catch { return null }
  })
  const [workspaceName, setWorkspaceName] = useState(() => {
    try { return localStorage.getItem('triage_workspace') || '' } catch { return '' }
  })

  // When a different user signs in, reset onboarding so they get their own experience
  const syncUserData = useCallback((session) => {
    if (!session) return
    try {
      const storedUserId = localStorage.getItem('triage_user_id')
      if (storedUserId !== session.user.id) {
        // Different user (or first ever login) — clear previous user's onboarding data
        localStorage.removeItem('triage_onboarded')
        localStorage.removeItem('triage_doctor')
        localStorage.removeItem('triage_workspace')
        localStorage.setItem('triage_user_id', session.user.id)
        setOnboardingComplete(false)
        setDoctorProfile(null)
        setWorkspaceName('')
      }
    } catch { /* storage unavailable */ }
  }, [])

  // Resolve initial view: check for existing session before rendering anything
  useEffect(() => {
    // Check if this is an email confirmation redirect (Supabase puts tokens in the URL hash)
    const hash = window.location.hash
    const isEmailConfirmation =
      hash.includes('type=signup') || hash.includes('type=email')

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isEmailConfirmation) {
        // User clicked the confirmation link — sign them out so they must log in explicitly
        supabase.auth.signOut()
        setView(VIEW.EMAIL_CONFIRMED)
      } else if (session) {
        syncUserData(session)
        setView(VIEW.WORKSPACE)
      } else {
        setView(VIEW.LANDING)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Ignore the session created by email confirmation — we handle that above
      if (event === 'SIGNED_IN' && session && view !== VIEW.EMAIL_CONFIRMED) {
        syncUserData(session)
        setView(VIEW.WORKSPACE)
        setActiveSection(SECTION.ADD_PATIENT)
      }
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [])

  const returnToLanding = useCallback(async () => {
    await supabase.auth.signOut()
    resetWizard()
    setView(VIEW.LANDING)
  }, [resetWizard])

  const handleUpdateDoctorProfile = useCallback((updated) => {
    setDoctorProfile(updated)
    try {
      localStorage.setItem('triage_doctor', JSON.stringify(updated))
    } catch { /* storage unavailable */ }
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

  const sectionMeta = SECTION_HEADER[activeSection]

  const beginFlow = useCallback(() => {
    setView(VIEW.WORKSPACE)
    setActiveSection(SECTION.ADD_PATIENT)
  }, [])

  if (view === VIEW.LOADING) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-teal-700">
            Triage
          </p>
          <p className="mt-2 text-sm text-slate-400">Loading&hellip;</p>
        </div>
      </div>
    )
  }

  if (view === VIEW.LANDING) {
    return (
      <>
        <ClinicalDisclaimer />
        <LandingPage onGetStarted={() => { setAuthMode(AUTH_MODE.SIGN_UP); setView(VIEW.AUTH) }} onLogin={() => { setAuthMode(AUTH_MODE.SIGN_IN); setView(VIEW.AUTH) }} />
      </>
    )
  }

  if (view === VIEW.EMAIL_CONFIRMED) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <ClinicalDisclaimer />
        <div className="w-full max-w-md rounded-[1.75rem] border border-slate-200/90 bg-white p-8 text-center shadow-[0_20px_64px_rgba(15,23,42,0.09),0_0_0_1px_rgba(15,23,42,0.04)] sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">Triage</p>
          <div className="mx-auto mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="mt-4 font-serif text-2xl font-semibold text-slate-950">Email confirmed</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Your email has been verified. You can now sign in to your account.
          </p>
          <button
            type="button"
            onClick={() => setView(VIEW.AUTH)}
            className="mt-6 w-full rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(13,148,136,0.25)] transition hover:bg-teal-500"
          >
            Go to sign in
          </button>
        </div>
      </div>
    )
  }

  if (view === VIEW.AUTH) {
    return (
      <>
        <ClinicalDisclaimer />
        <AuthPage
          initialMode={authMode}
          onAuthenticated={beginFlow}
          onBack={() => setView(VIEW.LANDING)}
        />
      </>
    )
  }

  if (!onboardingComplete) {
    return (
      <>
        <ClinicalDisclaimer />
        <Onboarding
          onFinish={({ doctorProfile: dp, workspace: ws }) => {
            setDoctorProfile(dp)
            setWorkspaceName(ws.workspaceName)
            setOnboardingComplete(true)
            setActiveSection(SECTION.ADD_PATIENT)
            try {
              localStorage.setItem('triage_onboarded', 'true')
              localStorage.setItem('triage_doctor', JSON.stringify(dp))
              localStorage.setItem('triage_workspace', ws.workspaceName)
            } catch { /* storage unavailable */ }
          }}
        />
      </>
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
              doctorProfile={doctorProfile}
              workspaceName={workspaceName}
            />
            <main className="flex min-h-0 min-w-0 flex-1 flex-col border-l border-slate-200/80 bg-white">
              <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-4 py-4 sm:px-6 sm:py-5 lg:pl-10 lg:pr-12">
          {error ? (
            <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          ) : null}

          <article className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-50/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
            <div className="border-b border-slate-100 bg-linear-to-r from-teal-50/40 via-white to-slate-50/50 px-6 py-6 sm:px-8">
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
                  <h2 className="font-serif text-2xl font-semibold text-slate-950 sm:text-3xl">
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
                    Continue to options
                  </button>
                ) : null}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 sm:px-8 sm:py-6">
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

              {activeSection === SECTION.PROFILES ? (
                <PatientProfile
                  onBack={() => setActiveSection(SECTION.ADD_PATIENT)}
                />
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
                  onRun={handleRunSimulation}
                />
              ) : null}

              {activeSection === SECTION.PRESCRIPTION ? (
                <PlaceholderSection>
                  E-prescribing and order sets are not wired up in this prototype. Use your standard
                  prescribing workflow alongside the recommendations from this tool.
                </PlaceholderSection>
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
                <DoctorProfilePanel
                  doctorProfile={doctorProfile}
                  workspaceName={workspaceName}
                  onUpdateProfile={handleUpdateDoctorProfile}
                />
              ) : null}
            </div>

            <footer className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <div className="text-xs text-slate-500">
                {activeSection === SECTION.ADD_PATIENT && !intakeReady && isParsing ? (
                  <span>Parsing PDF — structured summary loads in the chart step.</span>
                ) : null}
                {activeSection === SECTION.ADD_PATIENT && !intakeReady && !isParsing && isLoadingRecommendations ? (
                  <span>
                    Options generating — continue when the button enables.
                  </span>
                ) : null}
                {activeSection === SECTION.ADD_PATIENT && intakeReady ? (
                  <span>Chart merged and options ready. Continue to recommendations.</span>
                ) : null}
                {activeSection === SECTION.ADD_PATIENT && !intakeReady && !isParsing && !isLoadingRecommendations ? (
                  <span>Follow the stepper: create a draft, send intake, then upload a chart.</span>
                ) : null}
                {activeSection === SECTION.RECOMMENDATIONS && isLoadingRecommendations ? (
                  <span>Loading treatment options…</span>
                ) : null}
                {activeSection === SECTION.RECOMMENDATIONS &&
                !isLoadingRecommendations &&
                !recommendations?.drugs?.length ? (
                  <span>Upload a chart under Add new patient to generate options.</span>
                ) : null}
                {activeSection === SECTION.RECOMMENDATIONS &&
                !isLoadingRecommendations &&
                Boolean(recommendations?.drugs?.length) ? (
                  <span>
                    Selected:{' '}
                    <span className="font-semibold text-slate-700">{selectedDrug?.name || '—'}</span>
                  </span>
                ) : null}
                {activeSection === SECTION.SIMULATION && !selectedDrug ? (
                  <span>Choose a regimen under Drug recommendation first.</span>
                ) : null}
                {activeSection === SECTION.SIMULATION && selectedDrug ? (
                  <span>Run the simulation when you are narrating the &quot;wow&quot; moment.</span>
                ) : null}
                {activeSection === SECTION.PROFILES ||
                activeSection === SECTION.PRESCRIPTION ||
                activeSection === SECTION.FOLLOW_UP ||
                activeSection === SECTION.SETTINGS ||
                activeSection === SECTION.DOCTOR_PROFILE ? (
                  <span>This area is a scaffold for upcoming workflow.</span>
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
                      Continue to simulation
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
                      <button
                        type="button"
                        onClick={resetWizard}
                        className="rounded-xl border border-teal-200 bg-teal-50/80 px-4 py-2.5 text-sm font-semibold text-teal-900 transition hover:bg-teal-100"
                      >
                        Start over
                      </button>
                    ) : null}
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
