import { useEffect, useState } from 'react'

export default function SettingsPanel() {
  const [apiStatus, setApiStatus] = useState('checking')

  useEffect(() => {
    fetch('/api/health')
      .then((r) => (r.ok ? setApiStatus('ok') : setApiStatus('error')))
      .catch(() => setApiStatus('error'))
  }, [])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${
          apiStatus === 'ok' ? 'bg-emerald-500' :
          apiStatus === 'error' ? 'bg-rose-500' :
          'animate-pulse bg-amber-400'
        }`} />
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Claude API{' '}
            {apiStatus === 'ok' ? '— connected' : apiStatus === 'error' ? '— unreachable' : '— checking…'}
          </p>
          <p className="text-xs text-slate-500">
            {apiStatus === 'ok'
              ? 'Simulation and recommendation endpoints are reachable.'
              : apiStatus === 'error'
              ? 'Check ANTHROPIC_API_KEY in your .env and restart the server.'
              : 'Pinging /api/health…'}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">About this tool</p>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          <li>Upload a patient chart to extract a structured profile</li>
          <li>Compare three AI-generated drug regimens side by side</li>
          <li>Run an 8-week BP projection from the monitoring chart</li>
          <li>Copy a draft handoff summary for pharmacy or EHR</li>
        </ul>
        <p className="mt-4 text-xs text-slate-400">
          Prototype only — not for clinical use. All projections are illustrative and require clinician review.
        </p>
      </div>
    </div>
  )
}
