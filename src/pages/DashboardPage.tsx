import { useEffect, useState } from 'react'
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
import { dashboardApi, hasTokens } from '../services/api'
import type { DashboardMetricApiDto, PipelineCountApiDto } from '../services/types'

export function DashboardPage() {
  const data = useAppStore((state) => state.data)
  const session = useAppStore((state) => state.session)
  const currentUser = getCurrentUser(data, session.currentUserId)
  const roleKey = getCurrentRoleKey(currentUser)

  // API state
  const [apiMetrics, setApiMetrics] = useState<DashboardMetricApiDto[] | null>(null)
  const [apiPipeline, setApiPipeline] = useState<PipelineCountApiDto[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!hasTokens()) return
    setLoading(true)
    Promise.all([dashboardApi.metrics(), dashboardApi.pipeline()])
      .then(([m, p]) => { setApiMetrics(m); setApiPipeline(p) })
      .catch(() => { /* fallback to Zustand */ })
      .finally(() => setLoading(false))
  }, [])

  // Zustand fallback data
  const zustandMetrics = getDashboardMetrics(data, currentUser)
  const zustandPipeline = getPipelineCounts(data, currentUser)
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

  // Use API data when available
  const metrics = apiMetrics
    ? apiMetrics.map((m) => ({ key: m.key, title: m.label, value: m.value, tone: m.tone }))
    : zustandMetrics.map((m, index) => ({ ...m, title: m.title, tone: index === 2 ? 'warning' : index === 3 ? 'success' : index === 4 ? 'info' : 'neutral' }))

  const pipeline = apiPipeline
    ? apiPipeline.map((p) => ({ status: p.status, label: p.label, count: p.count }))
    : zustandPipeline.map((p) => ({ status: p.status, label: getStatusMeta(p.status).label, count: p.count }))

  const totalPipelineCount = pipeline.reduce((sum, p) => sum + p.count, 0)
  const usingApi = apiMetrics !== null

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Operasyon özeti"
        title={`Dashboard${usingApi ? ' (API)' : ''}`}
        description={getRoleDefinition(roleKey ?? 'admin')?.description ?? 'Operasyonlarınıza genel bakış.'}
        actions={
          <Link className="inline-link" to="/talepler">
            Tüm kayıtları aç
            <ArrowRight size={16} />
          </Link>
        }
      />

      {loading ? (
        <p className="muted-text">Yukleniyor...</p>
      ) : (
        <>
          <section className="metric-grid">
            {metrics.map((metric) => (
              <MetricCard
                key={metric.key}
                label={metric.title}
                value={metric.value}
                helper={metric.value === 1 ? '1 kayit' : `${metric.value} kayit`}
                tone={metric.tone as 'neutral' | 'warning' | 'success' | 'info'}
              />
            ))}
          </section>

          <section className="dashboard-grid">
            <Card title="Süreç Kanalı" subtitle={`${usingApi ? totalPipelineCount : visibleRequests.length} görünür kayıt`}>
              {pipeline.length === 0 ? (
                <p className="muted-text">Gosterilecek surec kaydi bulunmuyor.</p>
              ) : (
                <div className="pipeline">
                  {pipeline.map((item) => {
                    const statusMeta = getStatusMeta(item.status as import('../domain/models').ShipmentStatus)
                    const total = usingApi ? totalPipelineCount : visibleRequests.length
                    const ratio = total === 0 ? 0 : Math.round((item.count / total) * 100)

                    return (
                      <article key={item.status} className={`pipeline__item pipeline__item--${statusMeta.tone}`}>
                        <div className="pipeline__head">
                          <Badge tone={statusMeta.tone}>{item.label || statusMeta.label}</Badge>
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
        </>
      )}
    </div>
  )
}

