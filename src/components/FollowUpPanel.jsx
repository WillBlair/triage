import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'

const SYMPTOM_LABELS = {
  nausea: 'Nausea or upset stomach',
  dizziness: 'Dizziness or lightheadedness',
  fatigue: 'Fatigue or low energy',
  headache: 'Headache',
  rash: 'Rash or skin changes',
  sleep: 'Difficulty sleeping',
  none: 'No side effects — feeling fine',
  other: 'Something else',
}

function StatusBadge({ status }) {
  if (status === 'flagged') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-inset ring-red-200">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Flagged
      </span>
    )
  }
  if (status === 'completed') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700 ring-1 ring-inset ring-teal-200">
        <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
        Completed
      </span>
    )
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 ring-1 ring-inset ring-slate-200">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      Pending
    </span>
  )
}

function MetricCard({ label, value, color = 'slate' }) {
  const valueClass =
    color === 'teal'
      ? 'text-teal-700'
      : color === 'red'
        ? 'text-red-600'
        : 'text-slate-900'
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${valueClass}`}>{value}</p>
    </div>
  )
}

function SymptomPills({ symptoms }) {
  if (!symptoms?.length) return null
  return (
    <div className="flex flex-wrap gap-2">
      {symptoms.map((s) => (
        <span
          key={s}
          className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${
            s === 'none'
              ? 'bg-teal-50 text-teal-700 ring-teal-200'
              : 'bg-slate-100 text-slate-700 ring-slate-200'
          }`}
        >
          {SYMPTOM_LABELS[s] ?? s}
        </span>
      ))}
    </div>
  )
}

