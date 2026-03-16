import { ArrowRight, Clock3 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Badge, Card, MetricCard, PageHeader } from '../components/ui'
import {
  getCurrentRoleKey,
  getCurrentUser,
  getDashboardMetrics,
  getDelayedRequests,
  getPipelineCounts,
  getRecentAuditLogs,
  getShipmentDetail,
  getVisibleRequests,
} from '../domain/selectors'
import { formatDateTimeLabel, formatFullName, getExitAt, getLoadingCompletedAt, getRampTakenAt, getRoleDefinition, getStatusMeta } from '../domain/workflow'
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
  const operationalRows = visibleRequests
    .map((request) => {
      const detail = getShipmentDetail(data, request.id)
      return {
        request,
        detail,
        rampTakenAt: getRampTakenAt(detail),
        loadingCompletedAt: getLoadingCompletedAt(detail),
        exitAt: getExitAt(detail),
      }
    })
    .filter((item) => item.rampTakenAt || item.loadingCompletedAt || item.exitAt)
    .slice(0, 6)

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Operasyon özeti"
        title="Dashboard"
        description={getRoleDefinition(roleKey ?? 'admin')?.description ?? 'Operasyonlarınıza genel bakış.'}
        actions={
          <Link className="inline-link" to="/talepler">
            Tüm kayıtları aç
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
            tone={index === 2 ? 'warning' : index === 3 ? 'success' : index === 4 ? 'info' : 'neutral'}
          />
        ))}
      </section>

      <section className="dashboard-grid">
        <Card title="Süreç Kanalı" subtitle={`${visibleRequests.length} görünür kayıt`}>
          {pipeline.length === 0 ? (
            <p className="muted-text">Gosterilecek surec kaydi bulunmuyor.</p>
          ) : (
            <div className="pipeline">
              {pipeline.map((item) => {
                const statusMeta = getStatusMeta(item.status)
                const ratio = visibleRequests.length === 0 ? 0 : Math.round((item.count / visibleRequests.length) * 100)

                return (
                  <article key={item.status} className={`pipeline__item pipeline__item--${statusMeta.tone}`}>
                    <div className="pipeline__head">
                      <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                      <span className="pipeline__ratio">%{ratio}</span>
                    </div>
                    <strong className="pipeline__count">{item.count}</strong>
                    <span className="pipeline__helper">{item.count === 1 ? '1 arac' : `${item.count} arac`}</span>
                    <div className="pipeline__bar">
                      <div className="pipeline__fill" style={{ width: `${Math.max(ratio, item.count > 0 ? 10 : 0)}%` }} />
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </Card>

        <Card title="Öncelikli Aksiyonlar" subtitle="Geciken veya dikkat gerektiren kayıtlar">
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
        <Card title="Son İşlemler" subtitle="Audit log – en güncel kayıtlar">
          <div className="audit-list">
            {recentLogs.map((log) => {
              const actor = data.users.find((user) => user.id === log.performedByUserId)
              return (
                <div key={log.id} className="audit-list__item">
                  <strong>{log.actionType}</strong>
                  <p>{log.description}</p>
                  <span>
                    {formatFullName(actor)} / {formatDateTimeLabel(log.performedAt)}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>

        <Card title="Rampa & Çıkış Zamanları" subtitle="Son operasyon saatleri">
          <div className="audit-list">
            {operationalRows.length === 0 ? (
              <p className="muted-text">Henuz operasyon zamani olusan kayit yok.</p>
            ) : (
              operationalRows.map((item) => {
                const plateLabel = item.detail?.vehicleAssignment?.tractorPlate ?? 'Plaka bekleniyor'
                const locationLabel = item.detail?.location?.name
                  ?? data.locations.find((location) => location.id === item.request.targetLocationId)?.name
                  ?? 'Bolge bekleniyor'

                return (
                  <div key={item.request.id} className="audit-list__item">
                    <strong>{plateLabel} / {locationLabel}</strong>
                    <p>
                      Rampa: {formatDateTimeLabel(item.rampTakenAt)} / Yukleme bitis: {formatDateTimeLabel(item.loadingCompletedAt)}
                    </p>
                    <span>
                      Rampa cikis: {formatDateTimeLabel(item.exitAt)} / {item.detail?.supplierCompany?.name ?? '-'}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </Card>
      </section>
    </div>
  )
}

