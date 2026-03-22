const MOCK_PATIENT = {
  name: 'Jane Doe',
  sex: 'Female',
  dob: '12/04/1985',
  mrn: '4821',
  concerns: ['Hypertension'],
  notes: 'Patient reports morning headaches, high-sodium diet.',
  encounterDate: '18/03/2026',
  sessionLabel: 'Bed 4 - JD',
  chartType: 'Discharge summary',
  documents: [
    { name: 'Discharge Summary Mar 2026', type: 'Discharge summary', date: '18 Mar', size: '1.2 MB' },
    { name: 'Blood Panel Feb 2026', type: 'Lab results', date: '02 Feb', size: '0.4 MB' },
  ],
}

const NAV_TILES = [
  { id: 'bp-readings', label: 'BP Readings', description: 'Home & clinical readings', icon: BpIcon },
  { id: 'symptoms', label: 'Symptoms', description: 'Reported symptoms log', icon: SymptomsIcon },
  { id: 'medications', label: 'Medications & Allergies', description: 'Active meds, past meds, allergies', icon: MedsIcon },
  { id: 'lifestyle', label: 'Lifestyle', description: 'Diet, exercise, smoking', icon: LifestyleIcon },
  { id: 'tests', label: 'Tests & Results', description: 'Labs, imaging, diagnostics', icon: TestsIcon },
  { id: 'follow-up', label: 'Follow Up', description: 'Scheduled visits & tasks', icon: FollowUpIcon },
]

/* ── Icons ── */

function BpIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
    </svg>
  )
}

function SymptomsIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
    </svg>
  )
}

function MedsIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m20.893 13.393-1.135-1.135a2.252 2.252 0 0 1-.421-.585l-1.08-2.16a.414.414 0 0 0-.663-.107.827.827 0 0 1-.812.21l-1.273-.363a.89.89 0 0 0-.738 1.595l.587.39c.59.395.674 1.23.172 1.732l-.2.2c-.212.212-.33.498-.33.796v.41c0 .409-.11.809-.32 1.158l-1.315 2.191a2.11 2.11 0 0 1-1.81 1.025 1.055 1.055 0 0 1-1.055-1.055v-1.172c0-.92-.56-1.747-1.414-2.089l-.655-.261a2.25 2.25 0 0 1-1.383-2.46l.007-.042a2.25 2.25 0 0 1 .29-.787l.09-.15a2.25 2.25 0 0 1 2.37-1.048l1.178.236a1.125 1.125 0 0 0 1.302-.795l.208-.73a1.125 1.125 0 0 0-.578-1.315l-.665-.332-.091.091a2.25 2.25 0 0 1-1.591.659h-.18a.94.94 0 0 0-.662.274.931.931 0 0 1-1.458-1.137l1.411-2.353a2.25 2.25 0 0 0 .286-.76m11.928 9.869A9 9 0 0 0 8.965 3.525m11.928 9.868A9 9 0 1 1 8.965 3.525" />
    </svg>
  )
}

function LifestyleIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
    </svg>
  )
}

function TestsIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
    </svg>
  )
}

function FollowUpIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  )
}

function DocIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-teal-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  )
}

/* ── Sub-components ── */

function SectionLabel({ children }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
      {children}
    </p>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-900">{value}</dd>
    </div>
  )
}

/* ── Main component ── */

export default function PatientProfile({ onBack }) {
  const patient = MOCK_PATIENT

  const handleTileClick = (tileId) => {
    // eslint-disable-next-line no-console
    console.log(`Navigate to: ${tileId}`)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start lg:gap-8">

      {/* ════ Left column ════ */}
      <div className="space-y-5">

        {/* Patient identity */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <SectionLabel>Patient</SectionLabel>
          <h3 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-slate-950">
            {patient.name}
          </h3>
          <dl className="mt-4 grid grid-cols-3 gap-4">
            <DetailRow label="Sex" value={patient.sex} />
            <DetailRow label="DOB" value={patient.dob} />
            <DetailRow label="MRN" value={patient.mrn} />
          </dl>
        </div>

        {/* Clinical concern */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <SectionLabel>Clinical concern</SectionLabel>
          <div className="mt-3 flex flex-wrap gap-2">
            {patient.concerns.map((c) => (
              <span
                key={c}
                className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800"
              >
                {c}
              </span>
            ))}
          </div>
          {patient.notes && (
            <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600">
              {patient.notes}
            </p>
          )}
          <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
            <DetailRow label="Encounter date" value={patient.encounterDate} />
            <DetailRow label="Session label" value={patient.sessionLabel} />
          </dl>
        </div>

        {/* Chart documents */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between">
            <SectionLabel>Chart documents</SectionLabel>
            <span className="text-xs text-slate-400">{patient.documents.length} file{patient.documents.length !== 1 ? 's' : ''}</span>
          </div>
          <ul className="mt-3 divide-y divide-slate-100">
            {patient.documents.map((doc) => (
              <li key={doc.name} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <DocIcon />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{doc.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {doc.type} &middot; {doc.date} &middot; {doc.size}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-500"
            >
              Upload files
            </button>
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              View all
            </button>
          </div>
        </div>
      </div>

      {/* ════ Right column ════ */}
      <div className="space-y-5">

        {/* Overview */}
        <div className="rounded-2xl border border-slate-200/80 bg-linear-to-br from-teal-50/30 to-white p-5 shadow-sm sm:p-6">
          <SectionLabel>Overview</SectionLabel>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <DetailRow label="Date of birth" value={patient.dob} />
            <DetailRow label="Sex" value={patient.sex} />
            <DetailRow label="MRN" value={patient.mrn} />
            <DetailRow label="Latest encounter" value={patient.encounterDate} />
            <DetailRow label="Session label" value={patient.sessionLabel} />
            <DetailRow label="Chart type" value={patient.chartType} />
          </dl>
        </div>

        {/* Navigation tiles */}
        <div>
          <SectionLabel>Patient data</SectionLabel>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {NAV_TILES.map((tile) => {
              const Icon = tile.icon
              return (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => handleTileClick(tile.id)}
                  className="group flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-sm transition hover:border-teal-200 hover:shadow-md"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-600/10 text-teal-700 transition group-hover:bg-teal-600/15">
                    <Icon />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">{tile.label}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{tile.description}</p>
                  </div>
                  <ChevronRight />
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
