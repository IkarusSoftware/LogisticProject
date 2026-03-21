import { useEffect, useState } from 'react'
import { Building2, CheckCircle2, KeyRound, Mail, Phone, Shield, User } from 'lucide-react'

import { Button, FormField, InlineMessage, Input } from '../components/ui'
import { getCurrentUser } from '../domain/selectors'
import { formatFullName } from '../domain/workflow'
import { authApi, hasTokens } from '../services/api'
import { useAppStore } from '../store/app-store'

function Avatar({ firstName, lastName, size = 72 }: { firstName: string; lastName: string; size?: number }) {
  const fs = size * 0.33
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: fs,
        fontWeight: 800,
        flexShrink: 0,
        fontFamily: 'Manrope, sans-serif',
        letterSpacing: '-0.01em',
        boxShadow: '0 4px 12px rgba(13,148,136,0.3)',
      }}
    >
      {firstName[0]}{lastName[0]}
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0', borderBottom: '1px solid #F1F5F9' }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
        <div style={{ fontSize: '0.875rem', color: '#0F172A', fontWeight: 500, marginTop: '0.125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value || '—'}</div>
      </div>
    </div>
  )
}

function SectionCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden', ...style }}>
      {children}
    </div>
  )
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #f0fdfa, #ccfbf1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0d9488', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '0.9375rem', color: '#0F172A' }}>{title}</div>
        {subtitle && <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.125rem' }}>{subtitle}</div>}
      </div>
    </div>
  )
}

