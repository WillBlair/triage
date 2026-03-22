import { useMemo } from 'react'
import { DEMO_PATIENTS } from '../constants/demoPatients'

export default function FollowUpDashboard({ savedPatients = [], prescriptions = [], onOpenPatientDetail }) {
  const allPatients = useMemo(() => [...savedPatients, ...DEMO_PATIENTS], [savedPatients])

  // Match prescriptions to patients by name for demo purposes
  const patientsWithStatus = useMemo(() => {
    return allPatients.map((entry) => {
      const rx = prescriptions.find(
        (p) => p.patient_name === entry.profile.patientName
      )
      return { ...entry, prescription: rx || null }
    })
  }, [allPatients, prescriptions])

  const sent = patientsWithStatus.filter((p) => p.prescription)
  const pending = patientsWithStatus.filter((p) => !p.prescription)

  return (
    <div className="flex flex-col gap-6">
      {/* Sent prescriptions */}
      <section>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Sent to pharmacy ({sent.length})
        </h3>
        {sent.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">
            No prescriptions have been sent yet. Complete a patient flow through handoff to see them here.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {sent.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => onOpenPatientDetail?.(entry)}
                  className="flex w-full items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50/40 px-4 py-3 text-left transition hover:bg-emerald-50 hover:border-emerald-300"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-700">
                    {(entry.profile.patientName || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">{entry.profile.patientName}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {entry.prescription.selected_drug?.name || 'Medication'} — sent{' '}
                      {entry.prescription.created_at
                        ? new Date(entry.prescription.created_at).toLocaleDateString()
                        : 'recently'}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    Sent
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Pending patients */}
      <section>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Patients awaiting review ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">All patients have been reviewed.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {pending.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => onOpenPatientDetail?.(entry)}
                  className="flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-teal-200 hover:bg-teal-50/30"
                >
                  {entry.avatarSrc ? (
                    <img
                      src={entry.avatarSrc}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-slate-200/80"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-xs font-bold text-teal-700">
                      {(entry.profile.patientName || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">{entry.profile.patientName}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {[entry.profile.age ? `${entry.profile.age}y` : null, entry.profile.sex]
                        .filter(Boolean)
                        .join(' \u00b7 ')}
                      {entry.profile.chiefConcern ? ` \u2014 ${entry.profile.chiefConcern}` : ''}
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-lg bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200/60">
                    Pending
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="rounded-xl border border-slate-200/80 bg-white/90 px-4 py-3">
        <p className="text-xs leading-relaxed text-slate-500">
          This view shows all patients from the demo library and any you have added.
          Complete the intake, comparison, simulation, and handoff flow to move a patient into the
          &ldquo;Sent to pharmacy&rdquo; section.
        </p>
      </footer>
    </div>
  )
}
