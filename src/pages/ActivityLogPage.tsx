import { useState, useMemo, useEffect, useCallback } from 'react'

import { getAllAuditLogs, mapAuditLogActor } from '../domain/selectors'
import { formatDateTimeLabel, formatFullName } from '../domain/workflow'
import { auditLogApi, hasTokens } from '../services/api'
import type { AuditLogDto, PagedResult } from '../services/types'
import { useAppStore } from '../store/app-store'
import { Badge, Card, FormField, PageHeader, Select } from '../components/ui'
import { DataTable, createColumnHelper, type ColumnDef } from '../components/data-table'

const ITEMS_PER_PAGE = 20

const ENTITY_TYPE_OPTIONS = [
  { value: '', label: 'Tum varliklar' },
  { value: 'ShipmentRequest', label: 'Sevkiyat Talebi' },
  { value: 'VehicleAssignment', label: 'Arac Atamasi' },
  { value: 'RampAssignment', label: 'Rampa Atamasi' },
  { value: 'LoadingOperation', label: 'Yukleme Operasyonu' },
  { value: 'User', label: 'Kullanici' },
  { value: 'SystemSettings', label: 'Sistem Ayarlari' },
]

const ACTION_TYPE_OPTIONS = [
  { value: '', label: 'Tum islemler' },
  { value: 'status_transition', label: 'Durum Degisikligi' },
  { value: 'vehicle_assignment_saved', label: 'Arac Atamasi' },
  { value: 'ramp_assigned', label: 'Rampa Atamasi' },
  { value: 'seal_saved', label: 'Muhur Kaydi' },
  { value: 'user_created', label: 'Kullanici Olusturma' },
  { value: 'user_updated', label: 'Kullanici Guncelleme' },
  { value: 'user_status_toggled', label: 'Kullanici Durum Degisikligi' },
  { value: 'settings_updated', label: 'Ayar Guncelleme' },
]

function getActionLabel(actionType: string) {
  const option = ACTION_TYPE_OPTIONS.find((item) => item.value === actionType)
  return option?.label ?? actionType
}

function getActionTone(actionType: string): 'neutral' | 'info' | 'success' | 'warning' | 'danger' {
  switch (actionType) {
    case 'status_transition': return 'info'
    case 'user_created': return 'success'
    case 'user_updated': return 'warning'
    case 'user_status_toggled': return 'warning'
    case 'settings_updated': return 'neutral'
    default: return 'neutral'
  }
}

