import { useCallback, useMemo, useState } from 'react'

const DEMO_PHARMACIES = [
  {
    id: 'riverside',
    name: 'Riverside Pharmacy',
    detail: '1420 Main St · 2.1 mi · (555) 201-4400',
  },
  {
    id: 'wellspring',
    name: 'Wellspring Drug & Wellness',
    detail: '88 Oak Ave · 3.4 mi · (555) 918-7720',
  },
  {
    id: 'metro',
    name: 'Metro Health Rx',
    detail: 'Inside Metro Medical Plaza · 1.0 mi · (555) 004-3311',
  },
]

function buildSummaryPlainText({ profile, selectedDrug, simulation, pharmacy }) {
  const lines = []
  lines.push('DRAFT HANDOFF SUMMARY (demo / not for clinical use)')
  lines.push('Verify regimen, dosing, destination, and chart fit before acting.')
  lines.push('')
  if (profile?.patientName) {
    lines.push(`Patient: ${profile.patientName}`)
  }
  if (profile?.age != null) {
    lines.push(`Age: ${profile.age}`)
  }
  if (profile?.chiefConcern) {
    lines.push(`Chief concern: ${profile.chiefConcern}`)
  }
  lines.push('')
  if (selectedDrug) {
    lines.push(`Medication: ${selectedDrug.name}`)
    lines.push(`Dose / regimen: ${selectedDrug.dose}`)
  }
  lines.push('')
  if (simulation?.summary) {
    lines.push('Monitoring scenario note:')
    lines.push(simulation.summary)
    lines.push('')
  }
  if (simulation?.projectedMetric && simulation?.targetRange) {
    lines.push(
      `Illustrative follow-up trajectory: ${simulation.projectedMetric} (target ${simulation.targetRange.low}–${simulation.targetRange.high})`,
    )
    lines.push('')
  }
  const topEffects = (simulation?.sideEffects || []).slice(0, 4)
  if (topEffects.length) {
    lines.push('Counseling / adverse effects (high level):')
    for (const e of topEffects) {
      const pct = e.probability != null ? ` ~${e.probability}%` : ''
      lines.push(`- ${e.effect}${pct}${e.note ? `. ${e.note}` : ''}`)
    }
    lines.push('')
  }
  const topRisks = (simulation?.riskScores || []).slice(0, 4)
  if (topRisks.length) {
    lines.push('Illustrative risk themes (model scores):')
    for (const r of topRisks) {
      lines.push(`- ${r.label}: ${r.score}`)
    }
    lines.push('')
  }
  const pearls = (simulation?.takeaways || []).slice(0, 5)
  if (pearls.length) {
    lines.push('Handoff points / follow-up:')
    for (const p of pearls) {
      lines.push(`- ${p}`)
    }
  }
  lines.push('')
  if (pharmacy) {
    lines.push('Draft destination:')
    lines.push(`${pharmacy.name} — ${pharmacy.detail}`)
    lines.push('')
  }
  return lines.join('\n')
}

