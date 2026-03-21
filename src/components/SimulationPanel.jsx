import TimelineChart from './TimelineChart'

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

function SimulationPanel({
  embedded = false,
  selectedDrug,
  simulation,
  isRunning,
  onRun,
  onContinueToPrescribe,
}) {
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

  return (
    <section className={shell}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {!embedded && (
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-teal-700">Phase 3</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900">Projection &amp; follow-through</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
              The timeline leads: run the model, read the curve, then scan risks and clinical pearls below.
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={onRun}
          disabled={!selectedDrug || isRunning}
          className={`shrink-0 rounded-2xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(13,148,136,0.22)] transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-40 ${embedded ? 'w-full sm:w-auto sm:self-end' : ''}`}
        >
          {isRunning ? 'Running model…' : 'Run 8-week projection'}
        </button>
      </div>

      <div className={`grid gap-4 ${embedded ? 'mt-5' : 'mt-6'}`}>
        <TimelineChart
          simulation={simulation}
          isRunning={isRunning}
          regimenLabel={regimenLabel}
        />

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Risk view
            </p>
            {risks.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Appears after the run completes.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-200/80">
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

          <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Effects and pearls
            </p>
            {effects.length === 0 && takeaways.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Appears after the run completes.</p>
            ) : (
              <ul className="mt-3 list-disc space-y-2 pl-4 text-sm leading-snug text-slate-700 marker:text-teal-600">
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
        </div>
      </div>

      {embedded && simulation && typeof onContinueToPrescribe === 'function' ? (
        <div className="mt-5 flex flex-col items-stretch gap-2 border-t border-slate-200/80 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            Next: open a shortened summary derived from this run—ready to share with pharmacy and
            sign off offline.
          </p>
          <button
            type="button"
            onClick={onContinueToPrescribe}
            className="shrink-0 rounded-xl border border-teal-200 bg-teal-50/90 px-4 py-2.5 text-sm font-semibold text-teal-900 shadow-sm transition hover:bg-teal-100"
          >
            Continue to Prescribe
          </button>
        </div>
      ) : null}
    </section>
  )
}

export default SimulationPanel
