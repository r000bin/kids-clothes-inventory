import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { LangSwitcher, useI18n } from '../lib/i18n'

export function Auth() {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) setError(err.message)
    setBusy(false)
  }

  return (
    <div className="auth">
      <form className="card auth-card" onSubmit={onSubmit}>
        <div className="auth-head">
          <h1>{t('appTitle')}</h1>
          <LangSwitcher />
        </div>
        <p className="muted">{t('authIntro')}</p>
        <label>
          {t('email')}
          <input
            type="email"
            inputMode="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          {t('password')}
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary" type="submit" disabled={busy}>
          {busy ? t('signingIn') : t('signIn')}
        </button>
        <p className="muted small">{t('authNote')}</p>
      </form>
    </div>
  )
}
