import { useState } from 'react'
import { ArrowRight, Languages, LockKeyhole, Mail, ShieldCheck, Zap, BarChart3, Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { getCurrentRoleKey } from '../domain/selectors'
import { getRoleDefinition } from '../domain/workflow'
import { authApi, setTokens, ApiError } from '../services/api'
import { useAppStore } from '../store/app-store'
import { InlineMessage } from '../components/ui'

/* ─── role → avatar colour ─────────────────────────────── */
const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  'Sistem Yöneticisi':          { bg: '#EDE9FE', color: '#7C3AED' },
  'Vardiya Amiri / Ekip Lideri':{ bg: '#FEF3C7', color: '#D97706' },
  'Tedarikçi Firma':            { bg: '#DBEAFE', color: '#2563EB' },
  'Sevkiyat Operasyon':         { bg: '#DCFCE7', color: '#16A34A' },
  'Dış Güvenlik':               { bg: '#FFE4E6', color: '#E11D48' },
}

const DEMO_ROLE_CARDS = [
  { id: 'demo-role-superadmin',    title: 'Sistem Yöneticisi',           userId: 'user-superadmin-kerem', homePath: '/dashboard',       description: 'Tam sistem erişimi',        userName: 'Kerem Başaran',  companyName: 'Gratis' },
  { id: 'demo-role-admin',         title: 'Vardiya Amiri / Ekip Lideri', userId: 'user-admin-eda',        homePath: '/dashboard',       description: 'Tüm süreçleri yönetir',     userName: 'Eda Yılmaz',    companyName: 'Gratis' },
  { id: 'demo-role-supplier-mars', title: 'Tedarikçi Firma',             userId: 'user-supplier-mert',    homePath: '/talepler',        description: 'Araç & sürücü atar',        userName: 'Mert Demir',    companyName: 'Mars Lojistik' },
  { id: 'demo-role-supplier-mevlana', title: 'Tedarikçi Firma',          userId: 'user-supplier-elif',    homePath: '/talepler',        description: 'Araç & sürücü atar',        userName: 'Elif Şahin',    companyName: 'Mevlana Nakliyat' },
  { id: 'demo-role-supplier-horoz',title: 'Tedarikçi Firma',             userId: 'user-supplier-bora',    homePath: '/talepler',        description: 'Araç & sürücü atar',        userName: 'Bora Kaya',     companyName: 'Horoz Lojistik' },
  { id: 'demo-role-operations',    title: 'Sevkiyat Operasyon',          userId: 'user-control-selin',    homePath: '/talepler',        description: 'Rampa planlar & onaylar',   userName: 'Selin Çelik',   companyName: 'Gratis' },
  { id: 'demo-role-security',      title: 'Dış Güvenlik',                userId: 'user-gate-cem',         homePath: '/kapi-operasyonu', description: 'Araç kaydı & kapı kontrol', userName: 'Cem Sarı',      companyName: 'Gratis' },
] as const

const FEATURES = [
  { icon: ShieldCheck, label: '7 Farklı Rol',    sub: 'Rol bazlı erişim kontrolü' },
  { icon: Zap,         label: '21 Durum',         sub: 'State machine akış motoru' },
  { icon: Bell,        label: 'Gerçek Zamanlı',   sub: 'Anlık bildirim sistemi' },
  { icon: BarChart3,   label: 'Audit Log',        sub: 'Tam izlenebilirlik' },
]

/* ─── helpers ───────────────────────────────────────────── */
function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

