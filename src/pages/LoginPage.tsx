import { useState } from 'react'
import { Languages, LockKeyhole, Mail } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { ROLE_DEFINITIONS } from '../domain/constants'
import { getCurrentRoleKey } from '../domain/selectors'
import { getRoleDefinition } from '../domain/workflow'
import { useAppStore } from '../store/app-store'
import { Badge, Button, Card, FormField, InlineMessage, Input, Select } from '../components/ui'

export function LoginPage() {
  const navigate = useNavigate()
  const data = useAppStore((state) => state.data)
  const loginWithEmail = useAppStore((state) => state.loginWithEmail)
  const loginAs = useAppStore((state) => state.loginAs)
  const [email, setEmail] = useState('eda.celik@gratis.demo')
  const [password, setPassword] = useState('demo123')
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  function openUserSession(userId: string) {
    const result = loginAs(userId)
    if (!result.ok) {
      setMessage({ kind: 'error', text: result.message })
      return
    }

    const user = data.users.find((item) => item.id === userId)
    const roleKey = getCurrentRoleKey(user)
    navigate(getRoleDefinition(roleKey ?? 'admin')?.homePath ?? '/dashboard')
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
        <Badge tone="info">FlowDock Logistics</Badge>
        <h1>Sevkiyat operasyonlarini tek ekranda yonetin.</h1>
        <p>
          Tedarikci atamasindan muhurlu cikisa kadar tum surec, rol bazli ekranlar ve audit log ile ayni is akisi
          icinde ilerler.
        </p>

        <div className="login-highlights">
          <Card>
            <strong>State-machine akisi</strong>
            <p>Zorunlu adimlar atlanamaz, kritik gecisler loglanir.</p>
          </Card>
          <Card>
            <strong>Excel aliskanligina yakin</strong>
            <p>Yuksek okunabilirlikte tablo, filtre ve hizli aksiyon yapisi.</p>
          </Card>
          <Card>
            <strong>Teknik olmayan kullanicilar icin</strong>
            <p>Buyuk butonlar, sade formlar ve acik dil ile tasarlandi.</p>
          </Card>
        </div>
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
            {ROLE_DEFINITIONS.map((role) => {
              const user = data.users.find((item) => item.roleId === role.id)
              if (!user) {
                return null
              }

              const company = data.companies.find((item) => item.id === user.companyId)
              return (
                <button key={role.id} type="button" className="demo-user-card" onClick={() => openUserSession(user.id)}>
                  <div>
                    <strong>{role.name}</strong>
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
