import { useMemo, useState } from 'react'
import { DEMO_PATIENTS } from '../constants/demoPatients'

export default function PatientLibraryPanel({ onOpenPatientDetail, savedPatients = [] }) {
  const [query, setQuery] = useState('')

  const allPatients = useMemo(() => [...savedPatients, ...DEMO_PATIENTS], [savedPatients])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      return allPatients
    }
    return allPatients.filter((p) => {
      const blob = [
        p.profile.patientName,
        p.profile.chiefConcern,
        p.profile.summary,
        ...(p.profile.diagnoses || []),
      ]
        .join(' ')
        .toLowerCase()
      return blob.includes(q)
    })
  }, [query])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <ul className="grid list-none grid-cols-2 items-stretch gap-2 p-0 sm:gap-2.5 md:grid-cols-3">
        {filtered.map((entry) => (
          <li key={entry.id} className="flex min-h-0">
            <article
              className="flex w-full min-h-0 flex-col rounded-xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-transparent transition hover:ring-teal-200/80"
              title={entry.chartLabel}
            >
              <button
                type="button"
                onClick={() => onOpenPatientDetail(entry)}
                className="flex h-full min-h-[11.5rem] w-full flex-col items-center rounded-xl p-2.5 text-center outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 sm:min-h-[12rem] sm:p-3"
              >
                <div className="flex w-full shrink-0 flex-col items-center">
                  {entry.avatarSrc ? (
                    <img
                      src={entry.avatarSrc}
                      alt=""
                      width={48}
                      height={48}
                      className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-slate-200/80 sm:h-14 sm:w-14"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-sm font-bold text-teal-700 ring-1 ring-teal-200/80 sm:h-14 sm:w-14 sm:text-base">
                      {(entry.profile.patientName || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <h3 className="mt-2 line-clamp-2 w-full font-serif text-xs font-semibold leading-tight text-slate-900 sm:text-sm">
                    {entry.profile.patientName}
                  </h3>
                  <p className="mt-0.5 text-[10px] text-slate-500 sm:text-[11px]">
                    {[entry.profile.age ? `${entry.profile.age}y` : null, entry.profile.sex]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <div className="mt-1 flex min-h-[2.625rem] w-full flex-1 flex-col justify-start sm:min-h-[2.875rem]">
                  <p
                    className="line-clamp-2 w-full text-[10px] leading-snug text-slate-500 sm:text-[11px]"
                    title={entry.profile.chiefConcern}
                  >
                    {entry.profile.chiefConcern}
                  </p>
                </div>
                <span className="mt-2 w-full shrink-0 rounded-lg bg-teal-600 py-1.5 text-[10px] font-semibold text-white shadow-sm sm:mt-3 sm:py-2 sm:text-xs">
                  View details
                </span>
              </button>
            </article>
          </li>
        ))}
      </ul>

      {filtered.length === 0 ? (
        <p className="shrink-0 text-center text-sm text-slate-500">No profiles match that search.</p>
      ) : null}

      <footer className="shrink-0 space-y-2.5 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-3 sm:px-4">
        <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500" htmlFor="patient-library-search">
          Search
        </label>
        <input
          id="patient-library-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name, diagnosis, or concern"
          className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-2 text-xs text-slate-900 outline-none ring-teal-500/0 transition placeholder:text-slate-400 focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-500/20 sm:text-sm"
        />
        <div className="border-t border-slate-100 pt-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Demo library</p>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600 sm:text-sm">
            Simulated BP-focused charts (hypertension and hypotension). Open a profile to review the snapshot, then
            request AI treatment options when you are ready to compare regimens.
          </p>
        </div>
      </footer>
    </div>
  )
}
