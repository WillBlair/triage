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
  { id: SECTION.SETTINGS, label: 'Settings' },
  { id: SECTION.DOCTOR_PROFILE, label: 'Doctor profile' },
]

export default function AppSidebar({ activeSection, onSelectSection, onBackToWelcome }) {
  return (
    <aside
      className="flex w-60 shrink-0 flex-col border-r border-slate-200/90 bg-white/95 shadow-[4px_0_24px_rgba(15,23,42,0.04)] backdrop-blur-sm"
      aria-label="Main navigation"
    >
      <div className="border-b border-slate-100 px-4 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">Triage</p>
        <p className="mt-1 text-[11px] leading-snug text-slate-500">Clinical decision support</p>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3" aria-label="Workspace sections">
        {SIDEBAR_NAV.map((item) => {
          const isActive = activeSection === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectSection(item.id)}
              className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                isActive
                  ? 'bg-teal-50 text-teal-900 ring-1 ring-teal-200/80 shadow-sm'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </nav>
      <div className="border-t border-slate-100 p-3">
        <button
          type="button"
          onClick={onBackToWelcome}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          ← Back to welcome
        </button>
      </div>
    </aside>
  )
}