function ConversationModal({ prescription, onClose, onGenerateSummary, generatingSummary }) {
  const response = prescription.checkin_responses?.[0]

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Check-in response"
    >
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Check-in response
            </p>
            <p className="mt-0.5 font-semibold text-slate-900">{displayEmail(prescription)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close modal"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {!response ? (
            <div className="py-12 text-center text-sm text-slate-400">
              No check-in response received yet.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Medication */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Medication
                </p>
                <p className="mt-1 font-medium text-slate-800">{displayDrug(prescription)}</p>
              </div>

              {/* Emergency flag */}
              {response.emergency_flagged && (
                <div className="flex items-start gap-3 rounded-xl bg-red-50 p-4 ring-1 ring-inset ring-red-200">
                  <svg
                    className="mt-0.5 h-5 w-5 shrink-0 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-red-800">Emergency flag raised</p>
                    <p className="mt-0.5 text-xs text-red-700">
                      Patient reported 3 or more symptoms or mentioned urgent keywords. Follow up directly.
                    </p>
                  </div>
                </div>
              )}

              {/* Symptoms */}
              {response.symptoms_selected?.length > 0 && (
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Symptoms reported
                  </p>
                  <SymptomPills symptoms={response.symptoms_selected} />
                </div>
              )}

              {/* Patient message as chat bubble */}
              {response.free_text_response && (
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Patient message
                  </p>
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-teal-600 px-4 py-3 text-sm leading-relaxed text-white">
                      {response.free_text_response}
                    </div>
                  </div>
                </div>
              )}

              {/* AI summary */}
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    AI clinical summary
                  </p>
                  {!response.conversation_summary && (
                    <button
                      type="button"
                      onClick={() => onGenerateSummary(prescription)}
                      disabled={generatingSummary}
                      className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-500 disabled:opacity-60"
                    >
                      {generatingSummary ? 'Generating…' : 'Generate summary'}
                    </button>
                  )}
                </div>
                {response.conversation_summary ? (
                  <div className="rounded-xl bg-teal-50/60 px-4 py-3 text-sm leading-relaxed text-teal-950 ring-1 ring-inset ring-teal-100">
                    {response.conversation_summary}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">
                    No summary yet. Generate one to get a clinical overview of this response.
                  </p>
                )}
              </div>

              {response.completed_at && (
                <p className="text-xs text-slate-400">
                  Completed {new Date(response.completed_at).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
          <p className="text-xs text-slate-400">
            {displayDate(prescription)
              ? `Saved ${new Date(displayDate(prescription)).toLocaleDateString()}`
              : ''}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function getStatus(prescription) {
  if (prescription.checkin_responses?.some((r) => r.emergency_flagged)) return 'flagged'
  if (prescription.checked_in) return 'completed'
  return 'pending'
}

// Bot rows use patient_email + medication_name; app rows use patient_name + selected_drug (JSON)
function displayEmail(p) {
  return p.patient_email || p.patient_name || '—'
}
function displayDrug(p) {
  return p.medication_name || p.selected_drug?.name || '—'
}
function displayDate(p) {
  return p.created_at || p.prescribed_at || null
}

export default function FollowUpPanel() {
  const [prescriptions, setPrescriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [generatingSummary, setGeneratingSummary] = useState(false)
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    if (!supabase) return
    const { data } = await supabase
      .from('prescriptions')
      .select(
        `id, patient_email, patient_name, medication_name, selected_drug,
         prescribed_at, created_at, checked_in,
         checkin_responses (
           id, symptoms_selected, free_text_response, emergency_flagged, completed_at, conversation_summary
         )`,
      )
      .order('created_at', { ascending: false })
    setPrescriptions(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
    if (!supabase) return
    const channel = supabase
      .channel('follow-up-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'checkin_responses' },
        fetchData,
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'prescriptions' },
        fetchData,
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'prescriptions' },
        fetchData,
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData])

  const selected = prescriptions.find((p) => p.id === selectedId) ?? null

  const filtered = prescriptions.filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      displayEmail(p).toLowerCase().includes(q) ||
      displayDrug(p).toLowerCase().includes(q)
    )
  })

  const total = prescriptions.length
  const completed = prescriptions.filter((p) => p.checked_in).length
  const flagged = prescriptions.filter((p) =>
    p.checkin_responses?.some((r) => r.emergency_flagged),
  ).length

  const handleGenerateSummary = async (prescription) => {
    const response = prescription.checkin_responses?.[0]
    if (!response || generatingSummary) return
    setGeneratingSummary(true)
    try {
      const res = await fetch('/api/summarize-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms: response.symptoms_selected ?? [],
          freeText: response.free_text_response ?? '',
          medicationName: prescription.medication_name ?? '',
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const { summary } = await res.json()
      if (supabase) {
        await supabase
          .from('checkin_responses')
          .update({ conversation_summary: summary })
          .eq('id', response.id)
      }
      await fetchData()
    } catch (err) {
      console.error('[FollowUp] Summary generation failed:', err)
    } finally {
      setGeneratingSummary(false)
    }
  }

  if (!supabase) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
        <p className="text-slate-600">Supabase is not configured.</p>
        <p className="text-sm text-slate-400">
          Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="flex h-full min-h-0 gap-5">
        {/* ── Left panel: metrics + list ── */}
        <div className="flex w-72 shrink-0 flex-col gap-3">
          {/* Metric cards */}
          <div className="grid grid-cols-3 gap-2">
            <MetricCard label="Sent" value={total} />
            <MetricCard label="Done" value={completed} color="teal" />
            <MetricCard label="Flagged" value={flagged} color="red" />
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search patients…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 placeholder-slate-400 shadow-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            />
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Patient list */}
          <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            {loading ? (
              <div className="py-10 text-center text-sm text-slate-400">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-400">
                {search ? 'No matches.' : 'No check-ins dispatched yet.'}
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filtered.map((p) => {
                  const status = getStatus(p)
                  const isSelected = selectedId === p.id
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(p.id)}
                        className={`w-full px-4 py-3 text-left transition hover:bg-slate-50 ${
                          isSelected ? 'bg-teal-50/60' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">
                              {displayEmail(p)}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {displayDrug(p)}
                            </p>
                          </div>
                          <StatusBadge status={status} />
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {displayDate(p)
                            ? new Date(displayDate(p)).toLocaleDateString()
                            : ''}
                        </p>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {/* ── Right panel: detail ── */}
        <div className="flex min-w-0 flex-1 flex-col">
          {!selected ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 rounded-[1.75rem] border border-dashed border-slate-200 bg-white/60 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <svg
                  className="h-6 w-6 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <div>
                <p className="font-medium text-slate-500">Select a patient</p>
                <p className="text-sm text-slate-400">
                  Choose a check-in from the list to view the response.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col gap-6 overflow-y-auto rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Patient
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {displayEmail(selected)}
                  </p>
                  <p className="text-sm text-slate-500">{displayDrug(selected)}</p>
                </div>
                <StatusBadge status={getStatus(selected)} />
              </div>

              <p className="text-xs text-slate-400">
                Saved{' '}
                {displayDate(selected)
                  ? new Date(displayDate(selected)).toLocaleString()
                  : '—'}
              </p>

              {/* Response content */}
              {(() => {
                const response = selected.checkin_responses?.[0]
                if (!response) {
                  return (
                    <div className="rounded-xl bg-slate-50 px-5 py-10 text-center text-sm text-slate-400 ring-1 ring-inset ring-slate-200">
                      Check-in not yet received from patient.
                    </div>
                  )
                }
                return (
                  <div className="space-y-5">
                    {/* Emergency flag */}
                    {response.emergency_flagged && (
                      <div className="flex items-start gap-3 rounded-xl bg-red-50 p-4 ring-1 ring-inset ring-red-200">
                        <svg
                          className="mt-0.5 h-5 w-5 shrink-0 text-red-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                          />
                        </svg>
                        <div>
                          <p className="text-sm font-semibold text-red-800">Emergency flag raised</p>
                          <p className="mt-0.5 text-xs text-red-700">
                            Follow up directly with this patient.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Symptoms */}
                    {response.symptoms_selected?.length > 0 && (
                      <div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                          Symptoms reported
                        </p>
                        <SymptomPills symptoms={response.symptoms_selected} />
                      </div>
                    )}

                    {/* Free text */}
                    {response.free_text_response && (
                      <div>
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                          Patient message
                        </p>
                        <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-800 ring-1 ring-inset ring-slate-200">
                          {response.free_text_response}
                        </p>
                      </div>
                    )}

                    {response.completed_at && (
                      <p className="text-xs text-slate-400">
                        Completed {new Date(response.completed_at).toLocaleString()}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => setModalOpen(true)}
                      className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(13,148,136,0.2)] transition hover:bg-teal-500"
                    >
                      View full response &amp; AI summary
                    </button>
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      </div>

      {modalOpen && selected && (
        <ConversationModal
          prescription={selected}
          onClose={() => setModalOpen(false)}
          onGenerateSummary={handleGenerateSummary}
          generatingSummary={generatingSummary}
        />
      )}
    </>
  )
}
