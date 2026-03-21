import TimelineChart from './TimelineChart'

function SimulationPanel({
  embedded = false,
  selectedDrug,
  simulation,
  isRunning,
  onRun,
}) {
  const shell = embedded
    ? 'flex flex-col'
    : 'flex flex-col rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur'

  const risks = simulation?.riskScores || []
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
                {risks.map((item) => (
                  <li key={item.label} className="flex items-baseline justify-between gap-3 py-2 first:pt-0">
                    <span className="text-sm text-slate-600">{item.label}</span>
                    <span className="text-sm font-semibold tabular-nums text-slate-900">{item.score}</span>
                  </li>
                ))}
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
    </section>
  )
}

export default SimulationPanel
