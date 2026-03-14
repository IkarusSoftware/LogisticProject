import { useState } from 'react'
import { Languages, LockKeyhole, Mail } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { getCurrentRoleKey } from '../domain/selectors'
import { getRoleDefinition } from '../domain/workflow'
import { useAppStore } from '../store/app-store'
import { Button, Card, FormField, InlineMessage, Input, Select } from '../components/ui'

const DEMO_ROLE_CARDS = [
  {
    id: 'demo-role-admin',
    title: 'Vardiya Amiri / Ekip Lideri',
    userId: 'user-admin-eda',
    homePath: '/dashboard',
  },
  {
    id: 'demo-role-supplier-mars',
    title: 'Tedarikci Firma',
    userId: 'user-supplier-mert',
    homePath: '/talepler',
  },
  {
    id: 'demo-role-supplier-mevlana',
    title: 'Tedarikci Firma',
    userId: 'user-supplier-elif',
    homePath: '/talepler',
  },
  {
    id: 'demo-role-supplier-horoz',
    title: 'Tedarikci Firma',
    userId: 'user-supplier-bora',
    homePath: '/talepler',
  },
  {
    id: 'demo-role-operations',
    title: 'Sevkiyat Operasyon',
    userId: 'user-control-selin',
    homePath: '/talepler',
  },
  {
    id: 'demo-role-security',
    title: 'Dis Guvenlik',
    userId: 'user-gate-cem',
    homePath: '/kapi-operasyonu',
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
      <div className="login-page__hero">
        <h1 className="login-page__wordmark">Sevkiyat Lojistik</h1>
      </div>

      <Card className="login-card">
        <div className="login-card__brand">
          <div className="login-card__logo">FD</div>
          <div>
            <strong>Kurumsal giris</strong>
            <p>Demo sifresi: demo123</p>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <FormField label="E-posta">
            <div className="input-with-icon">
              <Mail size={16} />
              <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="isim@firma.com" />
            </div>
          </FormField>

          <FormField label="Sifre">
            <div className="input-with-icon">
              <LockKeyhole size={16} />
              <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Demo sifresi" />
            </div>
          </FormField>

          <FormField label="Dil">
            <div className="input-with-icon">
              <Languages size={16} />
              <Select defaultValue="tr">
                <option value="tr">Turkce</option>
                <option value="en">English</option>
              </Select>
            </div>
          </FormField>

          {message && <InlineMessage kind={message.kind} message={message.text} />}

          <Button type="submit" fill size="lg">
            Giris Yap
          </Button>

          <button type="button" className="link-button">
            Sifremi unuttum
          </button>
        </form>

        <div className="demo-users">
          <div className="demo-users__header">
            <strong>Demo roller</strong>
            <span>Tek tikla giris</span>
          </div>
          <div className="demo-users__grid">
            {DEMO_ROLE_CARDS.map((card) => {
              const user = data.users.find((item) => item.id === card.userId)
              if (!user) {
                return null
              }

              const company = data.companies.find((item) => item.id === user.companyId)
              return (
                <button key={card.id} type="button" className="demo-user-card" onClick={() => openUserSession(user.id, card.homePath)}>
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
      </Card>
    </div>
  )
}
