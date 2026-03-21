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

const footerAccountBtn = (isActive) =>
  `w-full rounded-lg border px-3 py-2 text-left text-sm font-semibold shadow-sm transition ${
    isActive
      ? 'border-slate-200/80 bg-white text-teal-950 shadow-[inset_3px_0_0_0_#0d9488] ring-1 ring-slate-200/50'
      : 'border-slate-300/90 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50'
  }`

export default function AppSidebar({ activeSection, onSelectSection, onLogout }) {
  return (
    <aside
      className="flex h-full min-h-0 w-[17.5rem] shrink-0 flex-col bg-linear-to-b from-slate-100/90 via-slate-50/80 to-white"
      aria-label="Main navigation"
    >
      <div className="border-b border-slate-200/80 px-5 pb-5 pt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">Triage</p>
        <p className="mt-1 font-serif text-lg font-semibold tracking-tight text-slate-900">Workspace</p>
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
      <div className="mt-auto border-t border-slate-200/80 bg-white/50 px-3 pb-3 pt-2">
        <p className="mb-1.5 px-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          Account
        </p>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => onSelectSection(SECTION.SETTINGS)}
            className={footerAccountBtn(activeSection === SECTION.SETTINGS)}
          >
            Settings
          </button>
          <button
            type="button"
            onClick={() => onSelectSection(SECTION.DOCTOR_PROFILE)}
            className={footerAccountBtn(activeSection === SECTION.DOCTOR_PROFILE)}
          >
            Doctor profile
          </button>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="mt-2.5 w-full rounded-lg border border-slate-300/90 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
        >
          ← Logout
        </button>
      </div>
    </aside>
  )
}
