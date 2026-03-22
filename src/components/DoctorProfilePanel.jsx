import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'

const inputClass =
  'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-200'

function AvatarInitials({ name }) {
  const initials = (name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white">
      {initials || '?'}
    </span>
  )
}

function FieldLabel({ htmlFor, children, optional }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
      {children}
      {optional ? <span className="font-normal normal-case text-slate-400"> (optional)</span> : null}
    </label>
  )
}

function EyeIcon() {
  return (
    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}

function EyeSlashIcon() {
  return (
    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  )
}

function CheckRow({ passed, label }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {passed ? (
        <svg className="h-3.5 w-3.5 shrink-0 text-emerald-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="h-3.5 w-3.5 shrink-0 text-rose-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
        </svg>
      )}
      <span className={passed ? 'text-emerald-600' : 'text-slate-400'}>{label}</span>
    </div>
  )
}

function PasswordInput({ id, value, onChange, placeholder, showPassword, onToggle }) {
  return (
    <div className="relative mt-1.5">
      <input
        id={id}
        type={showPassword ? 'text' : 'password'}
        required
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-200"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute inset-y-0 right-3 flex items-center text-slate-400 transition hover:text-slate-600"
        aria-label={showPassword ? 'Hide password' : 'Show password'}
      >
        {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
      </button>
    </div>
  )
}

/* ── Change password flow ── */
const PW_STEP = { IDLE: 'idle', CURRENT: 'current', NEW: 'new', DONE: 'done' }

function ChangePasswordFlow({ userEmail }) {
  const [step, setStep] = useState(PW_STEP.IDLE)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const validation = useMemo(() => {
    const hasValidLength = newPassword.length >= 8 && newPassword.length <= 32
    const hasUppercase = /[A-Z]/.test(newPassword)
    const hasNumber = /\d/.test(newPassword)
    const hasSpecial = /[@#$_-]/.test(newPassword)
    const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword
    return { hasValidLength, hasUppercase, hasNumber, hasSpecial, passwordsMatch }
  }, [newPassword, confirmPassword])

  const allValid = useMemo(
    () =>
      validation.hasValidLength &&
      validation.hasUppercase &&
      validation.hasNumber &&
      validation.hasSpecial &&
      validation.passwordsMatch,
    [validation],
  )

  const reset = () => {
    setStep(PW_STEP.IDLE)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setShowCurrent(false)
    setShowNew(false)
    setShowConfirm(false)
    setError('')
    setIsLoading(false)
  }

  const handleVerifyCurrent = async () => {
    setError('')
    setIsLoading(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      })
      if (signInError) throw signInError
      setStep(PW_STEP.NEW)
    } catch (err) {
      setError(err.message || 'Current password is incorrect.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdatePassword = async () => {
    if (!allValid) return
    setError('')
    setIsLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })
      if (updateError) throw updateError
      setStep(PW_STEP.DONE)
      setTimeout(reset, 2000)
    } catch (err) {
      setError(err.message || 'Failed to update password.')
    } finally {
      setIsLoading(false)
    }
  }

  if (step === PW_STEP.IDLE) {
    return (
      <button
        type="button"
        onClick={() => setStep(PW_STEP.CURRENT)}
        className="rounded-full border border-teal-200 px-4 py-1.5 text-xs font-semibold text-teal-700 transition hover:border-teal-300 hover:bg-teal-50"
      >
        Change password
      </button>
    )
  }

  if (step === PW_STEP.DONE) {
    return (
      <span className="text-xs font-semibold text-teal-600">Password updated &#10003;</span>
    )
  }

  return (
    <div className="mt-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-5">
      {error && (
        <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
          {error}
        </div>
      )}

      {step === PW_STEP.CURRENT && (
        <>
          <p className="text-sm font-semibold text-slate-700">Enter your current password</p>
          <div className="mt-3">
            <FieldLabel htmlFor="cp-current">Current password</FieldLabel>
            <PasswordInput
              id="cp-current"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              showPassword={showCurrent}
              onToggle={() => setShowCurrent((v) => !v)}
            />
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={reset}
              className="rounded-full px-4 py-1.5 text-xs font-semibold text-slate-500 transition hover:text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleVerifyCurrent}
              disabled={!currentPassword || isLoading}
              className="rounded-full bg-teal-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isLoading ? 'Verifying\u2026' : 'Next'}
            </button>
          </div>
        </>
      )}

      {step === PW_STEP.NEW && (
        <>
          <p className="text-sm font-semibold text-slate-700">Set your new password</p>
          <div className="mt-3 space-y-3">
            <div>
              <FieldLabel htmlFor="cp-new">New password</FieldLabel>
              <PasswordInput
                id="cp-new"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Create a new password"
                showPassword={showNew}
                onToggle={() => setShowNew((v) => !v)}
              />
            </div>
            <div>
              <FieldLabel htmlFor="cp-confirm">Confirm new password</FieldLabel>
              <PasswordInput
                id="cp-confirm"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                showPassword={showConfirm}
                onToggle={() => setShowConfirm((v) => !v)}
              />
            </div>

            {newPassword.length > 0 && (
              <div className="flex flex-col gap-1.5 rounded-xl border border-slate-100 bg-white px-4 py-3">
                <CheckRow passed={validation.hasValidLength} label="8\u201332 characters" />
                <CheckRow passed={validation.hasUppercase} label="One uppercase letter" />
                <CheckRow passed={validation.hasNumber} label="One number" />
                <CheckRow passed={validation.hasSpecial} label="One special character (@, #, $, _, -)" />
                <CheckRow passed={validation.passwordsMatch} label="Passwords match" />
              </div>
            )}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={reset}
              className="rounded-full px-4 py-1.5 text-xs font-semibold text-slate-500 transition hover:text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpdatePassword}
              disabled={!allValid || isLoading}
              className="rounded-full bg-teal-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isLoading ? 'Updating\u2026' : 'Update password'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/* ── Main panel ── */

export default function DoctorProfilePanel({ doctorProfile, workspaceName, onUpdateProfile }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ ...doctorProfile })
  const [saved, setSaved] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [isEmailProvider, setIsEmailProvider] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) setUserEmail(data.user.email)
      const provider = data?.user?.app_metadata?.provider
      setIsEmailProvider(provider === 'email')
    })
  }, [])

  const patchDraft = useCallback((field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleEdit = () => {
    setDraft({ ...doctorProfile })
    setEditing(true)
    setSaved(false)
  }

  const handleCancel = () => {
    setEditing(false)
  }

  const handleSave = () => {
    onUpdateProfile(draft)
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const dp = doctorProfile || {}

  return (
    <div className="space-y-4">
      {/* ── Profile card ── */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-8">
        <div className="flex items-start justify-between">
          <div />
          {!editing && (
            <button
              type="button"
              onClick={handleEdit}
              className="rounded-full border border-teal-200 px-4 py-1.5 text-xs font-semibold text-teal-700 transition hover:border-teal-300 hover:bg-teal-50"
            >
              Edit
            </button>
          )}
          {editing && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-full px-4 py-1.5 text-xs font-semibold text-slate-500 transition hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-full bg-teal-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-500"
              >
                Save changes
              </button>
            </div>
          )}
        </div>

        {!editing ? (
          <>
            {/* Read-only view */}
            <div className="flex items-center gap-4">
              <AvatarInitials name={dp.displayName} />
              <div className="min-w-0">
                <p className="text-base font-semibold text-slate-900">{dp.displayName || '—'}</p>
                <p className="text-sm text-slate-500">{dp.specialty || '—'}</p>
              </div>
              {saved && (
                <span className="ml-auto text-xs font-semibold text-teal-600">Saved &#10003;</span>
              )}
            </div>
            <dl className="mt-6 grid gap-4 border-t border-slate-100 pt-6 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Hospital / Institution
                </dt>
                <dd className="mt-1 text-slate-700">{dp.hospital || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  NPI
                </dt>
                <dd className="mt-1 text-slate-700">{dp.npi?.trim() ? dp.npi : '—'}</dd>
              </div>
            </dl>
          </>
        ) : (
          <>
            {/* Edit mode */}
            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="dp-name">Display name</FieldLabel>
                <input
                  id="dp-name"
                  type="text"
                  value={draft.displayName || ''}
                  onChange={(e) => patchDraft('displayName', e.target.value)}
                  placeholder="e.g. Dr. Sarah Chen"
                  className={inputClass}
                />
              </div>
              <div>
                <FieldLabel htmlFor="dp-specialty">Specialty</FieldLabel>
                <input
                  id="dp-specialty"
                  type="text"
                  value={draft.specialty || ''}
                  onChange={(e) => patchDraft('specialty', e.target.value)}
                  placeholder="e.g. Cardiology"
                  className={inputClass}
                />
              </div>
              <div>
                <FieldLabel htmlFor="dp-hospital">Hospital / Institution</FieldLabel>
                <input
                  id="dp-hospital"
                  type="text"
                  value={draft.hospital || ''}
                  onChange={(e) => patchDraft('hospital', e.target.value)}
                  placeholder="e.g. St. Mary's Hospital"
                  className={inputClass}
                />
              </div>
              <div>
                <FieldLabel htmlFor="dp-npi" optional>NPI</FieldLabel>
                <input
                  id="dp-npi"
                  type="text"
                  value={draft.npi || ''}
                  onChange={(e) => patchDraft('npi', e.target.value)}
                  placeholder="10-digit NPI number"
                  className={inputClass}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Workspace card ── */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Workspace</p>
        <div className="mt-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Workspace name
          </dt>
          <dd className="mt-1 text-sm text-slate-700">{workspaceName || '—'}</dd>
        </div>
      </div>

      {/* ── Account card ── */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Account</p>
        <dl className="mt-4 grid gap-4 text-sm">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Email
            </dt>
            <dd className="mt-1 text-slate-700">{userEmail || '—'}</dd>
          </div>
          {isEmailProvider && (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Password
              </dt>
              <dd className="mt-2">
                <ChangePasswordFlow userEmail={userEmail} />
              </dd>
            </div>
          )}
          {!isEmailProvider && (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Sign-in method
              </dt>
              <dd className="mt-1 text-slate-700">Google</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  )
}
