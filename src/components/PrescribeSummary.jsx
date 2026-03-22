import { useCallback, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'

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
  lines.push('— Clinician review & sign-off required before any prescription is placed')
  lines.push('— Receiving pharmacy / recipient verification: __________________  Date: ______')
  return lines.join('\n')
}

export default function PrescribeSummary({ profile, selectedDrug, simulation, patientEmail, onNavigateToFollowUp }) {
  const [copied, setCopied] = useState(false)
  const [pharmacyId, setPharmacyId] = useState(DEMO_PHARMACIES[0].id)
  const [dispatching, setDispatching] = useState(false)
  const [dispatched, setDispatched] = useState(false)
  const [dispatchError, setDispatchError] = useState('')

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

  const handleDispatch = useCallback(async () => {
    if (!patientEmail?.trim() || !selectedDrug?.name) return
    setDispatching(true)
    setDispatchError('')
    try {
      const { error } = await supabase.from('prescriptions').insert({
        patient_email: patientEmail.trim().toLowerCase(),
        medication_name: selectedDrug.name,
      })
      if (error) throw error
      setDispatched(true)
    } catch (err) {
      setDispatchError(err.message ?? 'Failed to dispatch check-in.')
    } finally {
      setDispatching(false)
    }
  }, [patientEmail, selectedDrug])

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Draft handoff excerpt
          </p>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
            Condensed from the eight-week monitoring scenario so you can paste draft text into your
            EHR, fax cover sheet, or pharmacy message. Verify before acting and complete real
            prescribing and sign-off outside this prototype.
          </p>
        </div>
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

        <div className="mt-8 border-t border-slate-100 pt-6">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Dispatch Triage check-in
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            Send a post-appointment follow-up to the patient via Discord. Triage will message them
            in 24 hours to screen for side effects and drug interactions.
          </p>
          {!patientEmail?.trim() ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm text-amber-800">
              No patient email on file. Go back to <strong className="font-semibold">Add new patient → Chart &amp; merge</strong> and enter the patient email to enable this.
            </div>
          ) : dispatched ? (
            <div className="mt-3 flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
              <p className="text-sm font-medium text-emerald-800">
                Check-in dispatched for <span className="font-semibold">{patientEmail}</span>. Triage will contact the patient.
              </p>
              {onNavigateToFollowUp && (
                <button
                  type="button"
                  onClick={onNavigateToFollowUp}
                  className="self-start text-xs font-semibold text-emerald-700 underline underline-offset-2 transition hover:text-emerald-900"
                >
                  View in Follow up →
                </button>
              )}
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-700">
                {patientEmail}
              </div>
              <button
                type="button"
                onClick={handleDispatch}
                disabled={dispatching}
                className="shrink-0 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(13,148,136,0.25)] transition hover:bg-teal-500 disabled:opacity-50"
              >
                {dispatching ? 'Sending…' : 'Send check-in'}
              </button>
            </div>
          )}
          {dispatchError ? (
            <p className="mt-2 text-sm text-rose-600">{dispatchError}</p>
          ) : null}
        </div>

        <div className="mt-8 grid gap-4 border-t border-dashed border-slate-200 pt-6 sm:grid-cols-2">
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Clinician
            </p>
            <p className="mt-3 text-sm text-slate-500">Reviewed before external sign-off</p>
            <div className="mt-8 border-b border-slate-300 pb-1 text-xs text-slate-400">Signature</div>
            <div className="mt-3 border-b border-slate-300 pb-1 text-xs text-slate-400">Date</div>
          </div>
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Pharmacy / recipient
            </p>
            <p className="mt-3 text-sm text-slate-500">Verification / counseling documented</p>
            <div className="mt-8 border-b border-slate-300 pb-1 text-xs text-slate-400">Signature</div>
            <div className="mt-3 border-b border-slate-300 pb-1 text-xs text-slate-400">Date</div>
          </div>
        </div>
      </div>
    </div>
  )
}