export function ProfilePage() {
  const data = useAppStore((state) => state.data)
  const session = useAppStore((state) => state.session)
  const changePassword = useAppStore((state) => state.changePassword)
  const updateProfile = useAppStore((state) => state.updateProfile)

  const currentUser = getCurrentUser(data, session.currentUserId)
  const company = data.companies.find((c) => c.id === currentUser?.companyId)
  const role = data.roles.find((r) => r.id === currentUser?.roleId)

  const [firstName, setFirstName] = useState(currentUser?.firstName ?? '')
  const [lastName, setLastName] = useState(currentUser?.lastName ?? '')
  const [phone, setPhone] = useState(currentUser?.phone ?? '')
  const [profileMsg, setProfileMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwMsg, setPwMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    setFirstName(currentUser?.firstName ?? '')
    setLastName(currentUser?.lastName ?? '')
    setPhone(currentUser?.phone ?? '')
  }, [currentUser?.id])

  function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = updateProfile({ firstName, lastName, phone })
    setProfileMsg({ kind: result.ok ? 'success' : 'error', text: result.message })
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (newPw !== confirmPw) {
      setPwMsg({ kind: 'error', text: 'Yeni şifreler eşleşmiyor.' })
      return
    }
    if (hasTokens()) {
      try {
        const apiResult = await authApi.changePassword(currentPw, newPw)
        changePassword(currentPw, newPw) // sync local state too
        setPwMsg({ kind: apiResult.ok ? 'success' : 'error', text: apiResult.message })
        if (apiResult.ok) { setCurrentPw(''); setNewPw(''); setConfirmPw('') }
        return
      } catch {
        // fall through to local
      }
    }
    const result = changePassword(currentPw, newPw)
    setPwMsg({ kind: result.ok ? 'success' : 'error', text: result.message })
    if (result.ok) { setCurrentPw(''); setNewPw(''); setConfirmPw('') }
  }

  if (!currentUser) return null

  return (
    <div className="page-stack">
      {/* Hero Banner */}
      <div
        style={{
          borderRadius: 16,
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 60%, #134e4a 100%)',
          padding: '2rem 2rem 2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(13,148,136,0.15)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, right: 80, width: 140, height: 140, borderRadius: '50%', background: 'rgba(13,148,136,0.08)', pointerEvents: 'none' }} />

        <Avatar firstName={currentUser.firstName} lastName={currentUser.lastName} size={72} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: '1.375rem', color: '#fff', lineHeight: 1.2 }}>
            {formatFullName(currentUser)}
          </div>
          <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.55)', marginTop: '0.25rem' }}>
            {currentUser.email}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            {role && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.625rem', borderRadius: 99, background: 'rgba(13,148,136,0.25)', border: '1px solid rgba(13,148,136,0.4)', color: '#5eead4', fontSize: '0.75rem', fontWeight: 600 }}>
                <Shield size={11} />
                {role.name}
              </span>
            )}
            {company && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.625rem', borderRadius: 99, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: 500 }}>
                <Building2 size={11} />
                {company.name}
              </span>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem', borderRadius: 99, background: currentUser.isActive ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${currentUser.isActive ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, color: currentUser.isActive ? '#86efac' : '#fca5a5', fontSize: '0.75rem', fontWeight: 600 }}>
            <CheckCircle2 size={12} />
            {currentUser.isActive ? 'Aktif Hesap' : 'Pasif Hesap'}
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', alignItems: 'start' }}>

        {/* Left: Profile Info */}
        <SectionCard>
          <SectionHeader icon={<User size={18} />} title="Kişisel Bilgiler" subtitle="Adınızı ve iletişim bilgilerinizi güncelleyin" />

          {/* Read-only info rows */}
          <div style={{ padding: '0.5rem 1.5rem 0' }}>
            <InfoRow icon={<Mail size={15} />} label="E-posta" value={currentUser.email} />
            <InfoRow icon={<Building2 size={15} />} label="Firma" value={company?.name ?? '—'} />
            <InfoRow icon={<Shield size={15} />} label="Sistem Rolü" value={role?.name ?? '—'} />
          </div>

          {/* Editable form */}
          <form onSubmit={handleProfileSubmit} style={{ padding: '1.25rem 1.5rem' }}>
            {profileMsg && (
              <div style={{ marginBottom: '1rem' }}>
                <InlineMessage kind={profileMsg.kind} message={profileMsg.text} />
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <FormField label="Ad">
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </FormField>
              <FormField label="Soyad">
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </FormField>
            </div>
            <FormField label="Telefon">
              <div style={{ position: 'relative' }}>
                <Phone size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+905xxxxxxxxx" style={{ paddingLeft: '2rem' }} />
              </div>
            </FormField>
            <div style={{ marginTop: '1.25rem' }}>
              <Button type="submit" variant="primary" fill>
                <User size={14} />
                Bilgileri Kaydet
              </Button>
            </div>
          </form>
        </SectionCard>

        {/* Right: Change Password */}
        <SectionCard>
          <SectionHeader icon={<KeyRound size={18} />} title="Şifre Değiştir" subtitle="Hesabınızı güvende tutmak için şifrenizi düzenli güncelleyin" />

          {/* Password strength hint */}
          <div style={{ margin: '1rem 1.5rem 0', padding: '0.75rem 1rem', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
            <Shield size={15} style={{ color: '#0d9488', flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: '0.8125rem', color: '#475569', margin: 0, lineHeight: 1.5 }}>
              Güçlü bir şifre için büyük/küçük harf, rakam ve özel karakter kullanmanızı öneririz.
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} style={{ padding: '1.25rem 1.5rem' }}>
            {pwMsg && (
              <div style={{ marginBottom: '1rem' }}>
                <InlineMessage kind={pwMsg.kind} message={pwMsg.text} />
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <FormField label="Mevcut Şifre">
                <Input
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </FormField>
              <div style={{ borderTop: '1px dashed #E2E8F0', paddingTop: '0.75rem' }}>
                <FormField label="Yeni Şifre" hint="En az 6 karakter olmalıdır.">
                  <Input
                    type="password"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </FormField>
              </div>
              <FormField label="Yeni Şifre (Tekrar)">
                <Input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </FormField>
              {/* Match indicator */}
              {newPw && confirmPw && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: newPw === confirmPw ? '#16a34a' : '#dc2626' }}>
                  <CheckCircle2 size={14} />
                  {newPw === confirmPw ? 'Şifreler eşleşiyor' : 'Şifreler eşleşmiyor'}
                </div>
              )}
            </div>
            <div style={{ marginTop: '1.25rem' }}>
              <Button type="submit" variant="primary" fill>
                <KeyRound size={14} />
                Şifreyi Güncelle
              </Button>
            </div>
          </form>
        </SectionCard>
      </div>
    </div>
  )
}
