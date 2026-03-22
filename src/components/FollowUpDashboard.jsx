import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../services/supabase'

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

function getStatus(prescription) {
  if (prescription.checkin_responses?.some((r) => r.emergency_flagged)) return 'flagged'
  if (prescription.checkin_responses?.some((r) => r.completed_at)) return 'completed'
  if (prescription.checked_in) return 'completed'
  return 'pending'
}

function displayName(p) {
  return p.patient_name || p.patient_email || '—'
}

function displayDrug(p) {
  return p.medication_name || p.selected_drug?.name || '—'
}

/* ─── Status sort order: flagged → pending → sent → completed ─── */
const STATUS_ORDER = { flagged: 0, pending: 1, sent: 2, completed: 3 }

function sortByStatus(a, b) {
  const sa = STATUS_ORDER[getStatus(a)] ?? 2
  const sb = STATUS_ORDER[getStatus(b)] ?? 2
  if (sa !== sb) return sa - sb
  // Within same status, newest first
  return new Date(b.created_at || 0) - new Date(a.created_at || 0)
}

/* ═══════════════════════════════════════════════════
   Status Badge (matches Draft A colors)
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
  const s = styles[status] || styles.pending
  const d = dots[status] || dots.pending

  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${s}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${d}`} />
      {labels[status] || status}
    </span>
  )
}

/* ═══════════════════════════════════════════════════
   Metric Card
   ═══════════════════════════════════════════════════ */
