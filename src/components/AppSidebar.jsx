import { useState } from 'react'

export const SECTION = {
  ADD_PATIENT: 'add-patient',
  PROFILES: 'profiles',
  RECOMMENDATIONS: 'recommendations',
  SIMULATION: 'simulation',
  PRESCRIPTION: 'prescription',
  FOLLOW_UP: 'follow-up',
  SETTINGS: 'settings',
  DOCTOR_PROFILE: 'doctor-profile',
}

export const SIDEBAR_NAV = [
  { id: SECTION.ADD_PATIENT, label: 'Add new patient' },
  { id: SECTION.PROFILES, label: 'View existing patient profiles' },
  { id: SECTION.RECOMMENDATIONS, label: 'Drug recommendation' },
  { id: SECTION.SIMULATION, label: 'Simulation' },
  { id: SECTION.PRESCRIPTION, label: 'Prescription' },
  { id: SECTION.FOLLOW_UP, label: 'Follow up' },
]

function AvatarInitials({ name }) {
  const initials = (name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
      {initials || '?'}
    </span>
  )
}

export default function AppSidebar({ activeSection, onSelectSection, onLogout, doctorProfile, workspaceName }) {
  const [popoverOpen, setPopoverOpen] = useState(false)

  const displayWorkspace = workspaceName || 'Workspace'
  const displayName = doctorProfile?.displayName || ''
  const displayHospital = doctorProfile?.hospital || ''

  return (
    <aside
      className="flex h-full min-h-0 w-[17.5rem] shrink-0 flex-col bg-linear-to-b from-slate-100/90 via-slate-50/80 to-white"
      aria-label="Main navigation"
    >
      <div className="border-b border-slate-200/80 px-5 pb-5 pt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">Triage</p>
        <p className="mt-1 font-serif text-lg font-semibold tracking-tight text-slate-900">{displayWorkspace}</p>
        <p className="mt-1 text-[11px] font-medium leading-snug text-slate-500">
          Clinical decision support
        </p>
      </div>
      <p className="px-5 pb-2 pt-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
        Sections
      </p>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-3" aria-label="Workspace sections">
        {SIDEBAR_NAV.map((item) => {
          const isActive = activeSection === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectSection(item.id)}
              className={`w-full rounded-l-md rounded-r-xl border border-transparent py-2.5 pl-3 pr-3 text-left text-sm font-medium leading-snug transition ${
                isActive
                  ? 'border-slate-200/80 bg-white text-teal-950 shadow-[inset_3px_0_0_0_#0d9488,2px_0_14px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,1)] ring-1 ring-slate-200/50'
                  : 'text-slate-600 hover:border-slate-200/60 hover:bg-white/70 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Account footer */}
      <div className="relative mt-auto border-t border-slate-200/80 bg-white/50 px-3 pb-3 pt-3">
        {/* Doctor identity card — click to open popover */}
        <button
          type="button"
          onClick={() => setPopoverOpen((v) => !v)}
          className="flex w-full items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          <AvatarInitials name={displayName} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{displayName || 'Doctor'}</p>
            {displayHospital && (
              <p className="truncate text-[11px] text-slate-500">{displayHospital}</p>
            )}
          </div>
          <svg
            className={`h-4 w-4 shrink-0 text-slate-400 transition ${popoverOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
          </svg>
        </button>

        {/* Popover */}
        {popoverOpen && (
          <div className="absolute inset-x-3 bottom-full mb-1.5 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
            <button
              type="button"
              onClick={() => {
                setPopoverOpen(false)
                onSelectSection(SECTION.DOCTOR_PROFILE)
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
              Doctor profile
            </button>
            <button
              type="button"
              onClick={() => {
                setPopoverOpen(false)
                onSelectSection(SECTION.SETTINGS)
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
              Settings
            </button>
            <div className="my-1 h-px bg-slate-100" />
            <button
              type="button"
              onClick={() => {
                setPopoverOpen(false)
                onLogout()
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
              </svg>
              Log out
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
