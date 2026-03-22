import { useState, useMemo } from 'react'
import { supabase } from '../services/supabase'

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 0 0 1 12c0 1.94.46 3.77 1.18 5.42l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
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
        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
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

export const AUTH_MODE = { SIGN_IN: 'sign-in', SIGN_UP: 'sign-up' }
const MODE = AUTH_MODE

export default function AuthPage({ onAuthenticated, onBack, initialMode = MODE.SIGN_IN }) {
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmationSent, setConfirmationSent] = useState(false)

  const isSignUp = mode === MODE.SIGN_UP

  const validation = useMemo(() => {
    const hasValidLength = password.length >= 8 && password.length <= 32
    const hasUppercase = /[A-Z]/.test(password)
    const hasNumber = /\d/.test(password)
    const hasSpecial = /[@#$_-]/.test(password)
    const passwordsMatch = password.length > 0 && password === confirmPassword
    return { hasValidLength, hasUppercase, hasNumber, hasSpecial, passwordsMatch }
  }, [password, confirmPassword])

  const allValid = useMemo(
    () =>
      validation.hasValidLength &&
      validation.hasUppercase &&
      validation.hasNumber &&
      validation.hasSpecial &&
      validation.passwordsMatch,
    [validation],
  )

  const handleGoogle = async () => {
    setError('')
    setIsLoading(true)
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      })
      if (oauthError) throw oauthError
    } catch (err) {
      setError(err.message || 'Google sign-in failed.')
      setIsLoading(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (isSignUp && !allValid) return

    setIsLoading(true)
    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        })
        if (signUpError) throw signUpError
        // If email confirmation is required, the session will be null
        if (!data.session) {
          setConfirmationSent(true)
          return
        }
        onAuthenticated()
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) throw signInError
        onAuthenticated()
      }
    } catch (err) {
      setError(err.message || 'Authentication failed.')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleMode = () => {
    setMode(isSignUp ? MODE.SIGN_IN : MODE.SIGN_UP)
    setError('')
    setPassword('')
    setConfirmPassword('')
    setConfirmationSent(false)
  }

  return (
    <div className="min-h-screen pb-14 text-slate-900 sm:pb-12">
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-16 sm:px-6">
        <button
          type="button"
          onClick={onBack}
          className="mb-8 flex items-center gap-1.5 self-start text-sm font-medium text-slate-500 transition hover:text-teal-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Back
        </button>

        <div className="rounded-[1.75rem] border border-slate-200/90 bg-white p-8 shadow-[0_20px_64px_rgba(15,23,42,0.09),0_0_0_1px_rgba(15,23,42,0.04)] sm:p-10">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">
              Triage
            </p>
            <h1 className="mt-4 font-serif text-2xl font-semibold text-slate-950 sm:text-3xl">
              {isSignUp ? 'Create your account' : 'Sign in to your account'}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              {isSignUp ? 'Set up your clinical workspace' : 'Access your clinical workspace'}
            </p>
          </div>

          {confirmationSent ? (
            <div className="mt-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-50">
                <svg className="h-7 w-7 text-teal-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              </div>
              <h2 className="mt-4 font-serif text-xl font-semibold text-slate-950">Check your email</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                We sent a confirmation link to{' '}
                <span className="font-semibold text-slate-700">{email}</span>.
                Click the link in that email to verify your account, then come back here to sign in.
              </p>
              <button
                type="button"
                onClick={() => {
                  setConfirmationSent(false)
                  setMode(MODE.SIGN_IN)
                  setPassword('')
                  setConfirmPassword('')
                }}
                className="mt-6 w-full rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(13,148,136,0.25)] transition hover:bg-teal-500"
              >
                Go to sign in
              </button>
              <p className="mt-4 text-xs text-slate-400">
                Didn&apos;t get it? Check your spam folder or try signing up again.
              </p>
            </div>
          ) : (
          <>
          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={isLoading}
            className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium text-slate-400">or</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="auth-email" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@hospital.org"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="auth-password" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Password
              </label>
              <PasswordInput
                id="auth-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignUp ? 'Create a password' : 'Enter your password'}
                showPassword={showPassword}
                onToggle={() => setShowPassword((v) => !v)}
              />
            </div>

            {/* Confirm password (sign-up only) */}
            {isSignUp && (
              <div>
                <label htmlFor="auth-confirm-password" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Confirm password
                </label>
                <PasswordInput
                  id="auth-confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  showPassword={showConfirmPassword}
                  onToggle={() => setShowConfirmPassword((v) => !v)}
                />
              </div>
            )}

            {/* Validation checklist (sign-up only, shown once user starts typing) */}
            {isSignUp && password.length > 0 && (
              <div className="flex flex-col gap-1.5 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                <CheckRow passed={validation.hasValidLength} label="8–32 characters" />
                <CheckRow passed={validation.hasUppercase} label="One uppercase letter" />
                <CheckRow passed={validation.hasNumber} label="One number" />
                <CheckRow
                  passed={validation.hasSpecial}
                  label="One special character (@, #, $, _, -)"
                />
                <CheckRow passed={validation.passwordsMatch} label="Passwords match" />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || (isSignUp && !allValid)}
              className="w-full rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(13,148,136,0.25)] transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading
                ? (isSignUp ? 'Creating account\u2026' : 'Signing in\u2026')
                : (isSignUp ? 'Create account' : 'Sign in')}
            </button>
          </form>

          {/* Toggle sign-in / sign-up */}
          <p className="mt-5 text-center text-sm text-slate-500">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={toggleMode}
              className="font-semibold text-teal-700 transition hover:text-teal-600"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>

          <p className="mt-5 text-center text-xs text-slate-400">
            By continuing you agree to Triage&apos;s Terms of Service and Privacy Policy.
          </p>
          </>
          )}
        </div>
      </main>
    </div>
  )
}
