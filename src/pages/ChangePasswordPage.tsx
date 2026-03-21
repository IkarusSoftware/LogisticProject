import { useState } from 'react'
import { KeyRound, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Button, FormField, InlineMessage, Input } from '../components/ui'
import { getCurrentUser } from '../domain/selectors'
import { getRoleDefinition } from '../domain/workflow'
import { authApi, hasTokens } from '../services/api'
import { useAppStore } from '../store/app-store'

export function ChangePasswordPage() {
  const navigate = useNavigate()
  const data = useAppStore((state) => state.data)
  const session = useAppStore((state) => state.session)
  const changePassword = useAppStore((state) => state.changePassword)
  const logout = useAppStore((state) => state.logout)

  const currentUser = getCurrentUser(data, session.currentUserId)
  const isForced = session.mustChangePassword === true

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (newPw !== confirmPw) {
      setMessage({ kind: 'error', text: 'Yeni şifreler eşleşmiyor.' })
      return
    }

    if (hasTokens()) {
      try {
        const apiResult = await authApi.changePassword(currentPw, newPw)
        // Also update local Zustand store so offline state is consistent
        changePassword(currentPw, newPw)
        setMessage({ kind: apiResult.ok ? 'success' : 'error', text: apiResult.message })
        if (apiResult.ok) {
          const roleKey = currentUser?.roleKey
          const homePath = getRoleDefinition(roleKey as never)?.homePath ?? '/dashboard'
          setTimeout(() => navigate(homePath), 800)
        }
        return
      } catch {
        // fall through to local change
      }
    }

    const result = changePassword(currentPw, newPw)
    setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
    if (result.ok) {
      const roleKey = currentUser?.roleKey
      const homePath = getRoleDefinition(roleKey as never)?.homePath ?? '/dashboard'
      setTimeout(() => navigate(homePath), 800)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F1F5F9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          width: '100%',
          maxWidth: 420,
          padding: '2rem',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: isForced ? '#fef3c7' : '#f0fdfa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
            }}
          >
            {isForced ? <ShieldCheck size={24} color="#d97706" /> : <KeyRound size={24} color="#0d9488" />}
          </div>
          <h1 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.25rem', color: '#0F172A', margin: 0 }}>
            {isForced ? 'Şifrenizi Güncelleyin' : 'Şifre Değiştir'}
          </h1>
          {isForced && (
            <p style={{ fontSize: '0.875rem', color: '#64748B', marginTop: '0.5rem' }}>
              Hesabınıza ilk kez giriş yapıyorsunuz. Güvenliğiniz için şifrenizi değiştirmeniz zorunludur.
            </p>
          )}
          {currentUser && (
            <p style={{ fontSize: '0.8125rem', color: '#94a3b8', marginTop: '0.375rem' }}>
              {currentUser.email}
            </p>
          )}
        </div>

        {message && <InlineMessage kind={message.kind} message={message.text} />}

        <form className="form-grid" onSubmit={handleSubmit}>
          <FormField label="Mevcut Şifre">
            <Input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              placeholder="Mevcut şifreniz"
              required
            />
          </FormField>
          <FormField label="Yeni Şifre" hint="En az 6 karakter olmalıdır.">
            <Input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="Yeni şifre"
              required
            />
          </FormField>
          <FormField label="Yeni Şifre (Tekrar)">
            <Input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              placeholder="Yeni şifreyi tekrarlayın"
              required
            />
          </FormField>

          <div className="form-actions">
            <Button type="submit" fill size="lg" variant="primary">
              Şifreyi Güncelle
            </Button>
          </div>
        </form>

        {isForced && (
          <button
            type="button"
            className="link-button"
            style={{ display: 'block', width: '100%', textAlign: 'center', marginTop: '1rem' }}
            onClick={() => { logout(); navigate('/login') }}
          >
            Çıkış Yap
          </button>
        )}
      </div>
    </div>
  )
}