export default function PrescribeSummary({ profile, selectedDrug, simulation, isConfirmed, isConfirming, onConfirm, onGoToFollowUp }) {
  const [copied, setCopied] = useState(false)
  const [pharmacyId, setPharmacyId] = useState(DEMO_PHARMACIES[0].id)

  const selectedPharmacy = useMemo(
    () => DEMO_PHARMACIES.find((p) => p.id === pharmacyId) ?? DEMO_PHARMACIES[0],
    [pharmacyId],
  )

  const plainText = useMemo(
    () =>
      buildSummaryPlainText({
        profile,
        selectedDrug,
        simulation,
        pharmacy: selectedPharmacy,
      }),
    [profile, selectedDrug, simulation, selectedPharmacy],
  )

  const topEffects = useMemo(() => (simulation?.sideEffects || []).slice(0, 4), [simulation])
  const topRisks = useMemo(() => (simulation?.riskScores || []).slice(0, 4), [simulation])
  const pearls = useMemo(() => (simulation?.takeaways || []).slice(0, 5), [simulation])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(plainText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }, [plainText])

  const regimen = selectedDrug ? `${selectedDrug.name} — ${selectedDrug.dose}` : '—'

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-teal-300 hover:bg-teal-50/50"
        >
          {copied ? 'Copied' : 'Copy summary'}
        </button>
      </div>

      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Patient
            </h3>
            <p className="mt-2 font-medium text-slate-900">{profile?.patientName || '—'}</p>
            <dl className="mt-3 space-y-1 text-sm text-slate-600">
              {profile?.age != null ? (
                <div className="flex gap-2">
                  <dt className="text-slate-400">Age</dt>
                  <dd>{profile.age}</dd>
                </div>
              ) : null}
              {profile?.chiefConcern ? (
                <div>
                  <dt className="text-slate-400">Chief concern</dt>
                  <dd className="mt-0.5 text-slate-700">{profile.chiefConcern}</dd>
                </div>
              ) : null}
            </dl>
          </div>
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Regimen
            </h3>
            <p className="mt-2 text-base font-semibold text-teal-950">{regimen}</p>
            {selectedDrug?.drugClass ? (
              <p className="mt-1 text-sm text-slate-500">{selectedDrug.drugClass}</p>
            ) : null}
            {selectedDrug?.estimatedCost && (
              <div className="mt-2 text-left">
                <span className="inline-flex items-center gap-1 rounded bg-slate-100/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 ring-1 ring-inset ring-slate-200/80" title="Out-of-pocket estimate">
                  <svg className="h-[10px] w-[10px] text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {selectedDrug.estimatedCost}
                </span>
              </div>
            )}
          </div>
        </div>

        {simulation?.summary ? (
          <div className="mt-6 border-t border-slate-100 pt-6">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Monitoring scenario summary
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">{simulation.summary}</p>
          </div>
        ) : null}

        {simulation?.projectedMetric && simulation?.targetRange ? (
          <div className="mt-5 rounded-xl bg-teal-50/60 px-4 py-3 text-sm text-teal-950 ring-1 ring-teal-100">
            <span className="font-semibold">{simulation.projectedMetric}</span>
            <span className="text-teal-800">
              {' '}
              · Target {simulation.targetRange.low}–{simulation.targetRange.high}
            </span>
          </div>
        ) : null}

        {(topEffects.length > 0 || pearls.length > 0) && (
          <div className="mt-6 grid gap-5 border-t border-slate-100 pt-6 lg:grid-cols-2">
            {topEffects.length > 0 ? (
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Counseling / effects
                </h3>
                <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm text-slate-700 marker:text-teal-600">
                  {topEffects.map((e) => (
                    <li key={e.effect}>
                      <span className="font-medium text-slate-900">{e.effect}</span>
                      {e.probability != null ? (
                        <span className="text-slate-600"> — ~{e.probability}%</span>
                      ) : null}
                      {e.note ? <span className="text-slate-600">. {e.note}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {pearls.length > 0 ? (
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Pearls
                </h3>
                <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm text-slate-700 marker:text-teal-600">
                  {pearls.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}

        {topRisks.length > 0 ? (
          <div className="mt-6 border-t border-slate-100 pt-6">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Illustrative risk themes (model scores)
            </h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {topRisks.map((r) => (
                <li
                  key={r.label}
                  className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-800"
                >
                  {r.label}: <span className="tabular-nums">{r.score}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-8 border-t border-slate-100 pt-6">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Draft destination
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            Select the receiving pharmacy to tailor the copied draft text. This prototype never
            places an order, sends an eRx, or transmits a fax.
          </p>
          <ul className="mt-4 space-y-2" role="radiogroup" aria-label="Choose draft destination">
            {DEMO_PHARMACIES.map((p) => {
              const checked = p.id === pharmacyId
              return (
                <li key={p.id}>
                  <label
                    className={`flex cursor-pointer flex-col rounded-xl border px-4 py-3 transition sm:flex-row sm:items-center sm:justify-between ${
                      checked
                        ? 'border-teal-400 bg-teal-50/50 ring-1 ring-teal-200/80'
                        : 'border-slate-200 bg-slate-50/40 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <input
                        type="radio"
                        name="handoff-pharmacy"
                        value={p.id}
                        checked={checked}
                        onChange={() => setPharmacyId(p.id)}
                        className="mt-1 size-4 shrink-0 border-slate-300 text-teal-600 focus:ring-teal-600"
                      />
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-900">{p.name}</span>
                        <p className="mt-0.5 text-sm text-slate-600">{p.detail}</p>
                      </div>
                    </div>
                  </label>
                </li>
              )
            })}
          </ul>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-700">
            Draft currently addressed to <span className="font-semibold">{selectedPharmacy.name}</span>
            <span className="text-slate-500"> — {selectedPharmacy.detail}</span>.
          </div>
        </div>

        {/* Confirm / Send section */}
        <div className="mt-8 border-t border-slate-100 pt-6">
          {!isConfirmed ? (
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <p className="text-sm text-slate-600">
                Review the draft above, then send to <span className="font-semibold text-slate-800">{selectedPharmacy.name}</span>.
              </p>
              <button
                type="button"
                onClick={() => onConfirm?.(selectedPharmacy)}
                disabled={isConfirming}
                className="shrink-0 rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(13,148,136,0.25)] transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isConfirming ? 'Sending\u2026' : 'Confirm & send to pharmacy'}
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                  <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-emerald-900">Prescription sent (demo)</h3>
                  <p className="mt-1 text-sm text-emerald-800">
                    Handoff for <span className="font-semibold">{profile?.patientName || 'patient'}</span> has been
                    simulated as sent to <span className="font-semibold">{selectedPharmacy.name}</span>.
                  </p>
                  <dl className="mt-3 space-y-1 text-sm text-emerald-700">
                    <div className="flex gap-2">
                      <dt className="text-emerald-600">Pharmacy:</dt>
                      <dd>{selectedPharmacy.name} — {selectedPharmacy.detail}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-emerald-600">Medication:</dt>
                      <dd>{selectedDrug?.name} {selectedDrug?.dose ? `(${selectedDrug.dose})` : ''}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-emerald-600">Status:</dt>
                      <dd className="font-semibold">Delivered (simulated)</dd>
                    </div>
                  </dl>
                  <p className="mt-3 text-xs text-emerald-600">
                    In production this would transmit via eRx / NCPDP SCRIPT. This demo only saves a record.
                  </p>
                  {onGoToFollowUp ? (
                    <button
                      type="button"
                      onClick={onGoToFollowUp}
                      className="mt-4 rounded-xl border border-emerald-300 bg-white px-5 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
                    >
                      View in follow-up
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
