import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../services/supabase'
import usePatients from '../hooks/usePatients'

/* ─── Symptom label map ─── */
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

/* ─── Helpers ─── */
function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}hr${hrs > 1 ? 's' : ''} ago`
  const days = Math.floor(hrs / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

/* ─── Status for a merged patient row ─── */
function getStatus(row) {
  if (!row.prescription) return 'pending' // no prescription yet
  const rx = row.prescription
  if (rx.checkin_responses?.some((r) => r.emergency_flagged)) return 'flagged'
  if (rx.checkin_responses?.some((r) => r.completed_at)) return 'completed'
  if (rx.checked_in) return 'completed'
  return 'sent' // prescription exists but no checkin response
}

/* ─── Sort: flagged → pending → sent → completed ─── */
const STATUS_ORDER = { flagged: 0, pending: 1, sent: 2, completed: 3 }
function sortByStatus(a, b) {
  const sa = STATUS_ORDER[getStatus(a)] ?? 2
  const sb = STATUS_ORDER[getStatus(b)] ?? 2
  if (sa !== sb) return sa - sb
  return (b.sortTime || 0) - (a.sortTime || 0)
}

/* ═══════════════════════════════════════════════════
   Status Badge (Draft A colors)
   ═══════════════════════════════════════════════════ */
function StatusBadge({ status }) {
  const styles = {
    flagged: 'bg-[#FCEBEB] text-[#791F1F] ring-[#F09595]',
    completed: 'bg-[#E6F1FB] text-[#0C447C] ring-[#B3D4F0]',
    pending: 'bg-[#FAEEDA] text-[#633806] ring-[#E8C97A]',
    sent: 'bg-[#E1F5EE] text-[#0F6E56] ring-[#9FE1CB]',
  }
  const dots = {
    flagged: 'bg-[#791F1F]',
    completed: 'bg-[#0C447C]',
    pending: 'bg-[#633806]',
    sent: 'bg-[#0F6E56]',
  }
  const labels = { flagged: 'Flag', completed: 'Done', pending: 'Pending', sent: 'Sent' }
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${styles[status] || styles.pending}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dots[status] || dots.pending}`} />
      {labels[status] || status}
    </span>
  )
}

/* ═══════════════════════════════════════════════════
   Metric Card
   ═══════════════════════════════════════════════════ */
function MetricCard({ label, value, color = 'slate' }) {
  const cls = color === 'teal' ? 'text-teal-700' : color === 'red' ? 'text-[#A32D2D]' : 'text-slate-900'
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${cls}`}>{value}</p>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   Symptom Pills
   ═══════════════════════════════════════════════════ */
function SymptomPills({ symptoms }) {
  if (!symptoms?.length) return null
  return (
    <div className="flex flex-wrap gap-2">
      {symptoms.map((s) => (
        <span
          key={s}
          className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${
            s === 'none' ? 'bg-teal-50 text-teal-700 ring-teal-200' : 'bg-slate-100 text-slate-700 ring-slate-200'
          }`}
        >
          {SYMPTOM_LABELS[s] ?? s}
        </span>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   Conversation Modal (modal-overlay.md spec)
   ═══════════════════════════════════════════════════ */
