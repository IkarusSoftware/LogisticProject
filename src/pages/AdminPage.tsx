import { useCallback, useEffect, useState } from 'react'

import { Card, PageHeader, Button, Badge, InlineMessage } from '../components/ui'
import { ROLE_DEFINITIONS } from '../domain/constants'
import { formatFullName } from '../domain/workflow'
import { adminApi, hasTokens } from '../services/api'
import type { CompanyAdminDto, RampAdminDto } from '../services/types'
import { useAppStore } from '../store/app-store'

export function AdminPage() {
  const data = useAppStore((state) => state.data)
  const toggleCompanyStatus = useAppStore((state) => state.toggleCompanyStatus)
  const toggleUserActive = useAppStore((state) => state.toggleUserActive)
  const toggleRampActive = useAppStore((state) => state.toggleRampActive)

  const [apiCompanies, setApiCompanies] = useState<CompanyAdminDto[] | null>(null)
  const [apiRamps, setApiRamps] = useState<RampAdminDto[] | null>(null)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const useApi = hasTokens()

  const fetchAdminData = useCallback(async () => {
    if (!hasTokens()) return
    try {
      const [companies, ramps] = await Promise.all([
        adminApi.listCompanies(),
        adminApi.listRamps(),
      ])
      setApiCompanies(companies)
      setApiRamps(ramps)
    } catch {
      setApiCompanies(null)
      setApiRamps(null)
    }
  }, [])

  useEffect(() => {
    fetchAdminData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleToggleCompany(id: string) {
    if (useApi) {
      try {
        const result = await adminApi.toggleCompanyStatus(id)
        setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
        if (result.ok) await fetchAdminData()
        return
      } catch { /* fallback */ }
    }
    toggleCompanyStatus(id)
  }

  async function handleToggleRamp(id: string) {
    if (useApi) {
      try {
        const result = await adminApi.toggleRampStatus(id)
        setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
        if (result.ok) await fetchAdminData()
        return
      } catch { /* fallback */ }
    }
    toggleRampActive(id)
  }

  const displayCompanies = apiCompanies ?? data.companies.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    status: c.status as 'ACTIVE' | 'PASSIVE',
  }))

  const displayRamps = apiRamps ?? data.ramps.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    locationName: data.locations.find((l) => l.id === r.locationId)?.name ?? '-',
    isActive: r.isActive,
  }))

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Yonetim"
        title={`Tanimlar ve rol matrisi${useApi && apiCompanies ? ' (API)' : ''}`}
        description="Demo kurulumunda admin, firma, kullanici, lokasyon ve rampa tanimlarini tek ekranda gorebilir; aktif/pasif yonetimi ile operasyonu kontrol eder."
      />

      {message && <InlineMessage kind={message.kind} message={message.text} />}

      <section className="dashboard-grid">
        <Card title="Firmalar">
          <div className="stack-list">
            {displayCompanies.map((company) => (
              <div key={company.id} className="stack-list__item">
                <div>
                  <strong>{company.name}</strong>
                  <p>{company.type}</p>
                </div>
                <div className="stack-list__actions">
                  <Badge tone={company.status === 'ACTIVE' ? 'success' : 'warning'}>{company.status}</Badge>
                  <Button size="sm" variant="secondary" onClick={() => handleToggleCompany(company.id)}>
                    Durum Degistir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Rampa tanimlari">
          <div className="stack-list">
            {displayRamps.map((ramp) => (
              <div key={ramp.id} className="stack-list__item">
                <div>
                  <strong>{ramp.code}</strong>
                  <p>{ramp.name}{ramp.locationName !== '-' ? ` • ${ramp.locationName}` : ''}</p>
                </div>
                <div className="stack-list__actions">
                  <Badge tone={ramp.isActive ? 'success' : 'warning'}>{ramp.isActive ? 'ACTIVE' : 'PASSIVE'}</Badge>
                  <Button size="sm" variant="secondary" onClick={() => handleToggleRamp(ramp.id)}>
                    Aktiflik
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="dashboard-grid">
        <Card title="Kullanicilar">
          <div className="stack-list">
            {data.users.map((user) => (
              <div key={user.id} className="stack-list__item">
                <div>
                  <strong>{formatFullName(user)}</strong>
                  <p>{user.email}</p>
                </div>
                <div className="stack-list__actions">
                  <Badge tone={user.isActive ? 'success' : 'warning'}>{user.isActive ? 'ACTIVE' : 'PASSIVE'}</Badge>
                  <Button size="sm" variant="secondary" onClick={() => toggleUserActive(user.id)}>
                    Kullanici Durumu
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Rol matrisi">
          <div className="stack-list">
            {ROLE_DEFINITIONS.map((role) => (
              <div key={role.id} className="stack-list__item stack-list__item--column">
                <strong>{role.name}</strong>
                <p>{role.description}</p>
                <div className="permission-list">
                  {role.permissions.map((permission) => (
                    <Badge key={permission} tone="info">
                      {permission}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  )
}
