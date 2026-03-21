import { useState } from 'react'

function clipNote(text, max = 160) {
  if (!text || text.length <= max) {
    return text || ''
  }
  return `${text.slice(0, max).trim()}…`
}

function OptionRow({ rank, drug, isSelected, onSelect }) {
  const note = clipNote(drug.rationale, 180)
  const cautionLine =
    drug.cautions?.length > 0 ? drug.cautions.join(' ') : null

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      onClick={onSelect}
      className={`flex w-full gap-3 rounded-xl border px-3 py-3 text-left transition sm:grid sm:grid-cols-[auto_1fr_auto] sm:items-start sm:gap-4 sm:px-4 sm:py-3 ${
        isSelected
          ? 'border-teal-400 bg-teal-50/90 ring-1 ring-teal-300/60'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80'
      }`}
    >
      <div className="flex shrink-0 items-start gap-2 pt-0.5 sm:block sm:pt-1">
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
            isSelected ? 'border-teal-600 bg-teal-600' : 'border-slate-300 bg-white'
          }`}
        >
          {isSelected && <span className="h-2 w-2 rounded-full bg-white" />}
        </span>
        <span className="hidden text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:mt-2 sm:block">
          #{rank}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:hidden">
            Option {rank}
          </span>
          {drug.isRecommended && (
            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
              Suggested
            </span>
          )}
        </div>
        <p className="mt-0.5 font-semibold text-slate-900 sm:mt-1">
          {drug.name}
          <span className="font-normal text-slate-600"> — {drug.dose}</span>
        </p>
        <p className="text-xs text-slate-500">{drug.drugClass}</p>
        <p className="mt-2 text-sm leading-snug text-slate-700" title={drug.rationale}>
          {note}
        </p>
        {cautionLine && (
          <p className="mt-2 text-xs font-medium leading-snug text-amber-800" title={cautionLine}>
            Caution: {cautionLine}
          </p>
        )}
      </div>

      <div className="hidden shrink-0 text-right text-xs font-semibold text-slate-500 sm:block">
        {isSelected ? (
          <span className="text-teal-800">Selected</span>
        ) : (
          <span>Select</span>
        )}
      </div>
    </button>
  )
}

function RecommendationList({
  embedded = false,
  recommendations,
  selectedDrugName,
  isLoading,
  onSelect,
}) {
  const [synthesisOpen, setSynthesisOpen] = useState(false)
  const shell = embedded
    ? 'flex flex-col'
    : 'flex flex-col rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur'

  const synthesis = recommendations?.overallReasoning?.trim()

  return (
    <section className={shell}>
      {!embedded && (
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-teal-700">Phase 2</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900">Choose a treatment direction</h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            Claude ranks 3 options with concise reasoning. Pick one to trigger the what-if simulation.
          </p>
        </div>
      )}

      <div className={embedded ? '' : 'mt-6'}>
        {isLoading && (
          <div className="space-y-2" aria-busy="true" aria-label="Loading options">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="flex animate-pulse gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <div className="h-5 w-5 rounded-full bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-slate-200" />
                  <div className="h-3 w-2/3 rounded bg-slate-200" />
                  <div className="h-12 w-full rounded bg-slate-200" />
                </div>
              </div>
            ))}
            <p className="pt-1 text-center text-xs text-slate-500">Building comparable rows from the chart…</p>
          </div>
        )}

        {!isLoading && !recommendations && (
          <div
            className={`flex items-center justify-center text-center text-sm leading-relaxed text-slate-500 ${embedded ? 'min-h-[160px]' : 'min-h-[360px]'}`}
          >
            Go back to step 1 and upload a PDF to load options.
          </div>
        )}

        {!isLoading && recommendations && (
          <div className="space-y-4">
            <fieldset>
              <legend className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Therapeutic options
              </legend>
              <div className="space-y-2" role="radiogroup" aria-label="Therapeutic options">
                {recommendations.drugs.map((drug, index) => (
                  <OptionRow
                    key={`${drug.name}-${drug.dose}`}
                    rank={index + 1}
                    drug={drug}
                    isSelected={selectedDrugName === drug.name}
                    onSelect={() => onSelect(drug)}
                  />
                ))}
              </div>
            </fieldset>

            {synthesis && (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Cross-option note
                </p>
                <p
                  className={`mt-2 text-sm leading-relaxed text-slate-700 ${synthesisOpen ? '' : 'line-clamp-3'}`}
                >
                  {synthesis}
                </p>
                {synthesis.length > 220 && (
                  <button
                    type="button"
                    onClick={() => setSynthesisOpen((o) => !o)}
                    className="mt-2 text-xs font-semibold text-teal-800 underline decoration-teal-300 underline-offset-2 hover:text-teal-950"
                  >
                    {synthesisOpen ? 'Show less' : 'Show full note'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

export default RecommendationList
