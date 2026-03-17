import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Card, MetricCard, PageHeader } from '../components/ui'
import { TERMINAL_STATUSES } from '../domain/constants'
import { getAverageDurations, getCompanyPerformance, getLocationIntensity, getRampUsage } from '../domain/selectors'
import { getStatusMeta } from '../domain/workflow'
import { useAppStore } from '../store/app-store'
import { hasTokens, reportApi } from '../services/api'
import type { CompanyPerformanceApiDto, LocationIntensityApiDto, RampUsageApiDto, ReportDurationsApiDto } from '../services/types'

// ─── Design tokens ──────────────────────────────────────────────────────────
const C = {
  primary: '#0D9488',
  success: '#16A34A',
  danger:  '#DC2626',
  warning: '#D97706',
  info:    '#2563EB',
  purple:  '#7C3AED',
  muted:   '#94A3B8',
  grid:    '#E2E8F0',
  bg:      '#F8FAFC',
}

const STATUS_PALETTE: Record<string, string> = {
  REQUEST_CREATED:      '#64748B',
  SENT_TO_SUPPLIER:     '#3B82F6',
  CORRECTION_REQUESTED: '#F59E0B',
  APPROVED:             '#0D9488',
  RAMP_PLANNED:         '#8B5CF6',
  LOADING:              '#F97316',
  LOADED:               '#06B6D4',
  GATE_IN:              '#10B981',
  SEALED:               '#6366F1',
  EXITED:               '#84CC16',
  COMPLETED:            '#16A34A',
  REJECTED:             '#DC2626',
  CANCELLED:            '#EF4444',
  VEHICLE_CANCELLED:    '#F87171',
}

// ─── Custom tooltip ──────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      {label && <p className="chart-tooltip__label">{label}</p>}
      {payload.map((entry: any, i: number) => (
        <p key={i} className="chart-tooltip__row" style={{ color: entry.color ?? entry.fill }}>
          <span className="chart-tooltip__name">{entry.name}</span>
          <span className="chart-tooltip__value">{entry.value}{typeof entry.value === 'number' && entry.name?.includes('%') ? '' : ''}</span>
        </p>
      ))}
    </div>
  )
}

// ─── Custom legend ───────────────────────────────────────────────────────────
function PieLegend({ payload }: any) {
  if (!payload) return null
  return (
    <ul className="chart-legend">
      {payload.map((entry: any, i: number) => (
        <li key={i} className="chart-legend__item">
          <span className="chart-legend__dot" style={{ background: entry.color }} />
          <span className="chart-legend__label">{entry.value}</span>
          <span className="chart-legend__count">{entry.payload?.value}</span>
        </li>
      ))}
    </ul>
  )
}

