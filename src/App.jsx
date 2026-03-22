import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SECTION } from './constants/navigation'
import AddPatientIntake from './components/AddPatientIntake'
import AppSidebar from './components/AppSidebar'
import PatientLibraryDetail from './components/PatientLibraryDetail'
import PatientLibraryPanel from './components/PatientLibraryPanel'
import AuthPage, { AUTH_MODE } from './components/AuthPage'
import LandingPage from './components/LandingPage'
import Onboarding from './components/Onboarding'
import DoctorProfilePanel from './components/DoctorProfilePanel'
import PlaceholderSection from './components/PlaceholderSection'
import FollowUpDashboard from './components/FollowUpDashboard'
import SettingsPanel from './components/SettingsPanel'
import PrescribeSummary from './components/PrescribeSummary'
import ErrorBoundary from './components/ErrorBoundary'
import RecommendationList from './components/RecommendationList'
import SimulationPanel from './components/SimulationPanel'
import ProgressStepper from './components/ProgressStepper'
import { sortDrugsByModelFitRank } from '../lib/sortRecommendationDrugs.js'
import { getRecommendations, parseDocument, runSimulation, savePrescription } from './services/api'
import { supabase, fetchDoctorProfile, upsertDoctorProfile } from './services/supabase'

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
    description: '',
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
    title: 'Monitoring scenario',
    description:
      'Generate an educational multi-week scenario for the selected contrast option and review the projected trajectory in the chart.',
  },
  [SECTION.PRESCRIPTION]: {
    kicker: 'Handoff',
    title: 'Draft handoff text',
    description: '',
  },
  [SECTION.FOLLOW_UP]: {
    kicker: 'Care plan',
    title: 'Follow up',
    description: 'Check-in status and real-time patient responses.',
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
  const [activeSection, setActiveSectionRaw] = useState(() => {
    const saved = sessionStorage.getItem('triage_active_section')
    return saved && Object.values(SECTION).includes(saved) ? saved : SECTION.ADD_PATIENT
  })
  const setActiveSection = useCallback((section) => {
    setActiveSectionRaw(section)
    sessionStorage.setItem('triage_active_section', section)
  }, [])
  const [fileName, setFileName] = useState('')
  const [profile, setProfile] = useState(null)
  const [recommendations, setRecommendations] = useState(null)
  const [selectedDrug, setSelectedDrug] = useState(null)
  const [simulation, setSimulation] = useState(null)
  const [error, setError] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false)
  const [isRunningSimulation, setIsRunningSimulation] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [librarySelectedEntry, setLibrarySelectedEntry] = useState(null)
  const [onboardingComplete, setOnboardingComplete] = useState(false)
  const [doctorProfile, setDoctorProfile] = useState(null)
  const [workspaceName, setWorkspaceName] = useState('')
  const [currentUserId, setCurrentUserId] = useState(null)
  const [doctorEmail, setDoctorEmail] = useState('')
  const hasSignedIn = useRef(false)

  // When a user signs in, load their profile from Supabase
  const syncUserData = useCallback(async (session) => {
    if (!session) return
    const userId = session.user.id
    setCurrentUserId(userId)
    setDoctorEmail(session.user.email || '')
    try {
      const saved = await fetchDoctorProfile(userId)
      if (saved) {
        setDoctorProfile(saved.doctorProfile)
        setWorkspaceName(saved.workspaceName)
        setOnboardingComplete(saved.onboarded)
      } else {
        setDoctorProfile(null)
        setWorkspaceName('')
        setOnboardingComplete(false)
      }
    } catch (err) {
      console.error('Failed to load doctor profile:', err)
      // Treat as new user so the app doesn't get stuck
      setOnboardingComplete(false)
    }
  }, [])

  // Resolve initial view: check for existing session before rendering anything
  useEffect(() => {
    // Check if this is an email confirmation redirect (Supabase puts tokens in the URL hash)
    const hash = window.location.hash
    const isEmailConfirmation =
      hash.includes('type=signup') || hash.includes('type=email')

    // If this is an email confirmation, block onAuthStateChange from racing
    // by marking hasSignedIn immediately. We'll reset it after signOut.
    if (isEmailConfirmation) {
      hasSignedIn.current = true
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (isEmailConfirmation) {
        await supabase.auth.signOut()
        // Clear the hash so the next sign-in isn't mistaken for confirmation
        window.history.replaceState(null, '', window.location.pathname)
        // Reset so the real sign-in via onAuthStateChange will work
        hasSignedIn.current = false
        setView(VIEW.EMAIL_CONFIRMED)
      } else if (session) {
        hasSignedIn.current = true
        try {
          await syncUserData(session)
        } catch {
          // Profile fetch failed — still let user through
        }
        setView(VIEW.WORKSPACE)
      } else {
        setView(VIEW.LANDING)
      }
    })

    // Listen for sign-out events only (e.g. session expired, signed out in another tab).
    // SIGNED_IN is handled by getSession (page load) and beginFlow (explicit sign-in),
    // NOT here — onAuthStateChange fires across all tabs and causes cross-tab races
    // (e.g. email confirmation in another tab would hijack this tab to onboarding).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        hasSignedIn.current = false
        setView(VIEW.LANDING)
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
    setIsConfirmed(false)
    setIsParsing(false)
    setIsLoadingRecommendations(false)
    setIsRunningSimulation(false)
    setLibrarySelectedEntry(null)
  }, [])

  const returnToLanding = useCallback(async () => {
    await supabase.auth.signOut()
    hasSignedIn.current = false
    sessionStorage.removeItem('triage_active_section')
    resetWizard()
    setView(VIEW.LANDING)
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

  const handleUpdateDoctorProfile = useCallback((updated) => {
    setDoctorProfile(updated)
    if (currentUserId) {
      upsertDoctorProfile(currentUserId, {
        doctorProfile: updated,
        workspaceName,
        onboarded: true,
      })
    }
  }, [currentUserId, workspaceName])

  // No-op: patients are now saved directly to Supabase from AddPatientIntake
  const handleMergePatient = useCallback(() => {}, [])

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
          : 'Monitoring scenario failed.',
      )
    } finally {
      setIsRunningSimulation(false)
    }
  }

  const handleConfirmPrescription = async (pharmacy) => {
    setIsConfirming(true)
    try {
      await savePrescription({
        doctorId: currentUserId,
        patientProfile: profile,
        selectedDrug,
        allRecommendations: recommendations,
        simulation,
      })
    } catch (err) {
      console.warn('Prescription save failed (demo continues):', err)
    } finally {
      // Always mark confirmed for the demo — even if Supabase table doesn't exist
      setIsConfirmed(true)
      setIsConfirming(false)
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
    
    const meta = { ...SECTION_HEADER[activeSection] }
    if (activeSection === SECTION.SIMULATION && profile?.patientName) {
      const firstName = profile.patientName.split(' ')[0]
      meta.title = `Projected outlook for ${firstName}`
      meta.description = `Generate a customized multi-week predictive scenario detailing exactly how ${firstName} will respond to the selected regimen.`
    }
    
    return meta
  }, [activeSection, librarySelectedEntry, profile])

  const beginFlow = useCallback(async () => {
    setView(VIEW.LOADING)
    // Read the session directly — don't rely on onAuthStateChange which
    // can fire across tabs and cause race conditions.
    const { data: { session } } = await supabase.auth.getSession()
    if (session && !hasSignedIn.current) {
      hasSignedIn.current = true
      try {
        await syncUserData(session)
      } catch {
        // Profile fetch failed — still let user through
      }
      setView(VIEW.WORKSPACE)
    }
  }, [syncUserData])

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
            if (currentUserId) {
              upsertDoctorProfile(currentUserId, {
                doctorProfile: dp,
                workspaceName: ws.workspaceName,
                onboarded: true,
              })
            }
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
          <ProgressStepper activeSection={activeSection} />

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
              <ErrorBoundary>
              {activeSection === SECTION.ADD_PATIENT ? (
                <AddPatientIntake
                  fileName={fileName}
                  profile={profile}
                  isParsing={isParsing}
                  isLoadingRecommendations={isLoadingRecommendations}
                  onSelectFile={handleSelectFile}
                  error=""
                  doctorEmail={doctorEmail}
                  doctorName={doctorProfile?.displayName || ''}
                  doctorId={currentUserId}
                  onMergePatient={handleMergePatient}
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
                <PatientLibraryPanel onOpenPatientDetail={openLibraryPatientDetail} doctorId={currentUserId} />
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
                  patientName={profile?.patientName || profile?.name}
                  onRun={handleRunSimulation}
                />
              ) : null}

              {activeSection === SECTION.PRESCRIPTION ? (
                simulation && selectedDrug ? (
                  <PrescribeSummary
                    profile={profile}
                    selectedDrug={selectedDrug}
                    simulation={simulation}
                    isConfirmed={isConfirmed}
                    isConfirming={isConfirming}
                    onConfirm={handleConfirmPrescription}
                    onGoToFollowUp={() => setActiveSection(SECTION.FOLLOW_UP)}
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
                <FollowUpDashboard doctorId={currentUserId} />
              ) : null}

              {activeSection === SECTION.SETTINGS ? (
                <SettingsPanel
                  doctorProfile={doctorProfile}
                  doctorEmail={doctorEmail}
                  workspaceName={workspaceName}
                  onLogout={returnToLanding}
                />
              ) : null}

              {activeSection === SECTION.DOCTOR_PROFILE ? (
                <DoctorProfilePanel
                  doctorProfile={doctorProfile}
                  workspaceName={workspaceName}
                  onUpdateProfile={handleUpdateDoctorProfile}
                />
              ) : null}
              </ErrorBoundary>
            </div>

            <footer className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <div className="text-xs text-slate-500">
                {activeSection === SECTION.ADD_PATIENT && !intakeReady && isParsing ? (
                  <span>Parsing PDF — structured summary loads in the chart step.</span>
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
                    {isConfirmed ? (
                      <button
                        type="button"
                        onClick={() => setActiveSection(SECTION.FOLLOW_UP)}
                        className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(13,148,136,0.25)] transition hover:bg-teal-500"
                      >
                        Go to follow-up
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
