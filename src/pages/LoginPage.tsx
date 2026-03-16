import { useState } from 'react'
import { Languages, LockKeyhole, Mail, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { getCurrentRoleKey } from '../domain/selectors'
import { getRoleDefinition } from '../domain/workflow'
import { useAppStore } from '../store/app-store'
import { Button, FormField, InlineMessage, Input, Select } from '../components/ui'

const DEMO_ROLE_CARDS = [
  {
    id: 'demo-role-admin',
    title: 'Vardiya Amiri / Ekip Lideri',
    userId: 'user-admin-eda',
    homePath: '/dashboard',
    description: 'Tüm süreçleri yönetir',
  },
  {
    id: 'demo-role-supplier-mars',
    title: 'Tedarikçi Firma',
    userId: 'user-supplier-mert',
    homePath: '/talepler',
    description: 'Araç & sürücü atar',
  },
  {
    id: 'demo-role-supplier-mevlana',
    title: 'Tedarikçi Firma',
    userId: 'user-supplier-elif',
    homePath: '/talepler',
    description: 'Araç & sürücü atar',
  },
  {
    id: 'demo-role-supplier-horoz',
    title: 'Tedarikçi Firma',
    userId: 'user-supplier-bora',
    homePath: '/talepler',
    description: 'Araç & sürücü atar',
  },
  {
    id: 'demo-role-operations',
    title: 'Sevkiyat Operasyon',
    userId: 'user-control-selin',
    homePath: '/talepler',
    description: 'Rampa planlar & onaylar',
  },
  {
    id: 'demo-role-security',
    title: 'Dış Güvenlik',
    userId: 'user-gate-cem',
    homePath: '/kapi-operasyonu',
    description: 'Araç kaydı & kapı kontrol',
  },
] as const

export function LoginPage() {
  const navigate = useNavigate()
  const data = useAppStore((state) => state.data)
  const loginWithEmail = useAppStore((state) => state.loginWithEmail)
  const loginAs = useAppStore((state) => state.loginAs)
  const [email, setEmail] = useState('ozgur.caglayan@gratis.demo')
  const [password, setPassword] = useState('demo123')
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  function openUserSession(userId: string, homePath?: string) {
    const result = loginAs(userId)
    if (!result.ok) {
      setMessage({ kind: 'error', text: result.message })
      return
    }

    const user = data.users.find((item) => item.id === userId)
    const roleKey = getCurrentRoleKey(user)
    navigate(homePath ?? getRoleDefinition(roleKey ?? 'admin')?.homePath ?? '/dashboard')
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = loginWithEmail(email, password)
    if (!result.ok) {
      setMessage({ kind: 'error', text: result.message })
      return
    }

    const user = data.users.find((item) => item.email === email)
    const roleKey = getCurrentRoleKey(user)
    navigate(getRoleDefinition(roleKey ?? 'admin')?.homePath ?? '/dashboard')
  }

  return (
    <div className="login-page">
      {/* ── Hero Panel ── */}
      <div className="login-page__hero">
        <div style={{ position: 'relative', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'rgba(13, 148, 136, 0.3)',
            border: '1px solid rgba(13, 148, 136, 0.4)',
            marginBottom: '1.5rem',
          }}>
            <span style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: '1.25rem', color: '#fff' }}>FD</span>
          </div>
          <h1 className="login-page__wordmark">Sevkiyat<br />Lojistik</h1>
          <p className="login-page__tagline">Kurumsal lojistik operasyon yönetim sistemi</p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.75rem',
            marginTop: '2.5rem',
            maxWidth: 320,
            margin: '2.5rem auto 0',
          }}>
            {[
              { label: '7 Rol', sub: 'Rol bazlı erişim' },
              { label: '21 Durum', sub: 'State machine akış' },
              { label: 'Gerçek Zamanlı', sub: 'Bildirim sistemi' },
              { label: 'Audit Log', sub: 'Tam izlenebilirlik' },
            ].map((item) => (
              <div key={item.label} style={{
                padding: '0.875rem',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                textAlign: 'left',
              }}>
                <div style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '0.9375rem', color: '#fff' }}>{item.label}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.2rem' }}>{item.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Login Card ── */}
      <div className="login-card">
        <div className="login-card__inner">
          <div className="login-card__brand">
            <div className="login-card__logo">FD</div>
            <div>
              <strong>Kurumsal Giriş</strong>
              <p>Demo şifresi: <code style={{ background: 'var(--bg)', padding: '0.1rem 0.3rem', borderRadius: 4, fontSize: '0.75rem' }}>demo123</code></p>
            </div>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <FormField label="E-posta adresi">
              <div className="input-with-icon">
                <Mail size={15} />
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="isim@firma.com"
                />
              </div>
            </FormField>

            <FormField label="Şifre">
              <div className="input-with-icon">
                <LockKeyhole size={15} />
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Şifrenizi girin"
                />
              </div>
            </FormField>

            <FormField label="Dil">
              <div className="input-with-icon">
                <Languages size={15} />
                <Select defaultValue="tr">
                  <option value="tr">Türkçe</option>
                  <option value="en">English</option>
                </Select>
              </div>
            </FormField>

            {message && <InlineMessage kind={message.kind} message={message.text} />}

            <Button type="submit" fill size="lg">
              Giriş Yap
              <ArrowRight size={16} />
            </Button>

            <button type="button" className="link-button" style={{ textAlign: 'center' }}>
              Şifremi unuttum
            </button>
          </form>

          {/* Demo Users */}
          <div className="demo-users">
            <div className="demo-users__header">
              <strong>Demo roller</strong>
              <span>Tek tıkla giriş</span>
            </div>
            <div className="demo-users__grid">
              {DEMO_ROLE_CARDS.map((card) => {
                const user = data.users.find((item) => item.id === card.userId)
                if (!user) return null

                const company = data.companies.find((item) => item.id === user.companyId)
                return (
                  <button
                    key={card.id}
                    type="button"
                    className="demo-user-card"
                    onClick={() => openUserSession(user.id, card.homePath)}
                  >
                    <div>
                      <strong>{card.title}</strong>
                      <p>{company?.name}</p>
                    </div>
                    <span>{user.firstName} {user.lastName}</span>
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