export function ActivityLogPage() {
  const data = useAppStore((state) => state.data)
  const useApi = hasTokens()

  const [entityTypeFilter, setEntityTypeFilter] = useState('')
  const [actionTypeFilter, setActionTypeFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [page, setPage] = useState(0)

  // API state
  const [apiData, setApiData] = useState<PagedResult<AuditLogDto> | null>(null)
  const [apiLoading, setApiLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const fetchApiLogs = useCallback(async () => {
    if (!useApi) return
    setApiLoading(true)
    setApiError(null)
    try {
      const result = await auditLogApi.list({
        entityType: entityTypeFilter || undefined,
        actionType: actionTypeFilter || undefined,
        performedByUserId: userFilter || undefined,
        page: page + 1,
        pageSize: ITEMS_PER_PAGE,
      })
      setApiData(result)
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'API hatasi')
      setApiData(null)
    } finally {
      setApiLoading(false)
    }
  }, [useApi, entityTypeFilter, actionTypeFilter, userFilter, page])

  useEffect(() => {
    if (useApi) {
      fetchApiLogs()
    }
  }, [useApi, fetchApiLogs])

  // Zustand fallback
  const allLogs = useMemo(() => getAllAuditLogs(data), [data])
  const filteredLogs = useMemo(() => {
    if (useApi) return []
    let result = allLogs
    if (entityTypeFilter) result = result.filter((log) => log.entityType === entityTypeFilter)
    if (actionTypeFilter) result = result.filter((log) => log.actionType === actionTypeFilter)
    if (userFilter) result = result.filter((log) => log.performedByUserId === userFilter)
    return result
  }, [useApi, allLogs, entityTypeFilter, actionTypeFilter, userFilter])

  type LogRow = {
    id: string
    performedAt: string
    performedByName: string
    actionType: string
    entityType: string
    description: string
  }

  const logRows = useMemo<LogRow[]>(() => {
    if (useApi && apiData) {
      return apiData.items.map((item) => ({
        id: item.id,
        performedAt: item.performedAt,
        performedByName: item.performedByName,
        actionType: item.actionType,
        entityType: item.entityType,
        description: item.description,
      }))
    }
    return filteredLogs.map((log) => {
      const actor = mapAuditLogActor(log, data)
      return {
        id: log.id,
        performedAt: log.performedAt,
        performedByName: actor ? formatFullName(actor) : '-',
        actionType: log.actionType,
        entityType: log.entityType,
        description: log.description,
      }
    })
  }, [useApi, apiData, filteredLogs, data])

  const logColumns = useMemo<ColumnDef<LogRow, any>[]>(() => {
    const ch = createColumnHelper<LogRow>()
    return [
      ch.accessor('performedAt', {
        header: 'Tarih',
        cell: ({ getValue }) => <span className="nowrap">{formatDateTimeLabel(getValue())}</span>,
        meta: { exportValue: (row) => formatDateTimeLabel(row.performedAt) ?? '-' },
      }),
      ch.accessor('performedByName', { header: 'Kullanici' }),
      ch.display({
        id: 'action',
        header: 'Islem',
        cell: ({ row }) => (
          <Badge tone={getActionTone(row.original.actionType)}>
            {getActionLabel(row.original.actionType)}
          </Badge>
        ),
        meta: { exportValue: (row) => getActionLabel(row.actionType) },
      }),
      ch.accessor('entityType', {
        header: 'Varlik',
        cell: ({ getValue }) => <span className="muted-text">{getValue()}</span>,
      }),
      ch.accessor('description', { header: 'Aciklama' }),
    ]
  }, [])

  const totalCount = useApi && apiData ? apiData.totalCount : filteredLogs.length
  const totalPages = useApi && apiData ? apiData.totalPages : 1

  function handleFilterChange() {
    setPage(0)
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Sistem"
        title="Aktivite Log"
        description={`Sistemdeki tum islemlerin kayitlari. Toplam ${totalCount} kayit.${useApi ? ' (API)' : ''}`}
      />

      {apiError && (
        <div className="inline-message inline-message--error">
          <span>API hatasi: {apiError}. Yerel veriler gosteriliyor.</span>
        </div>
      )}

      <Card title="Filtreler" className="filters-card filters-card--compact">
        <div className="activity-log-filters">
          <FormField label="Varlik Tipi">
            <Select
              value={entityTypeFilter}
              onChange={(e) => { setEntityTypeFilter(e.target.value); handleFilterChange() }}
            >
              {ENTITY_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Islem Tipi">
            <Select
              value={actionTypeFilter}
              onChange={(e) => { setActionTypeFilter(e.target.value); handleFilterChange() }}
            >
              {ACTION_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Kullanici">
            <Select
              value={userFilter}
              onChange={(e) => { setUserFilter(e.target.value); handleFilterChange() }}
            >
              <option value="">Tum kullanicilar</option>
              {data.users.map((user) => (
                <option key={user.id} value={user.id}>{formatFullName(user)}</option>
              ))}
            </Select>
          </FormField>
        </div>
      </Card>

      <Card
        title="Log Kayitlari"
        subtitle={apiLoading ? 'Yukleniyor...' : undefined}
        actions={
          useApi && totalPages > 1 ? (
            <div className="activity-log-pagination">
              <button type="button" className="button button--ghost button--sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                Onceki
              </button>
              <span className="activity-log-pagination__info">{page + 1} / {totalPages}</span>
              <button type="button" className="button button--ghost button--sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                Sonraki
              </button>
            </div>
          ) : undefined
        }
      >
        <DataTable
          data={logRows}
          columns={logColumns}
          filename="aktivite-log"
          searchPlaceholder="Kullanici, aciklama ara..."
          defaultPageSize={useApi ? logRows.length || 20 : ITEMS_PER_PAGE}
          getRowId={(row) => row.id}
          noDataMessage="Secili filtrelere uyan log kaydi bulunamadi."
        />
      </Card>
    </div>
  )
}
