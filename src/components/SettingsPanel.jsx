import { useEffect, useState } from 'react'

function SectionHeading({ title, description }) {
  return (
    <div className="mb-4">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
    </div>
  )
}

function SettingRow({ label, value, secondary }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {secondary ? <p className="mt-0.5 text-xs text-slate-400">{secondary}</p> : null}
      </div>
      <p className="shrink-0 text-sm text-slate-900">{value || <span className="text-slate-400">Not set</span>}</p>
    </div>
  )
}

function SectionCard({ children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
      {children}
    </div>
  )
}

function Divider() {
  return <div className="border-t border-slate-100" />
}

export default function SettingsPanel({ doctorProfile, doctorEmail, workspaceName, onLogout }) {
  const [apiStatus, setApiStatus] = useState('checking')

  useEffect(() => {
    fetch('/api/health')
      .then((r) => (r.ok ? setApiStatus('ok') : setApiStatus('error')))
      .catch(() => setApiStatus('error'))
  }, [])

  return (
    <div className="flex flex-col gap-6">
      {/* ── Account ── */}
      <SectionCard>
        <SectionHeading title="Account" description="Your sign-in details and identity." />
        <Divider />
        <SettingRow
          label="Email"
          value={doctorEmail}
          secondary="Used for sign-in and as reply-to on patient emails"
        />
        <Divider />
        <SettingRow
          label="Display name"
          value={doctorProfile?.displayName}
          secondary="Shown on intake emails and handoff drafts"
        />
        <Divider />
        <SettingRow
          label="Specialty"
          value={doctorProfile?.specialty}
        />
        <Divider />
        <SettingRow
          label="NPI"
          value={doctorProfile?.npi}
          secondary="National Provider Identifier"
        />
      </SectionCard>

      {/* ── Workspace ── */}
      <SectionCard>
        <SectionHeading title="Workspace" description="Practice and organization settings." />
        <Divider />
        <SettingRow
          label="Workspace name"
          value={workspaceName}
          secondary="Your practice or clinic label"
        />
        <Divider />
        <SettingRow
          label="Data storage"
          value="Supabase (cloud)"
          secondary="Patient profiles and prescriptions are stored in your Supabase project"
        />
      </SectionCard>

      {/* ── Notifications ── */}
      <SectionCard>
        <SectionHeading title="Notifications" description="Configure how you receive alerts." />
        <Divider />
        <div className="py-3">
          <p className="text-sm text-slate-500">
            Email and in-app notification preferences will be available in a future release.
          </p>
        </div>
      </SectionCard>

      {/* ── Danger zone ── */}
      <div className="rounded-2xl border border-rose-200 bg-white px-5 py-5 shadow-sm">
        <SectionHeading title="Danger zone" description="Irreversible account actions." />
        <Divider />
        <div className="flex items-center justify-between gap-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-700">Sign out</p>
            <p className="mt-0.5 text-xs text-slate-400">End your current session on this device.</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="shrink-0 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
          >
            Sign out
          </button>
        </div>
        <Divider />
        <div className="flex items-center justify-between gap-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-700">Delete account</p>
            <p className="mt-0.5 text-xs text-slate-400">Permanently remove your profile and all associated data. This cannot be undone.</p>
          </div>
          <button
            type="button"
            disabled
            className="shrink-0 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-400 opacity-50 cursor-not-allowed"
            title="Coming soon"
          >
            Delete account
          </button>
        </div>
      </div>

      {/* ── Developer settings ── */}
      <SectionCard>
        <SectionHeading title="Developer settings" description="API connections and technical details." />
        <Divider />
        <div className="flex items-center gap-3 py-3">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${
            apiStatus === 'ok' ? 'bg-emerald-500' :
            apiStatus === 'error' ? 'bg-rose-500' :
            'animate-pulse bg-amber-400'
          }`} />
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Claude API{' '}
              {apiStatus === 'ok' ? '\u2014 connected' : apiStatus === 'error' ? '\u2014 unreachable' : '\u2014 checking\u2026'}
            </p>
            <p className="text-xs text-slate-500">
              {apiStatus === 'ok'
                ? 'Simulation and recommendation endpoints are reachable.'
                : apiStatus === 'error'
                ? 'Check ANTHROPIC_API_KEY in your .env and restart the server.'
                : 'Pinging /api/health\u2026'}
            </p>
          </div>
        </div>
        <Divider />
        <div className="py-3">
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
      </SectionCard>
    </div>
  )
}
