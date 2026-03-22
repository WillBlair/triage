import { useEffect, useState } from 'react'

export default function FollowUpDashboard() {
  const [logs, setLogs] = useState([])

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/telegram-logs')
        const data = await res.json()
        setLogs(data)
      } catch (e) {}
    }
    fetchLogs()
    const intId = setInterval(fetchLogs, 2000)
    return () => clearInterval(intId)
  }, [])

  if (logs.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
        <p className="text-sm text-slate-500">Waiting for Telegram messages...</p>
      </div>
    )
  }

  // Group by chatId
  const grouped = {}
  logs.forEach(log => {
    if (!grouped[log.chatId]) {
      grouped[log.chatId] = { patientName: log.patientName, messages: [] }
    }
    grouped[log.chatId].messages.push(log)
  })

  return (
    <div className="grid gap-6">
      {Object.values(grouped).map((group, idx) => (
        <section key={idx} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
            <h3 className="font-semibold text-slate-900">{group.patientName}</h3>
            <p className="text-xs text-slate-500">Active Telegram Follow-Up</p>
          </div>
          <div className="flex max-h-[600px] flex-col gap-4 overflow-y-auto p-5">
            {group.messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                  msg.direction === 'outbound' ? 'bg-teal-600 text-white rounded-tr-sm' : 'bg-slate-100 text-slate-800 rounded-tl-sm'
                }`}>
                  {msg.photoUrl && (
                    <img src={msg.photoUrl} alt="Chart" className="mb-3 rounded-xl border border-teal-500/20 bg-white p-1 shadow-sm" />
                  )}
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <p className={`mt-1 text-right text-[10px] ${msg.direction === 'outbound' ? 'text-teal-200' : 'text-slate-400'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
