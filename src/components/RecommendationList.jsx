import { useMemo, useState } from 'react'
import { sortDrugsByModelFitRank } from '../../lib/sortRecommendationDrugs.js'

function DisclosureChevron({ className = '' }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-slate-400 transition duration-200 group-open:rotate-180 ${className}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function OptionRow({ rank, drug, isSelected, onSelect }) {
  const rationale = drug.rationale?.trim() || ''
  const cautions = drug.cautions?.filter(Boolean) ?? []
  const isNominalFit = Boolean(drug.isNominalFit ?? drug.isRecommended)
  const hasDetail =
    Boolean(rationale) ||
    Boolean(drug.drugClass) ||
    cautions.length > 0 ||
    isNominalFit

  return (
    <div
      className={`overflow-hidden rounded-xl border transition ${
        isSelected
          ? 'border-teal-400 bg-teal-50/90 ring-2 ring-teal-300/70'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80'
      }`}
    >
      <button
        type="button"
        role="radio"
        aria-checked={isSelected}
        onClick={onSelect}
        className="flex w-full items-start gap-3 px-3 py-3 text-left sm:gap-4 sm:px-4 sm:py-3.5"
      >
        <div className="flex shrink-0 items-start gap-3 pt-0.5 sm:gap-3.5">
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
              isSelected ? 'border-teal-600 bg-teal-600' : 'border-slate-300 bg-white'
            }`}
          >
            {isSelected && <span className="h-2 w-2 rounded-full bg-white" />}
          </span>
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl font-bold tabular-nums shadow-sm ring-1 sm:h-14 sm:w-14 sm:text-2xl ${
              rank === 1
                ? 'bg-teal-100 text-teal-900 ring-teal-300/70'
                : 'bg-slate-100 text-slate-800 ring-slate-200'
            }`}
            title={
              rank === 1
                ? 'Rank 1 — strongest model fit for this patient'
                : `Rank ${rank} — model fit ordering (lower rank = stronger fit)`
            }
          >
            {rank}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug text-slate-900 sm:text-base">{drug.name}</p>
          <p className="mt-0.5 text-sm leading-snug text-slate-600">{drug.dose}</p>
        </div>

        <div className="shrink-0 pt-0.5 text-xs font-semibold text-slate-500 sm:text-sm">
          {isSelected ? <span className="text-teal-800">Selected</span> : <span>Select</span>}
        </div>
      </button>

      {hasDetail ? (
        <details className="group border-t border-slate-200/80 bg-slate-50/70">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-xs font-semibold text-teal-900 sm:px-4 [&::-webkit-details-marker]:hidden">
            <span>Why this option</span>
            <DisclosureChevron />
          </summary>
          <div className="space-y-2 border-t border-slate-200/60 px-3 pb-3 pt-2 text-sm leading-relaxed text-slate-700 sm:px-4">
            {isNominalFit ? (
              <p>
                <span className="inline-block rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 ring-1 ring-slate-200">
                  Nominal fit
                </span>
              </p>
            ) : null}
            {drug.drugClass ? (
              <p>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Class
                </span>{' '}
                <span className="text-slate-800">{drug.drugClass}</span>
              </p>
            ) : null}
            {rationale ? <p>{rationale}</p> : null}
            {cautions.length > 0 ? (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-900/90">
                  Cautions
                </p>
                <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-amber-950/90">
                  {cautions.map((c, i) => (
                    <li key={`${i}-${c.slice(0, 24)}`}>{c}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </details>
      ) : null}
    </div>
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
  const orderedDrugs = useMemo(
    () => sortDrugsByModelFitRank(recommendations?.drugs ?? []),
    [recommendations?.drugs],
  )
  const drugCount = orderedDrugs.length
  const tileLayout = embedded && drugCount > 0

  return (
    <section className={tileLayout ? `${shell} flex w-full min-w-0 flex-col` : shell}>
      {!embedded && (
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-teal-700">Phase 2</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900">Compare treatment paths</h2>
        </div>
      )}

      <div className={embedded ? 'flex w-full flex-col' : 'mt-6'}>
        {isLoading && (
          <div className="flex flex-col" aria-busy="true" aria-label="Loading options">
            <div className="space-y-2">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="flex animate-pulse gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5"
                >
                  <div className="h-5 w-5 shrink-0 rounded-full bg-slate-200" />
                  <div className="h-4 w-7 shrink-0 rounded bg-slate-200" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-2/5 rounded bg-slate-200" />
                    <div className="h-3 w-3/5 rounded bg-slate-200" />
                  </div>
                </div>
              ))}
            </div>
            <p className="shrink-0 pt-2 text-center text-xs text-slate-500">Loading…</p>
          </div>
        )}

        {!isLoading && !recommendations && (
          <div
            className={`flex items-center justify-center text-center text-sm leading-relaxed text-slate-500 ${embedded ? 'min-h-[160px]' : 'min-h-[360px]'}`}
          >
            Upload a chart from <strong className="font-semibold text-slate-700">Add new patient</strong>.
          </div>
        )}

        {!isLoading && recommendations && (
          <div className={tileLayout ? 'flex flex-col gap-2' : 'space-y-4'}>
            <fieldset className="border-0 p-0">
              <legend className="sr-only">Choose a regimen</legend>
              <div
                className={tileLayout ? 'grid grid-cols-1 gap-2 sm:gap-3' : 'space-y-2'}
                role="radiogroup"
                aria-label="Regimen options"
              >
                {orderedDrugs.map((drug, index) => (
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

            {synthesis && !tileLayout ? (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  All options
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
            ) : null}

            {synthesis && tileLayout ? (
              <details className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm open:pb-3">
                <summary className="cursor-pointer list-none text-xs font-semibold text-slate-600 [&::-webkit-details-marker]:hidden">
                  All options — comparison note
                </summary>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">{synthesis}</p>
              </details>
            ) : null}
          </div>
        )}
      </div>
    </section>
  )
}

export default RecommendationList