export function ReportsPage() {
  const data = useAppStore((state) => state.data)

  const [apiDurations, setApiDurations] = useState<ReportDurationsApiDto | null>(null)
  const [apiCompanies, setApiCompanies] = useState<CompanyPerformanceApiDto[] | null>(null)
  const [apiLocations, setApiLocations] = useState<LocationIntensityApiDto[] | null>(null)
  const [apiRamps, setApiRamps] = useState<RampUsageApiDto[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!hasTokens()) return
    setLoading(true)
    Promise.all([reportApi.durations(), reportApi.companies(), reportApi.locations(), reportApi.ramps()])
      .then(([d, c, l, r]) => { setApiDurations(d); setApiCompanies(c); setApiLocations(l); setApiRamps(r) })
      .catch(() => { /* fallback to Zustand */ })
      .finally(() => setLoading(false))
  }, [])

  const zustandAverages   = getAverageDurations(data)
  const zustandCompanies  = getCompanyPerformance(data)
  const zustandLocations  = getLocationIntensity(data)
  const zustandRamps      = getRampUsage(data)

  const averages  = apiDurations ?? zustandAverages
  const usingApi  = apiDurations !== null

  // ── Derived rows ─────────────────────────────────────────────────────────
  const companyRows = useMemo(() => apiCompanies
    ? apiCompanies.map((c) => ({ id: c.companyId, name: c.companyName, completed: c.completed, rejected: c.rejected, total: c.completed + c.rejected, completionRate: c.completionRate }))
    : zustandCompanies.map((c) => ({ id: c.company.id, name: c.company.name, completed: c.completed, rejected: c.rejected, total: c.total, completionRate: c.completionRate })),
  [apiCompanies, zustandCompanies])

  const locationRows = useMemo(() => apiLocations
    ? apiLocations.map((l) => ({ id: l.locationId, name: l.locationName, total: l.total, active: l.active }))
    : zustandLocations.map((l) => ({ id: l.location.id, name: l.location.name, total: l.total, active: l.active })),
  [apiLocations, zustandLocations])

  const rampRows = useMemo(() => apiRamps
    ? apiRamps.map((r) => ({ id: r.rampId, code: r.rampCode, name: r.rampName, count: r.assignmentCount }))
    : zustandRamps.map((r) => ({ id: r.ramp.id, code: r.ramp.code, name: r.ramp.name, count: r.count })),
  [apiRamps, zustandRamps])

  // ── Status breakdown for donut chart ─────────────────────────────────────
  const statusPieData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const req of data.shipmentRequests) {
      counts[req.currentStatus] = (counts[req.currentStatus] ?? 0) + 1
    }
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([status, value]) => ({
        status,
        name: getStatusMeta(status as any).label,
        value,
        fill: STATUS_PALETTE[status] ?? C.muted,
      }))
      .sort((a, b) => b.value - a.value)
  }, [data.shipmentRequests])

  // ── Daily trend (last 14 days) ────────────────────────────────────────────
  const trendData = useMemo(() => {
    const byDate: Record<string, { date: string; toplam: number; tamamlanan: number; reddedilen: number }> = {}
    for (const req of data.shipmentRequests) {
      const d = req.loadDate ?? req.requestDate
      if (!d) continue
      if (!byDate[d]) byDate[d] = { date: d, toplam: 0, tamamlanan: 0, reddedilen: 0 }
      byDate[d].toplam++
      if (req.currentStatus === 'COMPLETED') byDate[d].tamamlanan++
      if (req.currentStatus === 'REJECTED')  byDate[d].reddedilen++
    }
    return Object.values(byDate)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14)
      .map((item) => ({ ...item, date: item.date.slice(5) })) // MM-DD
  }, [data.shipmentRequests])

  // ── Duration bar ─────────────────────────────────────────────────────────
  const durationData = [
    { name: 'Onay süresi', value: averages.averageApprovalMinutes, fill: C.info },
    { name: 'Saha girişi', value: averages.averageGateMinutes,     fill: C.primary },
    { name: 'Yükleme',     value: averages.averageLoadingMinutes,  fill: C.purple },
  ]

  // ── Totals ────────────────────────────────────────────────────────────────
  const totalShipments  = data.shipmentRequests.length
  const totalCompleted  = data.shipmentRequests.filter((r) => r.currentStatus === 'COMPLETED').length
  const totalRejected   = data.shipmentRequests.filter((r) => r.currentStatus === 'REJECTED').length
  const totalActive     = data.shipmentRequests.filter((r) => !TERMINAL_STATUSES.includes(r.currentStatus)).length
  const completionRate  = totalShipments > 0 ? Math.round((totalCompleted / totalShipments) * 100) : 0

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Raporlama"
        title={`Operasyon KPI ve performans${usingApi ? ' (API)' : ''}`}
        description="Günlük talep trendleri, firma bazlı tamamlama oranları, saha süre analizleri ve rampa kullanım yoğunluğu."
      />

      {loading ? (
        <p className="muted-text">Yükleniyor...</p>
      ) : (
        <>
          {/* ── KPI Strip ── */}
          <section className="metric-grid">
            <MetricCard label="Toplam sevkiyat"    value={totalShipments}            helper="Tüm kayıtlar" />
            <MetricCard label="Aktif operasyon"    value={totalActive}               helper="Terminal olmayan" tone="info" />
            <MetricCard label="Tamamlanan"         value={totalCompleted}            helper="Tüm zamanlar" tone="success" />
            <MetricCard label="Reddedilen"         value={totalRejected}             helper="Kalite sinyali" tone="warning" />
            <MetricCard label="Tamamlama oranı"    value={`%${completionRate}`}      helper="Completed / Toplam" tone="success" />
            <MetricCard label="Ort. onay süresi"   value={`${averages.averageApprovalMinutes} dk`} helper="Talep → Onay" tone="neutral" />
          </section>

          {/* ── Trend + Status row ── */}
          <div className="report-grid-2">
            <Card title="Günlük sevkiyat trendi" subtitle="Son 14 yükleme günü">
              <div className="chart-container">
                {trendData.length === 0 ? (
                  <p className="chart-empty">Yeterli veri yok</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={trendData} barGap={2} barSize={16}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} width={28} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: C.bg }} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="toplam"     name="Toplam"     fill={C.primary}  radius={[4, 4, 0, 0]} />
                      <Bar dataKey="tamamlanan" name="Tamamlanan" fill={C.success}  radius={[4, 4, 0, 0]} />
                      <Bar dataKey="reddedilen" name="Reddedilen" fill={C.danger}   radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            <Card title="Durum dağılımı" subtitle={`${totalShipments} sevkiyat`}>
              <div className="chart-container">
                {statusPieData.length === 0 ? (
                  <p className="chart-empty">Yeterli veri yok</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        cx="45%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                      >
                        {statusPieData.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                      <Legend content={<PieLegend />} layout="vertical" align="right" verticalAlign="middle" />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </div>

          {/* ── Company + Duration row ── */}
          <div className="report-grid-2">
            <Card title="Firma bazlı performans" subtitle="Tamamlama oranı (%)">
              <div className="chart-container">
                {companyRows.length === 0 ? (
                  <p className="chart-empty">Yeterli veri yok</p>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(220, companyRows.length * 44)}>
                    <BarChart
                      data={companyRows}
                      layout="vertical"
                      barSize={18}
                      margin={{ left: 0, right: 24 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} width={120} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: C.bg }} />
                      <Bar dataKey="completionRate" name="Tamamlama %" fill={C.primary} radius={[0, 4, 4, 0]}>
                        {companyRows.map((_, i) => (
                          <Cell key={i} fill={companyRows[i].completionRate >= 80 ? C.success : companyRows[i].completionRate >= 50 ? C.warning : C.danger} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            <Card title="Ortalama operasyon süreleri" subtitle="Dakika cinsinden">
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={durationData} barSize={48}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} width={36} unit=" dk" />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: C.bg }} />
                    <Bar dataKey="value" name="Süre (dk)" radius={[6, 6, 0, 0]}>
                      {durationData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="duration-summary">
                  <div className="duration-summary__item">
                    <span className="duration-summary__dot" style={{ background: C.info }} />
                    <span>Onay: <strong>{averages.averageApprovalMinutes} dk</strong></span>
                  </div>
                  <div className="duration-summary__item">
                    <span className="duration-summary__dot" style={{ background: C.primary }} />
                    <span>Saha: <strong>{averages.averageGateMinutes} dk</strong></span>
                  </div>
                  <div className="duration-summary__item">
                    <span className="duration-summary__dot" style={{ background: C.purple }} />
                    <span>Yükleme: <strong>{averages.averageLoadingMinutes} dk</strong></span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* ── Location + Ramp row ── */}
          <div className="report-grid-2">
            <Card title="Lokasyon bazlı yoğunluk" subtitle="Aktif / Toplam talep">
              <div className="chart-container">
                {locationRows.length === 0 ? (
                  <p className="chart-empty">Yeterli veri yok</p>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(200, locationRows.length * 44)}>
                    <BarChart data={locationRows} layout="vertical" barSize={16} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} width={140} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: C.bg }} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="total"  name="Toplam" fill={C.info}    radius={[0, 4, 4, 0]} />
                      <Bar dataKey="active" name="Aktif"  fill={C.primary} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            <Card title="Rampa kullanım yoğunluğu" subtitle="Toplam atama sayısı">
              <div className="chart-container">
                {rampRows.filter((r) => r.count > 0).length === 0 ? (
                  <p className="chart-empty">Henüz atama yapılmamış</p>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(200, rampRows.filter((r) => r.count > 0).length * 40)}>
                    <BarChart
                      data={rampRows.filter((r) => r.count > 0)}
                      layout="vertical"
                      barSize={18}
                      margin={{ left: 0, right: 24 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <YAxis type="category" dataKey="code" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} width={60} />
                      <Tooltip
                        content={<ChartTooltip />}
                        cursor={{ fill: C.bg }}
                        formatter={(value: any, _name: any, props: any) => [props.payload.name, String(value)]}
                      />
                      <Bar dataKey="count" name="Atama" fill={C.purple} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
