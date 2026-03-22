import TimelineChart from './TimelineChart'

function DisclosureChevron({ className = '' }) {
  return (
    <svg
      className={`h-5 w-5 shrink-0 text-slate-400 transition duration-200 group-open:rotate-180 ${className}`}
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

const RISK_TIER = {
  low: {
    label: 'Low',
    bar: 'bg-teal-600',
    text: 'text-teal-800',
  },
  moderate: {
    label: 'Moderate',
    bar: 'bg-amber-600',
    text: 'text-amber-900',
  },
  high: {
    label: 'High',
    bar: 'bg-rose-600',
    text: 'text-rose-900',
  },
}

function riskSeverityTier(score, maxInList) {
  const n = Number(score) || 0
  const max = Number(maxInList) || 0
  if (max > 0 && max < 40) {
    const rel = n / max
    if (rel < 0.34) return 'low'
    if (rel < 0.67) return 'moderate'
    return 'high'
  }
  if (n < 40) return 'low'
  if (n < 70) return 'moderate'
  return 'high'
}

function SimulationPanel({ embedded = false, selectedDrug, simulation, isRunning, onRun }) {
  const shell = embedded
    ? 'flex flex-col'
    : 'flex flex-col rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur'

  const risks = simulation?.riskScores || []
  const rawRiskMax = risks.length
    ? Math.max(...risks.map((r) => Number(r.score) || 0))
    : 0
  const riskMaxBar = Math.max(1, rawRiskMax)
  const effects = simulation?.sideEffects || []
  const takeaways = simulation?.takeaways || []

  const regimenLabel = selectedDrug
    ? `${selectedDrug.name} · ${selectedDrug.dose}`
    : ''

  const headerGap = embedded ? 'mt-0' : 'mt-6'
  const chartGap = embedded ? 'mt-4' : 'mt-6'
  const detailsGap = 'mt-4'

  return (
    <section className={shell}>
      {!embedded ? (
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-teal-700">Phase 3</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900">
            Monitoring &amp; follow-up scenario
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
            The chart is the primary view: it encodes the illustrative eight-week trajectory for your
            selected contrast. Open the sections below for scored monitoring themes and follow-up
            pearls.
          </p>
        </div>
      ) : null}

      <div
        className={`flex flex-col gap-4 sm:flex-row sm:items-stretch sm:justify-between ${headerGap}`}
      >
        <div className="min-w-0 flex-1 rounded-2xl border border-teal-200/80 bg-teal-50/50 px-4 py-3.5 ring-1 ring-teal-100/60">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-800">
            Selected contrast
          </p>
          {selectedDrug ? (
            <>
              <p className="mt-1.5 text-lg font-semibold leading-snug text-slate-900">
                {selectedDrug.name}
              </p>
              <p className="mt-0.5 text-sm font-medium text-slate-700">{selectedDrug.dose}</p>
              {selectedDrug.drugClass ? (
                <p className="mt-1.5 text-xs text-slate-600">{selectedDrug.drugClass}</p>
              ) : null}
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                The scenario below models follow-up expectations for this option only — switch
                regimens under Drug comparison to compare a different contrast.
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-600">
              Select a regimen under <span className="font-medium text-slate-800">Drug comparison</span>{' '}
              before running the eight-week projection.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onRun}
          disabled={!selectedDrug || isRunning}
          className={`shrink-0 rounded-2xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(13,148,136,0.22)] transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-40 sm:self-center ${embedded ? 'w-full sm:w-auto' : ''}`}
        >
          {isRunning ? 'Running scenario…' : 'Run 8-week scenario'}
        </button>
      </div>

      <div className={`flex flex-col gap-3 ${chartGap}`}>
        <TimelineChart
          simulation={simulation}
          isRunning={isRunning}
          regimenLabel={regimenLabel}
        />

        <div className={`flex flex-col gap-2 ${detailsGap}`}>
          <details className="group rounded-2xl border border-slate-200 bg-white shadow-sm open:shadow-md open:ring-1 open:ring-slate-200/60">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left sm:px-5 sm:py-4 [&::-webkit-details-marker]:hidden">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Monitoring considerations
                  {risks.length > 0 ? (
                    <span className="ml-2 font-normal text-slate-500">({risks.length} themes)</span>
                  ) : null}
                </p>
              </div>
              <DisclosureChevron />
            </summary>
            <div className="border-t border-slate-100 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
              {risks.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Relative monitoring emphasis appears here after the scenario completes.
                </p>
              ) : (
                <ul className="divide-y divide-slate-200/80">
                  {risks.map((item) => {
                    const score = Number(item.score) || 0
                    const tierKey = riskSeverityTier(score, rawRiskMax || 1)
                    const tier = RISK_TIER[tierKey]
                    const barPct = Math.min(100, Math.round((score / riskMaxBar) * 100))
                    return (
                      <li
                        key={item.label}
                        className="py-3 first:pt-0"
                        aria-label={`${item.label}, score ${score}, ${tier.label} relative severity`}
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-sm text-slate-700">{item.label}</span>
                          <div className="flex items-baseline gap-2">
                            <span
                              className={`text-[10px] font-semibold uppercase tracking-wider ${tier.text}`}
                            >
                              {tier.label}
                            </span>
                            <span className="text-sm font-semibold tabular-nums text-slate-900">
                              {item.score}
                            </span>
                          </div>
                        </div>
                        <div
                          className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200/90 ring-1 ring-slate-300/40"
                          aria-hidden
                        >
                          <div
                            className={`h-full min-w-0 rounded-full ${tier.bar} transition-[width] duration-300 ease-out`}
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </details>

          <details className="group rounded-2xl border border-slate-200 bg-white shadow-sm open:shadow-md open:ring-1 open:ring-slate-200/60">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left sm:px-5 sm:py-4 [&::-webkit-details-marker]:hidden">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Effects and follow-up pearls
                  {effects.length + takeaways.length > 0 ? (
                    <span className="ml-2 font-normal text-slate-500">
                      ({effects.length + takeaways.length} items)
                    </span>
                  ) : null}
                </p>
              </div>
              <DisclosureChevron />
            </summary>
            <div className="border-t border-slate-100 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
              {effects.length === 0 && takeaways.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Illustrative side-effect discussion points and pearls appear here after the scenario
                  completes.
                </p>
              ) : (
                <ul className="list-disc space-y-2 pl-4 text-sm leading-snug text-slate-700 marker:text-teal-600">
                  {effects.map((effect) => (
                    <li key={effect.effect}>
                      <span className="font-medium text-slate-900">{effect.effect}</span>
                      {effect.probability != null && (
                        <span className="text-slate-600"> — {effect.probability}%</span>
                      )}
                      {effect.note ? <span className="text-slate-600">. {effect.note}</span> : null}
                    </li>
                  ))}
                  {takeaways.map((takeaway) => (
                    <li key={takeaway}>{takeaway}</li>
                  ))}
                </ul>
              )}
            </div>
          </details>
        </div>
      </div>
    </section>
  )
}

export default SimulationPanel
