import { useCallback, useEffect, useState } from 'react'

import { ShipmentDetailDrawer, ShipmentFiltersBar, ShipmentTable, applyShipmentFilters, initialShipmentFilters } from '../components/shipments'
import { Badge, Button, Card, PageHeader } from '../components/ui'
import { DataTable, createColumnHelper, type ColumnDef } from '../components/data-table'
import { getCurrentUser, getVisibleRequests } from '../domain/selectors'
import { formatDateLabel, getStatusMeta } from '../domain/workflow'
import { hasTokens, shipmentApi } from '../services/api'
import type { PagedResult, ShipmentListDto } from '../services/types'
import { useAppStore } from '../store/app-store'

const TERMINAL_STATUSES = ['COMPLETED', 'REJECTED', 'CANCELLED', 'VEHICLE_CANCELLED']
const PAGE_SIZE = 50

export function HistoryPage() {
  const data = useAppStore((state) => state.data)
  const session = useAppStore((state) => state.session)
  const currentUser = getCurrentUser(data, session.currentUserId)

  const [filters, setFilters] = useState(initialShipmentFilters)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [page, setPage] = useState(0)

  // API state
  const [apiData, setApiData] = useState<PagedResult<ShipmentListDto> | null>(null)
  const [apiLoading, setApiLoading] = useState(false)
  const useApi = hasTokens()

  const fetchHistory = useCallback(async () => {
    if (!hasTokens()) return
    setApiLoading(true)
    try {
      const result = await shipmentApi.list({
        terminal: true,
        search: filters.search || undefined,
        locationId: filters.location !== 'ALL' ? filters.location : undefined,
        supplierId: filters.supplier !== 'ALL' ? filters.supplier : undefined,
        vehicleType: filters.vehicleType !== 'ALL' ? filters.vehicleType : undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        page: page + 1,
        pageSize: PAGE_SIZE,
      })
      setApiData(result)
    } catch {
      setApiData(null)
    } finally {
      setApiLoading(false)
    }
  }, [filters, page])

  useEffect(() => {
    if (useApi) {
      fetchHistory()
    }
  }, [useApi, fetchHistory])

  // Zustand fallback
  const zustandRequests = getVisibleRequests(data, currentUser).filter((request) =>
    TERMINAL_STATUSES.includes(request.currentStatus),
  )
  const zustandFiltered = applyShipmentFilters(zustandRequests, data, filters)

  function handleExport() {
    if (useApi && apiData) {
      const rows = apiData.items.map((item) =>
        [item.requestNo, item.currentStatus, item.loadDate, item.loadTime, item.tractorPlate ?? '', item.driverName ?? ''].join(';'),
      )
      downloadCsv(['TalepNo;Durum;YuklemeTarihi;Saat;Cekici;Sofor', ...rows].join('\n'))
    } else {
      const rows = zustandFiltered.map((request) => {
        const assignment = data.vehicleAssignments.find((item) => item.shipmentRequestId === request.id)
        return [
          request.requestNo,
          request.currentStatus,
          request.loadDate,
          request.loadTime,
          assignment?.tractorPlate ?? '',
          assignment ? `${assignment.driverFirstName} ${assignment.driverLastName}` : '',
        ].join(';')
      })
      downloadCsv(['TalepNo;Durum;YuklemeTarihi;Saat;Cekici;Sofor', ...rows].join('\n'))
    }
  }

  const totalCount = useApi && apiData ? apiData.totalCount : zustandFiltered.length
  const totalPages = useApi && apiData ? apiData.totalPages : 1

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Kapanan operasyonlar"
        title={`Islem gecmisi ve tamamlananlar${useApi && apiData ? ' (API)' : ''}`}
        description="Tamamlanan, reddedilen ve iptal edilen sevkiyatlar ayni ekranda tutulur. Detay cekmecesinde tam zaman cizelgesi ve audit log gorulur."
        actions={
          <Button variant="secondary" onClick={handleExport}>
            Export
          </Button>
        }
      />

      <ShipmentFiltersBar data={data} filters={filters} onChange={(f) => { setFilters(f); setPage(0) }} />

      <Card
        title="Gecmis kayitlari"
        subtitle={`${apiLoading ? 'Yukleniyor...' : `${totalCount} kayit`}`}
        actions={
          totalPages > 1 ? (
            <div className="activity-log-pagination">
              <button
                type="button"
                className="button button--ghost button--sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Onceki
              </button>
              <span className="activity-log-pagination__info">{page + 1} / {totalPages}</span>
              <button
                type="button"
                className="button button--ghost button--sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Sonraki
              </button>
            </div>
          ) : undefined
        }
      >
        {useApi && apiData ? (
          <ApiHistoryDataTable items={apiData.items} selectedId={selectedId} onSelect={setSelectedId} />
        ) : (
          <ShipmentTable
            requests={zustandFiltered}
            data={data}
            selectedId={selectedId}
            onSelect={setSelectedId}
            showPhoneColumn
            showRequestDateColumn
            showOperationalTimeColumns
          />
        )}
      </Card>
      <ShipmentDetailDrawer data={data} shipmentRequestId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  )
}

const historyColHelper = createColumnHelper<ShipmentListDto>()

const HISTORY_COLUMNS: ColumnDef<ShipmentListDto, any>[] = [
  historyColHelper.display({
    id: 'status',
    header: 'Durum',
    cell: ({ row }) => {
      const meta = getStatusMeta(row.original.currentStatus as never)
      return <Badge tone={meta.tone}>{meta.label}</Badge>
    },
    meta: { exportValue: (row) => getStatusMeta(row.currentStatus as never).label },
  }),
  historyColHelper.accessor('requestNo', { header: 'Talep No' }),
  historyColHelper.accessor('locationName', { header: 'Lokasyon' }),
  historyColHelper.accessor('loadDate', {
    header: 'Yukleme Tarihi',
    cell: ({ getValue }) => formatDateLabel(getValue()),
    meta: { exportValue: (row) => row.loadDate },
  }),
  historyColHelper.accessor('loadTime', { header: 'Saat' }),
  historyColHelper.accessor('supplierCompanyName', { header: 'Tedarikci' }),
  historyColHelper.accessor('tractorPlate', {
    header: 'Cekici',
    cell: ({ getValue }) => getValue() ?? '-',
  }),
  historyColHelper.accessor('driverName', {
    header: 'Sofor',
    cell: ({ getValue }) => getValue() ?? '-',
  }),
  historyColHelper.accessor('rampCode', {
    header: 'Rampa',
    cell: ({ getValue }) => getValue() ?? '-',
  }),
]

function ApiHistoryDataTable({
  items,
  selectedId,
  onSelect,
}: {
  items: ShipmentListDto[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <DataTable
      data={items}
      columns={HISTORY_COLUMNS}
      filename="sevkiyat-gecmisi"
      searchPlaceholder="Talep no, lokasyon, plaka ara..."
      defaultPageSize={50}
      getRowId={(row) => row.id}
      selectedRowId={selectedId}
      onRowClick={(row) => onSelect(row.id)}
      noDataMessage="Kayit bulunamadi."
    />
  )
}

function downloadCsv(content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'sevkiyat-gecmisi.csv'
  link.click()
  URL.revokeObjectURL(url)
}
