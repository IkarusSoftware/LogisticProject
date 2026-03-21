import { useMemo, useState } from 'react'
import { Save, Users } from 'lucide-react'

import { Badge, Button, InlineMessage, PageHeader } from '../components/ui'
import { formatFullName } from '../domain/workflow'
import { useAppStore } from '../store/app-store'

const ROLE_TONE: Record<string, 'info' | 'success' | 'warning' | 'neutral' | 'danger'> = {
  superadmin: 'warning',
  admin: 'info',
  control: 'success',
  gate: 'neutral',
  loading: 'neutral',
  ramp: 'neutral',
  supplier: 'neutral',
  requester: 'neutral',
}

function UserAvatar({ firstName, lastName }: { firstName: string; lastName: string }) {
  return (
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: '50%',
        background: 'var(--color-primary)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.6875rem',
        fontWeight: 700,
        flexShrink: 0,
        letterSpacing: '0.03em',
      }}
    >
      {firstName[0]}{lastName[0]}
    </div>
  )
}

export function UserRoleAssignmentPage() {
  const data = useAppStore((state) => state.data)
  const assignUserRole = useAppStore((state) => state.assignUserRole)

  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const pendingCount = Object.keys(pendingChanges).length

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return data.users.filter((user) => {
      if (q) {
        const name = formatFullName(user).toLowerCase()
        if (!name.includes(q) && !user.email.toLowerCase().includes(q)) return false
      }
      if (roleFilter) {
        const effective = pendingChanges[user.id] ?? user.roleId
        if (effective !== roleFilter) return false
      }
      return true
    })
  }, [data.users, search, roleFilter, pendingChanges])

  function handleRoleChange(userId: string, roleId: string) {
    const original = data.users.find((u) => u.id === userId)?.roleId
    if (roleId === original) {
      setPendingChanges((prev) => {
        const next = { ...prev }
        delete next[userId]
        return next
      })
    } else {
      setPendingChanges((prev) => ({ ...prev, [userId]: roleId }))
    }
  }

  function handleSaveUser(userId: string) {
    const roleId = pendingChanges[userId]
    if (!roleId) return
    assignUserRole(userId, roleId)
    const roleName = data.roles.find((r) => r.id === roleId)?.name ?? roleId
    const user = data.users.find((u) => u.id === userId)
    setMessage({ kind: 'success', text: `${formatFullName(user!)} → ${roleName} olarak güncellendi.` })
    setPendingChanges((prev) => {
      const next = { ...prev }
      delete next[userId]
      return next
    })
  }

  function handleSaveAll() {
    const entries = Object.entries(pendingChanges)
    entries.forEach(([userId, roleId]) => assignUserRole(userId, roleId))
    setMessage({ kind: 'success', text: `${entries.length} kullanıcı rolü güncellendi.` })
    setPendingChanges({})
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Sistem Yönetimi"
        title="Kullanıcı-Rol Eşleme"
        description="Kullanıcılara sistem rolü atayın. Değişiklikler kaydedilene kadar uygulanmaz."
        actions={
          pendingCount > 0 ? (
            <Button variant="primary" onClick={handleSaveAll}>
              <Save size={14} />
              Tümünü Kaydet ({pendingCount})
            </Button>
          ) : undefined
        }
      />

      {message && <InlineMessage kind={message.kind} message={message.text} />}

      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <input
          className="table-input"
          style={{ flex: '1 1 220px', maxWidth: 320 }}
          placeholder="İsim veya e-posta ile ara…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          style={{
            padding: '0.4375rem 0.75rem',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.8125rem',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            cursor: 'pointer',
            minWidth: 180,
          }}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">Tüm roller</option>
          {data.roles.map((role) => (
            <option key={role.id} value={role.id}>{role.name}</option>
          ))}
        </select>
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <Users size={14} />
          {filtered.length} kullanıcı
          {pendingCount > 0 && (
            <span style={{ marginLeft: '0.5rem', padding: '0.125rem 0.5rem', background: 'var(--color-warning-subtle, #fffbeb)', color: 'var(--color-warning, #d97706)', border: '1px solid var(--color-warning-border, #fde68a)', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600 }}>
              {pendingCount} bekleyen değişiklik
            </span>
          )}
        </span>
      </div>

      {/* Table */}
      <div className="table-shell">
        <table className="data-table">
          <thead>
            <tr>
              <th>Kullanıcı</th>
              <th>Firma</th>
              <th>Mevcut Rol</th>
              <th>Yeni Rol</th>
              <th style={{ width: 100 }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                  Eşleşen kullanıcı bulunamadı.
                </td>
              </tr>
            )}
            {filtered.map((user) => {
              const effectiveRoleId = pendingChanges[user.id] ?? user.roleId
              const currentRole = data.roles.find((r) => r.id === user.roleId)
              const effectiveRole = data.roles.find((r) => r.id === effectiveRoleId)
              const company = data.companies.find((c) => c.id === user.companyId)
              const isDirty = pendingChanges[user.id] !== undefined

              return (
                <tr key={user.id} className={`data-table__row data-table__row--static${isDirty ? ' data-table__row--highlighted' : ''}`}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <UserAvatar firstName={user.firstName} lastName={user.lastName} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          {formatFullName(user)}
                          {!user.isActive && (
                            <Badge tone="danger" style={{ fontSize: '0.625rem' }}>Pasif</Badge>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: company ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                    {company?.name ?? '—'}
                  </td>
                  <td>
                    {currentRole ? (
                      <Badge tone={ROLE_TONE[currentRole.key ?? ''] ?? 'neutral'}>
                        {currentRole.name}
                      </Badge>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>—</span>
                    )}
                  </td>
                  <td>
                    <select
                      style={{
                        padding: '0.375rem 0.625rem',
                        border: `1px solid ${isDirty ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.8125rem',
                        background: isDirty ? 'var(--color-primary-subtle, #f0fdfa)' : 'var(--color-surface)',
                        color: 'var(--color-text)',
                        cursor: 'pointer',
                        fontWeight: isDirty ? 600 : 400,
                        outline: 'none',
                        width: '100%',
                        maxWidth: 220,
                      }}
                      value={effectiveRoleId}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    >
                      {data.roles.map((role) => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {isDirty ? (
                      <Button size="sm" variant="primary" onClick={() => handleSaveUser(user.id)}>
                        <Save size={13} />
                        Kaydet
                      </Button>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {effectiveRole?.key === 'superadmin' || effectiveRole?.key === 'admin' ? '✓ Yönetici' : '—'}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