function ConversationModal({ row, onClose }) {
  const [messages, setMessages] = useState([])
  const [loadingMessages, setLoadingMessages] = useState(true)
  const [summary, setSummary] = useState(null)
  const [generatingSummary, setGeneratingSummary] = useState(false)

  const rx = row.prescription
  const response = rx?.checkin_responses?.[0]
  const patientName = row.name
  const medication = rx?.medication_name || rx?.selected_drug?.name || '—'

  useEffect(() => {
    async function load() {
      if (!response) { setLoadingMessages(false); return }
      if (response.conversation_summary) setSummary(response.conversation_summary)

      try {
        const { data, error } = await supabase
          .from('conversation_messages')
          .select('id, sender, message, sent_at')
          .eq('checkin_response_id', response.id)
          .order('sent_at', { ascending: true })

        if (!error && data?.length > 0) {
          setMessages(data)
        } else {
          const fallback = []
          fallback.push({ id: 'bot-1', sender: 'bot', message: `Hi ${patientName.split(' ')[0]}! I'm Triage, your post-appointment check-in assistant. How are you feeling since starting ${medication}?`, sent_at: response.completed_at || rx.created_at })
          if (response.symptoms_selected?.length > 0) {
            fallback.push({ id: 'patient-1', sender: 'patient', message: `I've been experiencing: ${response.symptoms_selected.map((s) => SYMPTOM_LABELS[s] || s).join(', ')}`, sent_at: response.completed_at })
          }
          if (response.free_text_response) {
            fallback.push({ id: 'patient-2', sender: 'patient', message: response.free_text_response, sent_at: response.completed_at })
          }
          if (response.emergency_flagged) {
            fallback.push({ id: 'bot-2', sender: 'bot', message: "I'm flagging this for your care team right away. If symptoms worsen, please call 911 or go to the nearest emergency room.", sent_at: response.completed_at })
          }
          setMessages(fallback)
        }
      } catch {
        if (response.free_text_response) {
          setMessages([{ id: 'patient-fb', sender: 'patient', message: response.free_text_response, sent_at: response.completed_at }])
        }
      }
      setLoadingMessages(false)
    }
    load()
  }, [response?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleGenerateSummary = async () => {
    if (!response || generatingSummary) return
    setGeneratingSummary(true)
    try {
      const res = await fetch('/api/summarize-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms: response.symptoms_selected ?? [], freeText: response.free_text_response ?? '', medicationName: medication }),
      })
      if (!res.ok) throw new Error('Failed')
      const { summary: text } = await res.json()
      setSummary(text)
      await supabase.from('checkin_responses').update({ conversation_summary: text }).eq('id', response.id)
    } catch (err) {
      console.error('[ConversationModal] Summary generation failed:', err)
    } finally {
      setGeneratingSummary(false)
    }
  }

  useEffect(() => {
    if (response && !response.conversation_summary && !summary && !generatingSummary) {
      handleGenerateSummary()
    }
  }, [response?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const status = getStatus(row)
  const avatarBg = status === 'flagged' ? 'bg-red-100 text-red-700' : status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-teal-100 text-teal-700'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/35" onClick={onClose} aria-hidden="true" />
      <div className="relative flex max-h-[80vh] w-full max-w-[480px] flex-col overflow-hidden rounded-2xl border-[0.5px] border-slate-200 bg-white">
        {/* Header */}
        <div className="flex items-center gap-3 border-b-[0.5px] border-slate-200 px-[18px] py-[14px]">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarBg}`}>
            {getInitials(patientName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-slate-900">{patientName} — Conversation</p>
            <p className="text-[11px] text-slate-500">{medication} · {timeAgo(rx?.created_at)}</p>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 text-lg text-slate-400 transition hover:text-slate-600" aria-label="Close">×</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-[18px] py-4">
          <div className="mb-5 rounded-lg border-[0.5px] border-[#9FE1CB] bg-[#E1F5EE] px-4 py-3">
            <p className="text-[10px] font-medium tracking-wide text-[#0F6E56]">AI SUMMARY</p>
            {summary ? (
              <p className="mt-1.5 text-[11px] leading-[1.6] text-[#085041]">{summary}</p>
            ) : generatingSummary ? (
              <p className="mt-1.5 text-[11px] text-[#085041] opacity-60">Generating summary…</p>
            ) : (
              <p className="mt-1.5 text-[11px] text-[#085041] opacity-50">No summary available.</p>
            )}
          </div>

          <p className="mb-3 text-[10px] font-medium tracking-wide text-slate-400">FULL TRANSCRIPT</p>
          {loadingMessages ? (
            <p className="py-6 text-center text-xs text-slate-400">Loading…</p>
          ) : messages.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">No conversation messages yet.</p>
          ) : (
            <div className="flex max-h-[320px] flex-col gap-1.5 overflow-y-auto">
              {messages.map((msg) => {
                const isBot = msg.sender === 'bot'
                return (
                  <div key={msg.id} className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}>
                    <div
                      className={`max-w-[85%] px-3.5 py-2.5 text-xs leading-relaxed ${
                        isBot ? 'rounded-[0px_12px_12px_12px] bg-[#E1F5EE] text-[#085041]' : 'rounded-[12px_0px_12px_12px] bg-slate-100 text-slate-800'
                      }`}
                      style={{ marginBottom: '6px' }}
                    >
                      {msg.message}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t-[0.5px] border-slate-200 px-[18px] py-[14px]">
          <button type="button" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50">Resend check-in</button>
          <button type="button" onClick={onClose} className="rounded-lg bg-[#1D9E75] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#178A66]">Close</button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   Main Dashboard — shows ALL patients, joined with
   prescriptions/checkin data where available
   ═══════════════════════════════════════════════════ */
export default function FollowUpDashboard({ doctorId }) {
  const { allPatients, loading: patientsLoading } = usePatients(doctorId)
  const [prescriptions, setPrescriptions] = useState([])
  const [rxLoading, setRxLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  /* ── Fetch prescriptions with checkin_responses ── */
  const fetchPrescriptions = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('prescriptions')
        .select(
          `id, patient_email, patient_name, medication_name, selected_drug,
           prescribed_at, created_at, checked_in, doctor_id,
           checkin_responses (
             id, symptoms_selected, free_text_response, emergency_flagged, completed_at, conversation_summary
           )`,
        )
        .order('created_at', { ascending: false })
      setPrescriptions(data ?? [])
    } catch {
      setPrescriptions([])
    }
    setRxLoading(false)
  }, [])

  /* ── Realtime: prescriptions + checkin_responses ── */
  useEffect(() => {
    fetchPrescriptions()
    const channel = supabase
      .channel('followup-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prescriptions' }, fetchPrescriptions)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checkin_responses' }, fetchPrescriptions)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchPrescriptions])

  /* ── Merge patients with their prescriptions ── */
  const rows = useMemo(() => {
    // Build a map of prescriptions keyed by patient_name (lowercase)
    const rxByName = {}
    for (const rx of prescriptions) {
      const key = (rx.patient_name || rx.patient_email || '').toLowerCase().trim()
      if (key && !rxByName[key]) rxByName[key] = rx // first (most recent) wins
    }

    // Map every patient to a merged row
    const merged = allPatients.map((patient) => {
      const name = patient.profile?.patientName || ''
      const key = name.toLowerCase().trim()
      const rx = rxByName[key] || null
      // Mark this prescription as claimed so we don't duplicate it
      if (rx) delete rxByName[key]

      return {
        id: patient.id,
        name,
        email: patient.profile?.email || rx?.patient_email || '',
        age: patient.profile?.age,
        sex: patient.profile?.sex,
        chiefConcern: patient.profile?.chiefConcern || '',
        avatarSrc: patient.avatarSrc || '',
        prescription: rx,
        sortTime: rx ? new Date(rx.created_at || 0).getTime() : 0,
      }
    })

    // Any prescriptions not matched to a patient get their own rows
    for (const rx of Object.values(rxByName)) {
      merged.push({
        id: rx.id,
        name: rx.patient_name || rx.patient_email || '—',
        email: rx.patient_email || '',
        prescription: rx,
        sortTime: new Date(rx.created_at || 0).getTime(),
      })
    }

    return merged.sort(sortByStatus)
  }, [allPatients, prescriptions])

  /* ── Metrics (only count patients with prescriptions) ── */
  const withRx = rows.filter((r) => r.prescription)
  const total = withRx.length
  const completed = rows.filter((r) => getStatus(r) === 'completed').length
  const flagged = rows.filter((r) => getStatus(r) === 'flagged').length

  /* ── Selected row ── */
  const selected = rows.find((r) => r.id === selectedId) ?? null
  const response = selected?.prescription?.checkin_responses?.[0]
  const msgCount = response
    ? (response.symptoms_selected?.length > 0 ? 3 : 1) + (response.free_text_response ? 1 : 0) + (response.emergency_flagged ? 1 : 0)
    : 0

  const loading = patientsLoading || rxLoading

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-sm text-slate-400">Loading…</div>
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* ── Metric Cards ── */}
        <div className="grid grid-cols-3 gap-3">
          <MetricCard label="Total sent" value={total} />
          <MetricCard label="Completed" value={completed} color="teal" />
          <MetricCard label="Flagged" value={flagged} color={flagged > 0 ? 'red' : 'slate'} />
        </div>

        {/* ── Two-panel split ── */}
        <div className="flex min-h-[420px] gap-4">
          {/* LEFT PANEL — All patients */}
          <div className="flex w-64 shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
            {rows.length === 0 ? (
              <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-slate-400">
                No patients yet. Add a patient or use the demo library.
              </div>
            ) : (
              <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto">
                {rows.map((row) => {
                  const status = getStatus(row)
                  const isSelected = selectedId === row.id
                  const medication = row.prescription?.medication_name || row.prescription?.selected_drug?.name || row.chiefConcern || ''
                  return (
                    <li key={row.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(row.id)}
                        className={`flex w-full items-start gap-3 px-3 py-3 text-left transition hover:bg-slate-50 ${isSelected ? 'bg-teal-50/60' : ''}`}
                      >
                        {row.avatarSrc ? (
                          <img src={row.avatarSrc} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-slate-200" />
                        ) : (
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                            status === 'flagged' ? 'bg-red-100 text-red-700' :
                            status === 'completed' ? 'bg-blue-100 text-blue-700' :
                            status === 'pending' ? 'bg-amber-100 text-amber-700' :
                            'bg-teal-100 text-teal-700'
                          }`}>
                            {getInitials(row.name)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-medium text-slate-900">{row.name}</p>
                            <StatusBadge status={status} />
                          </div>
                          <p className="mt-0.5 truncate text-xs text-slate-500">{medication}</p>
                          {row.prescription && (
                            <p className="mt-0.5 text-[10px] text-slate-400">{timeAgo(row.prescription.created_at)}</p>
                          )}
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* RIGHT PANEL — Detail view */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
            {!selected ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-slate-400">
                <p className="text-sm">Select a patient to view their check-in details</p>
              </div>
            ) : (
              <div className="flex flex-1 flex-col overflow-y-auto p-5">
                {/* Patient header */}
                <div className="flex items-start gap-3">
                  {selected.avatarSrc ? (
                    <img src={selected.avatarSrc} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-slate-200" />
                  ) : (
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      getStatus(selected) === 'flagged' ? 'bg-red-100 text-red-700' :
                      getStatus(selected) === 'completed' ? 'bg-blue-100 text-blue-700' :
                      'bg-teal-100 text-teal-700'
                    }`}>
                      {getInitials(selected.name)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium text-slate-900">{selected.name}</p>
                    <p className="text-xs text-slate-500">
                      {selected.prescription?.medication_name || selected.prescription?.selected_drug?.name || '—'}
                      {selected.email ? ` · ${selected.email}` : ''}
                    </p>
                  </div>
                  <StatusBadge status={getStatus(selected)} />
                </div>

                {/* Emergency flag */}
                {response?.emergency_flagged && (
                  <div className="mt-4 flex items-start gap-3 rounded-xl bg-red-50 p-3 ring-1 ring-inset ring-red-200">
                    <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-red-800">Emergency flag raised</p>
                      <p className="mt-0.5 text-xs text-red-700">Follow up directly with this patient.</p>
                    </div>
                  </div>
                )}

                {/* Symptoms */}
                {response?.symptoms_selected?.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-400">Symptoms</p>
                    <SymptomPills symptoms={response.symptoms_selected} />
                  </div>
                )}

                {/* Patient note */}
                {response?.free_text_response && (
                  <div className="mt-4">
                    <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">Patient note</p>
                    <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-800 ring-1 ring-inset ring-slate-200">
                      &ldquo;{response.free_text_response}&rdquo;
                    </div>
                  </div>
                )}

                {/* No prescription yet */}
                {!selected.prescription && (
                  <div className="mt-6 rounded-xl bg-amber-50/60 px-4 py-4 text-center ring-1 ring-inset ring-amber-200/60">
                    <p className="text-sm font-medium text-amber-800">No prescription sent yet</p>
                    <p className="mt-1 text-xs text-amber-600">Complete the intake and handoff flow for this patient to begin check-in tracking.</p>
                  </div>
                )}

                {/* Prescription exists but no checkin response */}
                {selected.prescription && !response && (
                  <div className="mt-6 rounded-xl bg-teal-50/60 px-4 py-4 text-center ring-1 ring-inset ring-teal-200/60">
                    <p className="text-sm font-medium text-teal-800">Check-in sent — awaiting patient response</p>
                    <p className="mt-1 text-xs text-teal-600">The patient has not yet responded to the check-in.</p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {response && (
                    <button
                      type="button"
                      onClick={() => setModalOpen(true)}
                      className="rounded-lg border border-[#1D9E75] bg-transparent px-4 py-2 text-sm font-medium text-[#1D9E75] transition hover:bg-teal-50"
                    >
                      View conversation ({msgCount} msgs)
                    </button>
                  )}
                  {selected.prescription && (
                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                      Resend check-in
                    </button>
                  )}
                </div>

                {/* Timestamp */}
                {selected.prescription && (
                  <p className="mt-4 text-xs text-slate-400">
                    {response?.completed_at
                      ? `Completed · ${timeAgo(response.completed_at)}`
                      : `Sent · ${timeAgo(selected.prescription.created_at)}`}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Conversation Modal ── */}
      {modalOpen && selected?.prescription && (
        <ConversationModal
          row={selected}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  )
}
