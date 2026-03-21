import { useState } from 'react'
import { Shield, Plus, Trash2 } from 'lucide-react'

import { Card, PageHeader, Button, Badge, FormField, Input, InlineMessage } from '../components/ui'
import { ROLE_DEFINITIONS } from '../domain/constants'
import { useAppStore } from '../store/app-store'

const TONE_MAP: Record<string, 'info' | 'success' | 'warning' | 'neutral'> = {
  superadmin: 'warning',
  admin: 'info',
  requester: 'neutral',
  supplier: 'neutral',
  control: 'neutral',
  ramp: 'neutral',
  gate: 'neutral',
  loading: 'neutral',
}

export function RoleManagementPage() {
  const customRoles = useAppStore((state) => state.customRoles)
  const addCustomRole = useAppStore((state) => state.addCustomRole)
  const removeCustomRole = useAppStore((state) => state.removeCustomRole)

  const [showForm, setShowForm] = useState(false)
  const [roleName, setRoleName] = useState('')
  const [roleDesc, setRoleDesc] = useState('')
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  function handleSave() {
    if (!roleName.trim()) return
    addCustomRole(roleName.trim(), roleDesc.trim())
    setMessage({ kind: 'success', text: `"${roleName.trim()}" rolü oluşturuldu.` })
    setRoleName('')
    setRoleDesc('')
    setShowForm(false)
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Sistem Yönetimi"
        title="Rol Yönetimi"
        description="Sistemdeki tüm rolleri görüntüleyin ve özel roller oluşturun."
        actions={
          !showForm ? (
            <Button onClick={() => { setShowForm(true); setMessage(null) }}>
              <Plus size={16} />
              Yeni Rol Ekle
            </Button>
          ) : undefined
        }
      />

      {message && <InlineMessage kind={message.kind} message={message.text} />}

      {showForm && (
        <Card title="Yeni Rol Oluştur">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 480 }}>
            <FormField label="Rol Adı">
              <Input
                placeholder="ör. Depo Sorumlusu"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
              />
            </FormField>
            <FormField label="Açıklama">
              <Input
                placeholder="Bu rolün görevi nedir?"
                value={roleDesc}
                onChange={(e) => setRoleDesc(e.target.value)}
              />
            </FormField>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button onClick={handleSave} disabled={!roleName.trim()}>Kaydet</Button>
              <Button variant="secondary" onClick={() => { setShowForm(false); setRoleName(''); setRoleDesc('') }}>İptal</Button>
            </div>
          </div>
        </Card>
      )}

      <Card title={`Sistem Rolleri (${ROLE_DEFINITIONS.length})`} subtitle="Yerleşik roller silinemez.">
        <div className="stack-list">
          {ROLE_DEFINITIONS.map((role) => (
            <div key={role.id} className="stack-list__item">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Shield size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                <div>
                  <strong>{role.name}</strong>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{role.description}</p>
                </div>
              </div>
              <div className="stack-list__actions">
                <Badge tone={TONE_MAP[role.key] ?? 'neutral'}>{role.key}</Badge>
                <Badge tone="success">Sistem</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {customRoles.length > 0 && (
        <Card title={`Özel Roller (${customRoles.length})`}>
          <div className="stack-list">
            {customRoles.map((role) => (
              <div key={role.id} className="stack-list__item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Shield size={16} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
                  <div>
                    <strong>{role.name}</strong>
                    {role.description && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{role.description}</p>
                    )}
                  </div>
                </div>
                <div className="stack-list__actions">
                  <Badge tone="warning">Özel</Badge>
                  <Button size="sm" variant="secondary" onClick={() => removeCustomRole(role.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
