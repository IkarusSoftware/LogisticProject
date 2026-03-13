import { ArrowRight, Clock3 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Card, MetricCard, PageHeader } from '../components/ui'
import { getCurrentRoleKey, getCurrentUser, getDelayedRequests, getPipelineCounts, getRecentAuditLogs, getVisibleRequests, getDashboardMetrics } from '../domain/selectors'
import { formatDateTimeLabel, formatFullName, getRoleDefinition, getStatusMeta } from '../domain/workflow'
import { useAppStore } from '../store/app-store'

export function DashboardPage() {
  const data = useAppStore((state) => state.data)
  const session = useAppStore((state) => state.session)
  const currentUser = getCurrentUser(data, session.currentUserId)
  const roleKey = getCurrentRoleKey(currentUser)
  const metrics = getDashboardMetrics(data, currentUser)
  const pipeline = getPipelineCounts(data, currentUser)
  const delayedRequests = getDelayedRequests(data, currentUser).slice(0, 5)
  const recentLogs = getRecentAuditLogs(data, currentUser)
  const visibleRequests = getVisibleRequests(data, currentUser)

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Bilgi mimarisi"
        title="Rol bazli operasyon dashboard"
        description={`${getRoleDefinition(roleKey ?? 'admin')?.description ?? ''} Tum akis state-machine mantiginda ilerler; tablo, filtre ve hizli aksiyon her rolde ayni veri omurgasindan beslenir.`}
        actions={
          <Link className="inline-link" to="/talepler">
            Tum kayitlari ac
            <ArrowRight size={16} />
          </Link>
        }
      />

      <section className="metric-grid">
        {metrics.map((metric, index) => (
          <MetricCard
            key={metric.key}
            label={metric.title}
            value={metric.value}
            helper={metric.value === 1 ? '1 kayit' : `${metric.value} kayit`}
            tone={index === 5 ? 'success' : index === 6 ? 'warning' : index === 1 || index === 2 ? 'info' : 'neutral'}
          />
        ))}
      </section>

      <section className="dashboard-grid">
        <Card title="Surec kanali" subtitle={`${visibleRequests.length} gorunur kayit`}>
          <div className="pipeline">
            {pipeline.map((item) => (
              <div key={item.status} className="pipeline__item">
                <Badge tone={getStatusMeta(item.status).tone}>{getStatusMeta(item.status).label}</Badge>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Bugun oncelikli aksiyonlar" subtitle="Geciken veya dikkat isteyen isler">
          <div className="task-list">
            {delayedRequests.length === 0 ? (
              <p className="muted-text">Aktif gecikme gorunmuyor.</p>
            ) : (
              delayedRequests.map((request) => (
                <div key={request.id} className="task-list__item">
                  <div>
                    <strong>{request.requestNo}</strong>
                    <p>{request.productInfo}</p>
                  </div>
                  <div className="task-list__meta">
                    <Clock3 size={14} />
                    <span>{request.loadDate} {request.loadTime}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </section>

      <section className="dashboard-grid">
        <Card title="Son islemler akisi" subtitle="Audit log'un en guncel kayitlari">
          <div className="audit-list">
            {recentLogs.map((log) => {
              const actor = data.users.find((user) => user.id === log.performedByUserId)
              return (
                <div key={log.id} className="audit-list__item">
                  <strong>{log.actionType}</strong>
                  <p>{log.description}</p>
                  <span>
                    {formatFullName(actor)} • {formatDateTimeLabel(log.performedAt)}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>

        <Card title="Rol bazli ekran mantigi" subtitle="Bu demoda her rol sade bir ana is akisi gorur">
          <div className="role-flow">
            <div>
              <strong>1. Talep</strong>
              <p>Talep ac, lokasyon sec, tedarikciyi yonlendir.</p>
            </div>
            <div>
              <strong>2. Tedarik</strong>
              <p>Arac ve sofor gir, eksik bilgi varsa gonderme.</p>
            </div>
            <div>
              <strong>3. Kontrol</strong>
              <p>Kayitlari dogrula, onay / red sebebini logla.</p>
            </div>
            <div>
              <strong>4. Operasyon</strong>
              <p>Rampa, kapi, yukleme ve muhur cikisini tamamla.</p>
            </div>
          </div>
        </Card>
      </section>
    </div>
  )
}

function Badge({ children, tone }: { children: React.ReactNode; tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger' }) {
  return <span className={`badge badge--${tone}`}>{children}</span>
}
