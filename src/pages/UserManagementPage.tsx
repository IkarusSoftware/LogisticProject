import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'

import { ROLE_DEFINITIONS } from '../domain/constants'
import type { CreateUserInput, UpdateUserInput } from '../domain/models'
import { formatFullName, getRoleDefinition, getRoleKeyByRoleId } from '../domain/workflow'
import { hasTokens, lookupApi, userApi } from '../services/api'
import type { LookupCompany, LookupRole, UserDto } from '../services/types'
import { useAppStore } from '../store/app-store'
import { Badge, Button, Card, FormField, Input, InlineMessage, PageHeader, Select } from '../components/ui'
import { DataTable, createColumnHelper, type ColumnDef } from '../components/data-table'

type FormMode = 'list' | 'create' | 'edit'

const EMPTY_FORM: CreateUserInput = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  roleId: '',
  companyId: '',
  password: '',
}

export function UserManagementPage() {
  const data = useAppStore((state) => state.data)
  const createUser = useAppStore((state) => state.createUser)
  const updateUser = useAppStore((state) => state.updateUser)
  const toggleUserStatus = useAppStore((state) => state.toggleUserStatus)
  const deleteUser = useAppStore((state) => state.deleteUser)
  const currentUserId = useAppStore((state) => state.session.currentUserId)

  const [mode, setMode] = useState<FormMode>('list')
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; fullName: string } | null>(null)
  const [form, setForm] = useState<CreateUserInput>(EMPTY_FORM)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  // API state
  const [apiUsers, setApiUsers] = useState<UserDto[] | null>(null)
  const [apiRoles, setApiRoles] = useState<LookupRole[] | null>(null)
  const [apiCompanies, setApiCompanies] = useState<LookupCompany[] | null>(null)
  const [loading, setLoading] = useState(false)
  const useApi = hasTokens()

  const fetchUsers = useCallback(async () => {
    if (!hasTokens()) return
    setLoading(true)
    try {
      const [usersResult, roles, companies] = await Promise.all([
        userApi.list({ page: 1, pageSize: 100 }),
        apiRoles ? Promise.resolve(apiRoles) : lookupApi.roles(),
        apiCompanies ? Promise.resolve(apiCompanies) : lookupApi.companies(),
      ])
      setApiUsers(usersResult.items)
      setApiRoles(roles)
      setApiCompanies(companies)
    } catch {
      setApiUsers(null) // fallback to Zustand
    } finally {
      setLoading(false)
    }
  }, [apiRoles, apiCompanies])

  useEffect(() => {
    fetchUsers()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Unified row type for DataTable
  type UserRow = {
    id: string
    fullName: string
    email: string
    roleKey: string
    roleName: string
    companyName: string
    isActive: boolean
  }

  const userRows = useMemo<UserRow[]>(() => {
    if (apiUsers) {
      return apiUsers.map((u) => ({
        id: u.id,
        fullName: `${u.firstName} ${u.lastName}`,
        email: u.email,
        roleKey: u.roleKey,
        roleName: u.roleName,
        companyName: u.companyName,
        isActive: u.isActive,
      }))
    }
    return data.users.map((u) => {
      const rKey = getRoleKeyByRoleId(u.roleId)
      const roleDef = rKey ? getRoleDefinition(rKey) : undefined
      const company = data.companies.find((c) => c.id === u.companyId)
      return {
        id: u.id,
        fullName: formatFullName(u),
        email: u.email,
        roleKey: rKey ?? '',
        roleName: roleDef?.name ?? u.roleId,
        companyName: company?.name ?? '-',
        isActive: u.isActive,
      }
    })
  }, [apiUsers, data.users, data.companies])

  const userColumns = useMemo<ColumnDef<UserRow, any>[]>(() => {
    const ch = createColumnHelper<UserRow>()
    return [
      ch.accessor('fullName', {
        header: 'Ad Soyad',
        cell: ({ getValue }) => <strong>{getValue()}</strong>,
      }),
      ch.accessor('email', { header: 'E-posta' }),
      ch.display({
        id: 'role',
        header: 'Rol',
        cell: ({ row }) => (
          <Badge tone={row.original.roleKey === 'superadmin' ? 'warning' : row.original.roleKey === 'admin' ? 'info' : 'neutral'}>
            {row.original.roleName}
          </Badge>
        ),
        meta: { exportValue: (row) => row.roleName },
      }),
      ch.accessor('companyName', { header: 'Sirket' }),
      ch.display({
        id: 'status',
        header: 'Durum',
        cell: ({ row }) => (
          <Badge tone={row.original.isActive ? 'success' : 'danger'}>
            {row.original.isActive ? 'Aktif' : 'Pasif'}
          </Badge>
        ),
        meta: { exportValue: (row) => (row.isActive ? 'Aktif' : 'Pasif') },
      }),
      ch.display({
        id: 'actions',
        header: 'Islemler',
        cell: ({ row }) => (
          <div className="table-action-group" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" onClick={() => handleEdit(row.original.id)}>
              Duzenle
            </Button>
            <Button
              variant={row.original.isActive ? 'danger' : 'success'}
              size="sm"
              onClick={() => handleToggleStatus(row.original.id)}
            >
              {row.original.isActive ? 'Pasif Yap' : 'Aktif Yap'}
            </Button>
            {row.original.id !== currentUserId && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setDeleteConfirm({ id: row.original.id, fullName: row.original.fullName })}
              >
                <Trash2 size={13} />
              </Button>
            )}
          </div>
        ),
        meta: { noExport: true },
        enableSorting: false,
      }),
    ]
  }, [handleEdit, handleToggleStatus])

  function handleFormChange<K extends keyof CreateUserInput>(key: K, value: CreateUserInput[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function handleCreate() {
    setMode('create')
    setEditingUserId(null)
    setForm(EMPTY_FORM)
    setMessage(null)
  }

  function handleEdit(userId: string) {
    if (apiUsers) {
      const user = apiUsers.find((u) => u.id === userId)
      if (!user) return
      // Map API user to form - find matching roleId and companyId for dropdowns
      const roleId = apiRoles
        ? apiRoles.find((r) => r.key === user.roleKey)?.id ?? ''
        : ROLE_DEFINITIONS.find((r) => r.key === user.roleKey)?.id ?? ''
      const companyId = apiCompanies
        ? user.companyId
        : data.companies.find((c) => c.name === user.companyName)?.id ?? ''

      setMode('edit')
      setEditingUserId(userId)
      setForm({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        roleId,
        companyId,
        password: '',
      })
      setMessage(null)
    } else {
      const user = data.users.find((u) => u.id === userId)
      if (!user) return
      setMode('edit')
      setEditingUserId(userId)
      setForm({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        roleId: user.roleId,
        companyId: user.companyId,
        password: '',
      })
      setMessage(null)
    }
  }

  function handleCancel() {
    setMode('list')
    setEditingUserId(null)
    setForm(EMPTY_FORM)
    setMessage(null)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (mode === 'create') {
      if (useApi && apiRoles) {
        try {
          const roleKey = apiRoles.find((r) => r.id === form.roleId)?.key
            ?? getRoleKeyByRoleId(form.roleId)
            ?? ''
          const companyId = form.companyId
          const result = await userApi.create({
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            phone: form.phone,
            roleKey,
            companyId,
            password: form.password || undefined,
          })
          setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
          if (result.ok) {
            setMode('list')
            setForm(EMPTY_FORM)
            await fetchUsers()
          }
        } catch {
          // Fallback to Zustand
          const result = createUser(form)
          setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
          if (result.ok) { setMode('list'); setForm(EMPTY_FORM) }
        }
      } else {
        const result = createUser(form)
        setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
        if (result.ok) { setMode('list'); setForm(EMPTY_FORM) }
      }
    } else if (mode === 'edit' && editingUserId) {
      if (useApi && apiRoles) {
        try {
          const roleKey = apiRoles.find((r) => r.id === form.roleId)?.key
            ?? getRoleKeyByRoleId(form.roleId)
            ?? ''
          const result = await userApi.update(editingUserId, {
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            phone: form.phone,
            roleKey,
            companyId: form.companyId,
          })
          setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
          if (result.ok) {
            setMode('list')
            setEditingUserId(null)
            setForm(EMPTY_FORM)
            await fetchUsers()
          }
        } catch {
          const input: UpdateUserInput = { ...form }
          const result = updateUser(editingUserId, input)
          setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
          if (result.ok) { setMode('list'); setEditingUserId(null); setForm(EMPTY_FORM) }
        }
      } else {
        const input: UpdateUserInput = { ...form }
        const result = updateUser(editingUserId, input)
        setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
        if (result.ok) { setMode('list'); setEditingUserId(null); setForm(EMPTY_FORM) }
      }
    }
  }

  async function handleConfirmDelete() {
    if (!deleteConfirm) return
    const { id, fullName } = deleteConfirm
    setDeleteConfirm(null)

    if (useApi) {
      try {
        const result = await userApi.delete(id)
        setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
        if (result.ok) {
          // Optimistic: remove from apiUsers without re-fetch (re-fetch would bring it back if API failed)
          setApiUsers((prev) => prev ? prev.filter((u) => u.id !== id) : prev)
          // Also remove from local Zustand for consistency
          deleteUser(id)
        }
      } catch {
        // API unavailable – fall back to local only
        const result = deleteUser(id)
        setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
        if (result.ok) setApiUsers((prev) => prev ? prev.filter((u) => u.id !== id) : prev)
      }
    } else {
      const result = deleteUser(id)
      setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
    }
  }

  async function handleToggleStatus(userId: string) {
    if (useApi) {
      try {
        const result = await userApi.toggleStatus(userId)
        setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
        if (result.ok) await fetchUsers()
      } catch {
        const result = toggleUserStatus(userId)
        setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
      }
    } else {
      const result = toggleUserStatus(userId)
      setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
    }
  }

  // Dropdown data sources
  const roleOptions = apiRoles
    ? apiRoles.map((r) => ({ id: r.id, name: r.name }))
    : ROLE_DEFINITIONS.map((r) => ({ id: r.id, name: r.name }))

  const companyOptions = apiCompanies
    ? apiCompanies.map((c) => ({ id: c.id, name: c.name }))
    : data.companies.map((c) => ({ id: c.id, name: c.name }))

  return (
    <div className="page-stack">
      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            style={{ background: '#fff', borderRadius: 16, padding: '2rem', maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.25rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={22} color="#DC2626" />
              </div>
              <div>
                <div style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1rem', color: '#0F172A' }}>Kullanıcıyı Sil</div>
                <div style={{ fontSize: '0.8125rem', color: '#64748B', marginTop: '0.125rem' }}>Bu işlem geri alınamaz.</div>
              </div>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#334155', margin: '0 0 1.5rem', lineHeight: 1.6 }}>
              <strong style={{ color: '#DC2626' }}>{deleteConfirm.fullName}</strong> adlı kullanıcıyı kalıcı olarak silmek istediğinizden emin misiniz? Kullanıcıya ait tüm oturum ve atama bilgileri kaybolacaktır.
            </p>
            <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Vazgeç</Button>
              <Button variant="danger" onClick={handleConfirmDelete}>
                <Trash2 size={14} />
                Evet, Kalıcı Olarak Sil
              </Button>
            </div>
          </div>
        </div>
      )}

      <PageHeader
        eyebrow="Sistem"
        title={`Kullanici Yonetimi${useApi && apiUsers ? ' (API)' : ''}`}
        description={`Sistemdeki tum kullanicilari yonetin. Toplam ${userRows.length} kullanici.`}
        actions={
          mode === 'list' ? (
            <Button onClick={handleCreate}>Yeni Kullanici</Button>
          ) : undefined
        }
      />

      {message && <InlineMessage kind={message.kind} message={message.text} />}

      {mode !== 'list' && (
        <Card title={mode === 'create' ? 'Yeni Kullanici Olustur' : 'Kullanici Duzenle'}>
          <form onSubmit={handleSubmit}>
            <div className="settings-grid">
              <FormField label="Ad">
                <Input
                  value={form.firstName}
                  onChange={(e) => handleFormChange('firstName', e.target.value)}
                  placeholder="Kullanici adi"
                  required
                />
              </FormField>
              <FormField label="Soyad">
                <Input
                  value={form.lastName}
                  onChange={(e) => handleFormChange('lastName', e.target.value)}
                  placeholder="Kullanici soyadi"
                  required
                />
              </FormField>
              <FormField label="E-posta">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleFormChange('email', e.target.value)}
                  placeholder="isim@firma.demo"
                  required
                />
              </FormField>
              <FormField label="Telefon">
                <Input
                  value={form.phone}
                  onChange={(e) => handleFormChange('phone', e.target.value)}
                  placeholder="+905xxxxxxxxx"
                />
              </FormField>
              <FormField label="Rol">
                <Select
                  value={form.roleId}
                  onChange={(e) => handleFormChange('roleId', e.target.value)}
                  required
                >
                  <option value="">Rol secin</option>
                  {roleOptions.map((role) => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Sirket">
                <Select
                  value={form.companyId}
                  onChange={(e) => handleFormChange('companyId', e.target.value)}
                  required
                >
                  <option value="">Sirket secin</option>
                  {companyOptions.map((company) => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                </Select>
              </FormField>
              {mode === 'create' && (
                <FormField label="Başlangıç Şifresi" hint="Kullanıcı ilk girişinde değiştirmek zorunda kalacak.">
                  <Input
                    type="text"
                    value={form.password}
                    onChange={(e) => handleFormChange('password', e.target.value)}
                    placeholder="Örn: Gratis2026!"
                    required
                  />
                </FormField>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <Button type="button" variant="secondary" onClick={handleCancel}>
                Vazgec
              </Button>
              <Button type="submit">
                {mode === 'create' ? 'Olustur' : 'Guncelle'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <Card>
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
            Kullanicilar yukleniyor...
          </p>
        </Card>
      ) : (
        <Card title="Kullanici Listesi">
          <DataTable
            data={userRows}
            columns={userColumns}
            filename="kullanicilar"
            searchPlaceholder="Ad, e-posta, sirket ara..."
            getRowId={(row) => row.id}
            defaultPageSize={20}
          />
        </Card>
      )}
    </div>
  )
}
