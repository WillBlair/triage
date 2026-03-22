import { useEffect, useRef } from 'react'
import TimelineChart from './TimelineChart'

function ThinkingStream({ text }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [text])

  if (!text) return null
  return (
    <div
      ref={ref}
      className="rounded-2xl border border-teal-100 bg-teal-50/60 px-4 py-3 text-sm leading-relaxed text-teal-900 max-h-28 overflow-y-auto"
    >
      <span className="mr-2 text-[10px] font-semibold uppercase tracking-widest text-teal-600">
        Analyzing
      </span>
      {text}
      <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-teal-500 align-middle" />
    </div>
  )
}

function SimulationPanel({
  embedded = false,
  selectedDrug,
  simulation,
  isRunning,
  thinkingText = '',
  onRun,
  onContinueToPrescribe,
}) {
  const shell = embedded
    ? 'flex flex-col'
    : 'flex flex-col rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur'

  const regimenLabel = selectedDrug
    ? `${selectedDrug.name} · ${selectedDrug.dose}`
    : ''

  const headerGap = embedded ? 'mt-0' : 'mt-6'
  const chartGap = embedded ? 'mt-4' : 'mt-6'

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
            selected contrast.
          </p>
        </div>
      ) : null}

      <div className={`flex flex-col gap-4 sm:flex-row sm:items-stretch sm:justify-between ${headerGap}`}>
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
        {(isRunning || thinkingText) && !simulation && (
          <ThinkingStream text={thinkingText} />
        )}

        <TimelineChart
          simulation={simulation}
          isRunning={isRunning}
          regimenLabel={regimenLabel}
        />
      </div>

      {embedded && simulation && typeof onContinueToPrescribe === 'function' ? (
        <div className="mt-5 flex flex-col items-stretch gap-2 border-t border-slate-200/80 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            Next: open a shortened summary derived from this run — ready to share with pharmacy.
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
