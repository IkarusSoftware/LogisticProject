import { useEffect, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  Timer,
  Truck,
  TrendingUp,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { Badge } from '../components/ui'
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
import {
  formatDateTimeLabel,
  formatFullName,
  getExitAt,
  getLoadingCompletedAt,
  getRampTakenAt,
  getRoleDefinition,
  getStatusMeta,
} from '../domain/workflow'
import { useAppStore } from '../store/app-store'
import { dashboardApi, hasTokens } from '../services/api'
import type { DashboardMetricApiDto, PipelineCountApiDto } from '../services/types'

/* ── helpers ────────────────────────────────────────────── */
function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Günaydın'
  if (h < 18) return 'İyi günler'
  return 'İyi akşamlar'
}

const METRIC_ICONS: Record<string, React.ElementType> = {
  total:     Package,
  pending:   Clock,
  active:    Truck,
  delayed:   AlertTriangle,
  completed: CheckCircle2,
  suppliers: Users,
  default:   TrendingUp,
}

const METRIC_COLORS: Record<string, { icon: string; bg: string; border: string }> = {
  neutral: { icon: '#64748B', bg: '#F1F5F9', border: '#E2E8F0' },
  info:    { icon: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  success: { icon: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  warning: { icon: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  danger:  { icon: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
}

/* ── sub-components ─────────────────────────────────────── */
function KpiCard({
  label,
  value,
  tone = 'neutral',
  metricKey = 'default',
}: {
  label: string
  value: number | string
  tone?: string
  metricKey?: string
}) {
  const Icon = METRIC_ICONS[metricKey] ?? METRIC_ICONS.default
  const color = METRIC_COLORS[tone] ?? METRIC_COLORS.neutral
  return (
    <article
      style={{
        background: '#fff',
        border: `1px solid ${color.border}`,
        borderRadius: 16,
        padding: '1.1rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        transition: 'transform 150ms ease, box-shadow 150ms ease',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.transform = 'translateY(-2px)'
        el.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.transform = ''
        el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: color.bg,
          border: `1px solid ${color.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={20} color={color.icon} strokeWidth={2} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            color: '#94A3B8',
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            marginBottom: '0.25rem',
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontFamily: 'Manrope, sans-serif',
            fontSize: '1.75rem',
            fontWeight: 800,
            lineHeight: 1,
            color: '#0F172A',
            letterSpacing: '-0.03em',
          }}
        >
          {value}
        </div>
      </div>
    </article>
  )
}

function ActivityItem({
  actor,
  description,
  performedAt,
  actionType,
}: {
  actor?: string
  description: string
  performedAt: string
  actionType: string
}) {
  const initials = actor ? actor.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() : '?'
  return (
    <div
      style={{
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'flex-start',
        padding: '0.625rem 0',
        borderBottom: '1px solid #F1F5F9',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #0d9488, #0f766e)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.65rem',
          fontWeight: 700,
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.8125rem', color: '#0F172A', fontWeight: 500, lineHeight: 1.4 }}>
          {description}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.2rem' }}>
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              color: '#0d9488',
              background: '#f0fdfa',
              border: '1px solid #ccfbf1',
              borderRadius: 99,
              padding: '0.1rem 0.4rem',
            }}
          >
            {actionType}
          </span>
          <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
            {formatDateTimeLabel(performedAt)}
          </span>
        </div>
      </div>
    </div>
  )
}

function UrgentItem({
  requestNo,
  productInfo,
  loadDate,
  loadTime,
}: {
  requestNo: string
  productInfo: string
  loadDate: string
  loadTime: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.625rem 0.75rem',
        borderRadius: 10,
        background: '#FFFBEB',
        border: '1px solid #FDE68A',
        marginBottom: '0.5rem',
      }}
    >
      <AlertTriangle size={15} color="#D97706" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0F172A' }}>{requestNo}</div>
        <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {productInfo}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0, fontSize: '0.72rem', color: '#92400E', fontWeight: 600 }}>
        <Timer size={12} />
        {loadDate} {loadTime}
      </div>
    </div>
  )
}

function SectionCard({
  title,
  subtitle,
  icon,
  children,
  action,
}: {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #E2E8F0',
        borderRadius: 16,
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          {icon && (
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#f0fdfa',
                border: '1px solid #ccfbf1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0d9488',
                flexShrink: 0,
              }}
            >
              {icon}
            </div>
          )}
          <div>
            <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#0F172A' }}>
              {title}
            </div>
            {subtitle && (
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.05rem' }}>{subtitle}</div>
            )}
          </div>
        </div>
        {action}
      </div>
      <div style={{ padding: '0.875rem 1.25rem', flex: 1 }}>{children}</div>
    </div>
  )
}

/* ── main page ──────────────────────────────────────────── */
export function DashboardPage() {
  const data = useAppStore((state) => state.data)
  const session = useAppStore((state) => state.session)
  const currentUser = getCurrentUser(data, session.currentUserId)
  const roleKey = getCurrentRoleKey(currentUser)

  const [apiMetrics, setApiMetrics] = useState<DashboardMetricApiDto[] | null>(null)
  const [apiPipeline, setApiPipeline] = useState<PipelineCountApiDto[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!hasTokens()) return
    setLoading(true)
    Promise.all([dashboardApi.metrics(), dashboardApi.pipeline()])
      .then(([m, p]) => { setApiMetrics(m); setApiPipeline(p) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const zustandMetrics = getDashboardMetrics(data, currentUser)
  const zustandPipeline = getPipelineCounts(data, currentUser)
  const delayedRequests = getDelayedRequests(data, currentUser).slice(0, 5)
  const recentLogs = getRecentAuditLogs(data, currentUser)
  const visibleRequests = getVisibleRequests(data, currentUser)

  const operationalRows = visibleRequests
    .map((request) => {
      const detail = getShipmentDetail(data, request.id)
      return { request, detail, rampTakenAt: getRampTakenAt(detail), loadingCompletedAt: getLoadingCompletedAt(detail), exitAt: getExitAt(detail) }
    })
    .filter((item) => item.rampTakenAt || item.loadingCompletedAt || item.exitAt)
    .slice(0, 6)

  const toneMap = (index: number) => ['neutral', 'warning', 'success', 'info', 'neutral'][index] ?? 'neutral'
  const metrics = apiMetrics
    ? apiMetrics.map((m) => ({ key: m.key, title: m.label, value: m.value, tone: m.tone }))
    : zustandMetrics.map((m, i) => ({ ...m, title: m.title, tone: toneMap(i) }))

  const pipeline = apiPipeline
    ? apiPipeline.map((p) => ({ status: p.status, label: p.label, count: p.count }))
    : zustandPipeline.map((p) => ({ status: p.status, label: getStatusMeta(p.status).label, count: p.count }))

  const totalPipelineCount = pipeline.reduce((sum, p) => sum + p.count, 0)
  const roleDefinition = getRoleDefinition(roleKey ?? 'admin')
  const today = new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '0.75rem', color: '#64748B' }}>
        <Package size={24} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontWeight: 500 }}>Veriler yükleniyor…</span>
      </div>
    )
  }

  return (
    <div className="page-stack">

      {/* ── Hero Banner ── */}
      <div
        style={{
          borderRadius: 16,
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 55%, #134e4a 100%)',
          padding: '1.75rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', top: -50, right: 60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(13,148,136,0.12)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -80, right: -30, width: 180, height: 180, borderRadius: '50%', background: 'rgba(13,148,136,0.07)', pointerEvents: 'none' }} />

        <div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.375rem' }}>
            {today}
          </div>
          <h1
            style={{
              margin: 0,
              fontFamily: 'Manrope, sans-serif',
              fontSize: 'clamp(1.25rem, 2vw, 1.625rem)',
              fontWeight: 800,
              color: '#fff',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}
          >
            {greeting()}, {currentUser?.firstName} 👋
          </h1>
          <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.25rem 0.625rem',
                borderRadius: 99,
                background: 'rgba(13,148,136,0.25)',
                border: '1px solid rgba(13,148,136,0.4)',
                color: '#5eead4',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              {roleDefinition?.name ?? roleKey}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)' }}>
              {roleDefinition?.description}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.625rem', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {(roleKey === 'admin' || roleKey === 'superadmin') && (
            <Link
              to="/talep-olustur"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 1rem',
                borderRadius: 10,
                background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                color: '#fff',
                fontSize: '0.8125rem',
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(13,148,136,0.4)',
                transition: 'transform 150ms, box-shadow 150ms',
              }}
            >
              <Package size={14} />
              Yeni Talep
            </Link>
          )}
          <Link
            to="/talepler"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.85)',
              fontSize: '0.8125rem',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Tüm Kayıtlar
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* ── KPI Metrics ── */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
          gap: '0.875rem',
        }}
      >
        {metrics.map((metric, i) => (
          <KpiCard
            key={metric.key ?? i}
            label={metric.title}
            value={metric.value}
            tone={metric.tone}
            metricKey={metric.key ?? 'default'}
          />
        ))}
      </section>

      {/* ── Pipeline + Urgent ── */}
      <section style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '0.875rem', alignItems: 'start' }}>

        <SectionCard
          title="Süreç Kanalı"
          subtitle={`${totalPipelineCount} görünür sevkiyat`}
          icon={<Activity size={16} />}
        >
          {pipeline.length === 0 ? (
            <p style={{ margin: 0, color: '#94A3B8', fontSize: '0.84rem' }}>Gösterilecek süreç kaydı bulunmuyor.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.625rem' }}>
              {pipeline.map((item) => {
                const statusMeta = getStatusMeta(item.status as import('../domain/models').ShipmentStatus)
                const total = totalPipelineCount || 1
                const ratio = Math.round((item.count / total) * 100)
                const color = METRIC_COLORS[statusMeta.tone] ?? METRIC_COLORS.neutral
                return (
                  <div
                    key={item.status}
                    style={{
                      padding: '0.875rem',
                      borderRadius: 12,
                      border: `1px solid ${color.border}`,
                      background: color.bg,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.25rem' }}>
                      <Badge tone={statusMeta.tone} style={{ fontSize: '0.62rem', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.label || statusMeta.label}
                      </Badge>
                    </div>
                    <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1.75rem', fontWeight: 800, lineHeight: 1, color: '#0F172A', letterSpacing: '-0.03em' }}>
                      {item.count}
                    </div>
                    <div style={{ width: '100%', height: 3, borderRadius: 99, background: 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 99, background: color.icon, width: `${Math.max(ratio, item.count > 0 ? 8 : 0)}%`, transition: 'width 0.4s ease' }} />
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 500 }}>%{ratio}</span>
                  </div>
                )
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Öncelikli Aksiyonlar"
          subtitle={`${delayedRequests.length} geciken kayıt`}
          icon={<AlertTriangle size={16} />}
          action={
            delayedRequests.length > 0 ? (
              <Link to="/talepler" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#0d9488', fontWeight: 600, textDecoration: 'none' }}>
                Tümü <ArrowRight size={12} />
              </Link>
            ) : undefined
          }
        >
          {delayedRequests.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1.5rem 0', color: '#94A3B8' }}>
              <CheckCircle2 size={28} color="#10b981" />
              <span style={{ fontSize: '0.84rem', fontWeight: 500, color: '#64748B' }}>Aktif gecikme görünmüyor</span>
            </div>
          ) : (
            delayedRequests.map((req) => (
              <UrgentItem
                key={req.id}
                requestNo={req.requestNo}
                productInfo={req.productInfo}
                loadDate={req.loadDate}
                loadTime={req.loadTime}
              />
            ))
          )}
        </SectionCard>
      </section>

      {/* ── Activity + Operational ── */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem', alignItems: 'start' }}>

        <SectionCard
          title="Son İşlemler"
          subtitle="En güncel aktivite kaydı"
          icon={<Clock size={16} />}
        >
          {recentLogs.length === 0 ? (
            <p style={{ margin: 0, color: '#94A3B8', fontSize: '0.84rem' }}>Henüz aktivite kaydı yok.</p>
          ) : (
            <div>
              {recentLogs.map((log) => {
                const actor = data.users.find((u) => u.id === log.performedByUserId)
                return (
                  <ActivityItem
                    key={log.id}
                    actor={actor ? formatFullName(actor) : undefined}
                    description={log.description}
                    performedAt={log.performedAt}
                    actionType={log.actionType}
                  />
                )
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Rampa & Çıkış Zamanları"
          subtitle="Son operasyon saatleri"
          icon={<MapPin size={16} />}
        >
          {operationalRows.length === 0 ? (
            <p style={{ margin: 0, color: '#94A3B8', fontSize: '0.84rem' }}>Henüz operasyon zamanı oluşan kayıt yok.</p>
          ) : (
            <div>
              {operationalRows.map((item) => {
                const plate = item.detail?.vehicleAssignment?.tractorPlate ?? 'Plaka bekleniyor'
                const loc = item.detail?.location?.name
                  ?? data.locations.find((l) => l.id === item.request.targetLocationId)?.name
                  ?? 'Bölge bekleniyor'
                return (
                  <div
                    key={item.request.id}
                    style={{
                      padding: '0.625rem 0',
                      borderBottom: '1px solid #F1F5F9',
                      display: 'flex',
                      gap: '0.75rem',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: '#F0FDF4',
                        border: '1px solid #BBF7D0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      <Truck size={15} color="#059669" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0F172A' }}>{plate}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.15rem' }}>{loc}</div>
                      <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '0.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {item.rampTakenAt && <span>Rampa: {formatDateTimeLabel(item.rampTakenAt)}</span>}
                        {item.loadingCompletedAt && <span>Bitis: {formatDateTimeLabel(item.loadingCompletedAt)}</span>}
                        {item.exitAt && <span>Cikis: {formatDateTimeLabel(item.exitAt)}</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </SectionCard>

      </section>
    </div>
  )
}