function MetricCard({ label, value, color = 'slate' }) {
  const cls =
    color === 'teal' ? 'text-teal-700' :
    color === 'red' ? 'text-[#A32D2D]' :
    'text-slate-900'
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

/* ═══════════════════════════════════════════════════
   Conversation Modal (modal-overlay.md spec)
   ═══════════════════════════════════════════════════ */
function ConversationModal({ prescription, onClose }) {
  const [messages, setMessages] = useState([])
  const [loadingMessages, setLoadingMessages] = useState(true)
  const [summary, setSummary] = useState(null)
  const [generatingSummary, setGeneratingSummary] = useState(false)

  const response = prescription.checkin_responses?.[0]
  const patientName = displayName(prescription)
  const medication = displayDrug(prescription)

  // Fetch conversation messages
  useEffect(() => {
    async function load() {
      if (!response) {
        setLoadingMessages(false)
        return
      }

      // Check cached summary
      if (response.conversation_summary) {
        setSummary(response.conversation_summary)
      }

      // Try to load conversation_messages from Supabase
      try {
        const { data, error } = await supabase
          .from('conversation_messages')
          .select('id, sender, message, sent_at')
          .eq('checkin_response_id', response.id)
          .order('sent_at', { ascending: true })

        if (!error && data?.length > 0) {
          setMessages(data)
        } else {
          // Fallback: construct from checkin_response data
          const fallback = []
          fallback.push({
            id: 'bot-1',
            sender: 'bot',
            message: `Hi ${patientName.split(' ')[0]}! I'm Triage, your post-appointment check-in assistant. How are you feeling since starting ${medication}?`,
            sent_at: response.completed_at || prescription.created_at,
          })
          if (response.symptoms_selected?.length > 0) {
            const symptomText = response.symptoms_selected
              .map((s) => SYMPTOM_LABELS[s] || s)
              .join(', ')
            fallback.push({
              id: 'patient-1',
              sender: 'patient',
              message: `I've been experiencing: ${symptomText}`,
              sent_at: response.completed_at,
            })
          }
          if (response.free_text_response) {
            fallback.push({
              id: 'patient-2',
              sender: 'patient',
              message: response.free_text_response,
              sent_at: response.completed_at,
            })
          }
          if (response.emergency_flagged) {
            fallback.push({
              id: 'bot-2',
              sender: 'bot',
              message: 'I\'m flagging this for your care team right away. If symptoms worsen, please call 911 or go to the nearest emergency room.',
              sent_at: response.completed_at,
            })
          }
          setMessages(fallback)
        }
      } catch {
        // conversation_messages table may not exist yet — use fallback
        const fallback = []
        if (response.free_text_response) {
          fallback.push({
            id: 'patient-fb',
            sender: 'patient',
            message: response.free_text_response,
            sent_at: response.completed_at,
          })
        }
        setMessages(fallback)
      }
      setLoadingMessages(false)
    }
    load()
  }, [response?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Escape key closes modal
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Generate AI summary
  const handleGenerateSummary = async () => {
    if (!response || generatingSummary) return
    setGeneratingSummary(true)
    try {
      const res = await fetch('/api/summarize-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms: response.symptoms_selected ?? [],
          freeText: response.free_text_response ?? '',
          medicationName: medication,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const { summary: text } = await res.json()
      setSummary(text)
      // Cache in Supabase
      await supabase
        .from('checkin_responses')
        .update({ conversation_summary: text })
        .eq('id', response.id)
    } catch (err) {
      console.error('[ConversationModal] Summary generation failed:', err)
    } finally {
      setGeneratingSummary(false)
    }
  }

  // Auto-generate summary on first open if not cached
  useEffect(() => {
    if (response && !response.conversation_summary && !summary && !generatingSummary) {
      handleGenerateSummary()
    }
  }, [response?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Avatar color based on status
  const status = getStatus(prescription)
  const avatarBg =
    status === 'flagged' ? 'bg-red-100 text-red-700' :
    status === 'completed' ? 'bg-blue-100 text-blue-700' :
    'bg-teal-100 text-teal-700'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/35"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative flex max-h-[80vh] w-full max-w-[480px] flex-col overflow-hidden rounded-2xl border-[0.5px] border-slate-200 bg-white">
        {/* Header */}
        <div className="flex items-center gap-3 border-b-[0.5px] border-slate-200 px-[18px] py-[14px]">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarBg}`}>
            {getInitials(patientName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-slate-900">
              {patientName} — Conversation
            </p>
            <p className="text-[11px] text-slate-500">
              {medication} · {timeAgo(prescription.created_at)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-lg text-slate-400 transition hover:text-slate-600"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-[18px] py-4">
          {/* AI Summary Box */}
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

          {/* Full Transcript */}
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
                        isBot
                          ? 'rounded-[0px_12px_12px_12px] bg-[#E1F5EE] text-[#085041]'
                          : 'rounded-[12px_0px_12px_12px] bg-slate-100 text-slate-800'
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
          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Resend check-in
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#1D9E75] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#178A66]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   Main Dashboard
   ═══════════════════════════════════════════════════ */
export default function FollowUpDashboard() {
  const [prescriptions, setPrescriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  /* ── Fetch prescriptions with checkin_responses ── */
  const fetchData = useCallback(async () => {
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
    setLoading(false)
  }, [])

  /* ── Realtime subscriptions ── */
  useEffect(() => {
    fetchData()
    const channel = supabase
      .channel('followup-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prescriptions' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checkin_responses' }, fetchData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchData])

  /* ── Metrics ── */
  const total = prescriptions.length
  const completed = prescriptions.filter((p) => getStatus(p) === 'completed').length
  const flagged = prescriptions.filter((p) => getStatus(p) === 'flagged').length

  /* ── Sort and select ── */
  const sorted = useMemo(() => [...prescriptions].sort(sortByStatus), [prescriptions])
  const selected = prescriptions.find((p) => p.id === selectedId) ?? null
  const response = selected?.checkin_responses?.[0]
  const msgCount = response ? (response.symptoms_selected?.length > 0 ? 3 : 1) + (response.free_text_response ? 1 : 0) + (response.emergency_flagged ? 1 : 0) : 0

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-sm text-slate-400">Loading check-ins…</div>
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
          {/* LEFT PANEL — Patient list */}
          <div className="flex w-64 shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
            {sorted.length === 0 ? (
              <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-slate-400">
                No check-ins dispatched yet. Complete a patient flow to see them here.
              </div>
            ) : (
              <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto">
                {sorted.map((p) => {
                  const status = getStatus(p)
                  const isSelected = selectedId === p.id
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(p.id)}
                        className={`flex w-full items-start gap-3 px-3 py-3 text-left transition hover:bg-slate-50 ${
                          isSelected ? 'bg-teal-50/60' : ''
                        }`}
                      >
                        {/* Avatar */}
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                          status === 'flagged' ? 'bg-red-100 text-red-700' :
                          status === 'completed' ? 'bg-blue-100 text-blue-700' :
                          status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          'bg-teal-100 text-teal-700'
                        }`}>
                          {getInitials(displayName(p))}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-medium text-slate-900">{displayName(p)}</p>
                            <StatusBadge status={status} />
                          </div>
                          <p className="mt-0.5 truncate text-xs text-slate-500">{displayDrug(p)}</p>
                          <p className="mt-0.5 text-[10px] text-slate-400">{timeAgo(p.created_at)}</p>
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
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    getStatus(selected) === 'flagged' ? 'bg-red-100 text-red-700' :
                    getStatus(selected) === 'completed' ? 'bg-blue-100 text-blue-700' :
                    'bg-teal-100 text-teal-700'
                  }`}>
                    {getInitials(displayName(selected))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium text-slate-900">{displayName(selected)}</p>
                    <p className="text-xs text-slate-500">
                      {displayDrug(selected)} · {selected.patient_email || ''}
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
                      "{response.free_text_response}"
                    </div>
                  </div>
                )}

                {!response && (
                  <div className="mt-8 flex flex-1 items-center justify-center">
                    <p className="text-sm text-slate-400">Check-in not yet received from patient.</p>
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
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    Resend check-in
                  </button>
                </div>

                {/* Timestamp */}
                <p className="mt-4 text-xs text-slate-400">
                  {response?.completed_at
                    ? `Completed · ${timeAgo(response.completed_at)}`
                    : `Sent · ${timeAgo(selected.created_at)}`}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Conversation Modal ── */}
      {modalOpen && selected && (
        <ConversationModal
          prescription={selected}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  )
}
