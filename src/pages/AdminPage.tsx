import { Card, PageHeader, Button, Badge } from '../components/ui'
import { ROLE_DEFINITIONS } from '../domain/constants'
import { formatFullName } from '../domain/workflow'
import { useAppStore } from '../store/app-store'

export function AdminPage() {
  const data = useAppStore((state) => state.data)
  const toggleCompanyStatus = useAppStore((state) => state.toggleCompanyStatus)
  const toggleUserActive = useAppStore((state) => state.toggleUserActive)
  const toggleRampActive = useAppStore((state) => state.toggleRampActive)

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Yonetim"
        title="Tanimlar ve rol matrisi"
        description="Demo kurulumunda admin, firma, kullanici, lokasyon ve rampa tanimlarini tek ekranda gorebilir; aktif/pasif yonetimi ile operasyonu kontrol eder."
      />

      <section className="dashboard-grid">
        <Card title="Firmalar">
          <div className="stack-list">
            {data.companies.map((company) => (
              <div key={company.id} className="stack-list__item">
                <div>
                  <strong>{company.name}</strong>
                  <p>{company.type}</p>
                </div>
                <div className="stack-list__actions">
                  <Badge tone={company.status === 'ACTIVE' ? 'success' : 'warning'}>{company.status}</Badge>
                  <Button size="sm" variant="secondary" onClick={() => toggleCompanyStatus(company.id)}>
                    Durum Degistir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Rampa tanimlari">
          <div className="stack-list">
            {data.ramps.map((ramp) => (
              <div key={ramp.id} className="stack-list__item">
                <div>
                  <strong>{ramp.code}</strong>
                  <p>{ramp.name}</p>
                </div>
                <div className="stack-list__actions">
                  <Badge tone={ramp.isActive ? 'success' : 'warning'}>{ramp.isActive ? 'ACTIVE' : 'PASSIVE'}</Badge>
                  <Button size="sm" variant="secondary" onClick={() => toggleRampActive(ramp.id)}>
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
