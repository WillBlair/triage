import { PatientSnapshot } from './ProfileCard'

export default function PatientLibraryDetail({
  entry,
  onBack,
  onRequestRecommendations,
  isLoadingRecommendations,
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={isLoadingRecommendations}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Back to library
        </button>
        <button
          type="button"
          onClick={onRequestRecommendations}
          disabled={isLoadingRecommendations}
          className="rounded-xl bg-teal-600 px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(13,148,136,0.22)] transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoadingRecommendations ? 'Requesting options…' : 'Get AI treatment options'}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:gap-6">
          <img
            src={entry.avatarSrc}
            alt=""
            width={96}
            height={96}
            className="h-20 w-20 shrink-0 rounded-2xl object-cover ring-1 ring-slate-200/80 sm:h-24 sm:w-24"
          />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Demo chart</p>
            <p className="mt-1 text-sm text-slate-600">{entry.chartLabel}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              This snapshot is simulated. AI comparisons use the structured fields below—same as after a PDF parse.
            </p>
          </div>
        </div>

        <PatientSnapshot profile={entry.profile} />
      </div>
    </div>
  )
}