/* ─── page ───────────────────────────────────────────────── */
export function LoginPage() {
  const navigate = useNavigate()
  const loginWithEmail = useAppStore((state) => state.loginWithEmail)
  const loginAs        = useAppStore((state) => state.loginAs)
  const loadFromApi    = useAppStore((state) => state.loadFromApi)

  const [email,    setEmail]    = useState('ozgur.caglayan@gratis.demo')
  const [password, setPassword] = useState('demo123')
  const [message,  setMessage]  = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [loading,  setLoading]  = useState(false)

  async function openUserSession(userId: string, homePath?: string) {
    setLoading(true)
    try {
      const response = await authApi.demoLogin(userId)
      setTokens(response.accessToken, response.refreshToken)
      await loadFromApi()
      loginAs(response.user.id)
      navigate(homePath ?? getRoleDefinition(response.user.roleKey as never)?.homePath ?? '/dashboard')
    } catch {
      const result = loginAs(userId)
      if (!result.ok) { setMessage({ kind: 'error', text: result.message }); setLoading(false); return }
      const storeUser = useAppStore.getState().data.users.find((u) => u.id === userId)
      const roleKey = getCurrentRoleKey(storeUser)
      navigate(homePath ?? getRoleDefinition(roleKey ?? 'admin')?.homePath ?? '/dashboard')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      const response = await authApi.login(email, password)
      setTokens(response.accessToken, response.refreshToken)
      await loadFromApi()
      loginAs(response.user.id, response.user.mustChangePassword)
      navigate(getRoleDefinition(response.user.roleKey as never)?.homePath ?? '/dashboard')
    } catch (err) {
      if (err instanceof ApiError) { setMessage({ kind: 'error', text: err.message }); setLoading(false); return }
      const result = loginWithEmail(email, password)
      if (!result.ok) { setMessage({ kind: 'error', text: result.message }); setLoading(false); return }
      const user = useAppStore.getState().data.users.find((u) => u.email === email)
      navigate(getRoleDefinition(getCurrentRoleKey(user) ?? 'admin')?.homePath ?? '/dashboard')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        background: '#0F172A',
      }}
    >
      {/* ══ LEFT: Hero ══════════════════════════════════════ */}
      <div
        style={{
          background: 'linear-gradient(155deg, #0F172A 0%, #0F4C46 55%, #0d9488 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 'clamp(2rem, 5vw, 4rem)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Blobs */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(13,148,136,0.12)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -120, left: -60, width: 350, height: 350, borderRadius: '50%', background: 'rgba(13,148,136,0.07)', pointerEvents: 'none' }} />
        {/* Grid pattern overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />

        <div style={{ position: 'relative' }}>
          {/* Logo mark */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '3rem',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'Manrope, sans-serif',
                fontWeight: 800,
                fontSize: '1rem',
                color: '#fff',
                boxShadow: '0 4px 14px rgba(13,148,136,0.5)',
              }}
            >
              FD
            </div>
            <div>
              <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '1rem', color: '#F1F5F9', letterSpacing: '-0.01em' }}>FlowDock</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.05rem' }}>Logistics Platform</div>
            </div>
          </div>

          {/* Heading */}
          <h1
            style={{
              margin: '0 0 1rem',
              fontFamily: 'Manrope, sans-serif',
              fontWeight: 800,
              fontSize: 'clamp(2rem, 3.5vw, 3rem)',
              color: '#fff',
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
            }}
          >
            Lojistik<br />
            <span style={{ color: '#2dd4bf' }}>operasyonunu</span><br />
            yönet.
          </h1>
          <p
            style={{
              margin: '0 0 3rem',
              fontSize: '1rem',
              color: 'rgba(255,255,255,0.5)',
              lineHeight: 1.6,
              maxWidth: 340,
            }}
          >
            Araç tedarikten çıkış kapısına — tüm sevkiyat sürecini tek panelden izle ve yönet.
          </p>

          {/* Feature grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', maxWidth: 380 }}>
            {FEATURES.map(({ icon: Icon, label, sub }) => (
              <div
                key={label}
                style={{
                  padding: '1rem',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(4px)',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'rgba(13,148,136,0.25)',
                    border: '1px solid rgba(13,148,136,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '0.6rem',
                  }}
                >
                  <Icon size={15} color="#2dd4bf" />
                </div>
                <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '0.875rem', color: '#F1F5F9' }}>{label}</div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.15rem' }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ RIGHT: Login card ════════════════════════════════ */}
      <div
        style={{
          background: '#F8FAFC',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          overflowY: 'auto',
          padding: 'clamp(2rem, 4vw, 3rem) clamp(1.5rem, 5vw, 3.5rem)',
        }}
      >
        <div style={{ maxWidth: 440, width: '100%', margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: '2rem' }}>
            <h2
              style={{
                margin: '0 0 0.375rem',
                fontFamily: 'Manrope, sans-serif',
                fontWeight: 800,
                fontSize: '1.5rem',
                color: '#0F172A',
                letterSpacing: '-0.025em',
              }}
            >
              Hesabınıza giriş yapın
            </h2>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748B' }}>
              Demo şifresi:{' '}
              <code
                style={{
                  background: '#E2E8F0',
                  color: '#334155',
                  padding: '0.1rem 0.4rem',
                  borderRadius: 5,
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                demo123
              </code>
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            {/* Email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>E-posta adresi</label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0 0.875rem',
                  background: '#fff',
                  border: '1px solid #E2E8F0',
                  borderRadius: 10,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  transition: 'border-color 150ms, box-shadow 150ms',
                }}
                onFocusCapture={(e) => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = '#0d9488'
                  el.style.boxShadow = '0 0 0 3px rgba(13,148,136,0.15)'
                }}
                onBlurCapture={(e) => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = '#E2E8F0'
                  el.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)'
                }}
              >
                <Mail size={15} color="#94A3B8" style={{ flexShrink: 0 }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="isim@firma.com"
                  required
                  style={{
                    flex: 1,
                    border: 0,
                    background: 'transparent',
                    outline: 'none',
                    fontSize: '0.9rem',
                    color: '#0F172A',
                    padding: '0.7rem 0',
                    minHeight: 44,
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>Şifre</label>
                <button type="button" style={{ background: 'none', border: 0, cursor: 'pointer', fontSize: '0.78rem', color: '#0d9488', fontWeight: 600, padding: 0 }}>
                  Şifremi unuttum
                </button>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0 0.875rem',
                  background: '#fff',
                  border: '1px solid #E2E8F0',
                  borderRadius: 10,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  transition: 'border-color 150ms, box-shadow 150ms',
                }}
                onFocusCapture={(e) => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = '#0d9488'
                  el.style.boxShadow = '0 0 0 3px rgba(13,148,136,0.15)'
                }}
                onBlurCapture={(e) => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = '#E2E8F0'
                  el.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)'
                }}
              >
                <LockKeyhole size={15} color="#94A3B8" style={{ flexShrink: 0 }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    flex: 1,
                    border: 0,
                    background: 'transparent',
                    outline: 'none',
                    fontSize: '0.9rem',
                    color: '#0F172A',
                    padding: '0.7rem 0',
                    minHeight: 44,
                  }}
                />
              </div>
            </div>

            {/* Language */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>Dil</label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0 0.875rem',
                  background: '#fff',
                  border: '1px solid #E2E8F0',
                  borderRadius: 10,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}
              >
                <Languages size={15} color="#94A3B8" style={{ flexShrink: 0 }} />
                <select
                  defaultValue="tr"
                  style={{
                    flex: 1,
                    border: 0,
                    background: 'transparent',
                    outline: 'none',
                    fontSize: '0.9rem',
                    color: '#0F172A',
                    padding: '0.7rem 0',
                    minHeight: 44,
                    cursor: 'pointer',
                    appearance: 'none',
                  }}
                >
                  <option value="tr">Türkçe</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            {message && <InlineMessage kind={message.kind} message={message.text} />}

            <button
              type="submit"
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                width: '100%',
                minHeight: 48,
                borderRadius: 10,
                background: loading ? '#94A3B8' : 'linear-gradient(135deg, #0d9488, #0f766e)',
                color: '#fff',
                border: 0,
                fontFamily: 'Manrope, sans-serif',
                fontWeight: 700,
                fontSize: '0.9375rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(13,148,136,0.4)',
                transition: 'transform 150ms, box-shadow 150ms',
                letterSpacing: '-0.01em',
              }}
              onMouseEnter={(e) => { if (!loading) { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(13,148,136,0.5)' } }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = loading ? 'none' : '0 4px 14px rgba(13,148,136,0.4)' }}
            >
              {loading ? 'Giriş yapılıyor…' : 'Giriş Yap'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          {/* ── Demo users ── */}
          <div
            style={{
              borderTop: '1px solid #E2E8F0',
              paddingTop: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155' }}>Demo roller</span>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: '#0d9488',
                  background: '#f0fdfa',
                  border: '1px solid #ccfbf1',
                  borderRadius: 99,
                  padding: '0.2rem 0.6rem',
                }}
              >
                Tek tıkla giriş
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {DEMO_ROLE_CARDS.map((card) => {
                const roleColor = ROLE_COLORS[card.title] ?? { bg: '#F1F5F9', color: '#64748B' }
                const ini = initials(card.userName)
                return (
                  <button
                    key={card.id}
                    type="button"
                    disabled={loading}
                    onClick={() => openUserSession(card.userId, card.homePath)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.875rem',
                      padding: '0.75rem 1rem',
                      borderRadius: 12,
                      background: '#fff',
                      border: '1px solid #E2E8F0',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      textAlign: 'left',
                      transition: 'border-color 150ms, box-shadow 150ms, transform 150ms',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                      opacity: loading ? 0.6 : 1,
                    }}
                    onMouseEnter={(e) => { if (!loading) { const el = e.currentTarget; el.style.borderColor = '#0d9488'; el.style.boxShadow = '0 4px 12px rgba(13,148,136,0.15)'; el.style.transform = 'translateY(-1px)' } }}
                    onMouseLeave={(e) => { const el = e.currentTarget; el.style.borderColor = '#E2E8F0'; el.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)'; el.style.transform = '' }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        background: roleColor.bg,
                        color: roleColor.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        flexShrink: 0,
                        fontFamily: 'Manrope, sans-serif',
                        border: `1.5px solid ${roleColor.color}22`,
                      }}
                    >
                      {ini}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {card.userName}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.1rem' }}>
                        {card.companyName}
                      </div>
                    </div>

                    {/* Role badge */}
                    <span
                      style={{
                        flexShrink: 0,
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: roleColor.color,
                        background: roleColor.bg,
                        border: `1px solid ${roleColor.color}30`,
                        borderRadius: 99,
                        padding: '0.2rem 0.5rem',
                        whiteSpace: 'nowrap',
                        maxWidth: 120,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {card.title}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
