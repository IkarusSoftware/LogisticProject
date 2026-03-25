import { type ReactNode, useMemo } from 'react'
import { X } from 'lucide-react'

import { getShipmentDetail, getStatusHistory } from '../domain/selectors'
import type { DemoData, ShipmentRequest, ShipmentStatus } from '../domain/models'
import {
  formatDateLabel,
  formatDateTimeLabel,
  formatFullName,
  formatPhoneLabel,
  getExitAt,
  getLoadingCompletedAt,
  getRampTakenAt,
  getStatusMeta,
  isDelayed,
} from '../domain/workflow'
import { Badge, Button, Card, FormField, Input, KeyValue, Select } from './ui'
import { DataTable, createColumnHelper, type ColumnDef } from './data-table'

export type ShipmentFilters = {
  status: string
  location: string
  supplier: string
  vehicleType: string
  dateFrom: string
  dateTo: string
  search: string
}

export const initialShipmentFilters: ShipmentFilters = {
  status: 'ALL',
  location: 'ALL',
  supplier: 'ALL',
  vehicleType: 'ALL',
  dateFrom: '',
  dateTo: '',
  search: '',
}

export function applyShipmentFilters(
  requests: ShipmentRequest[],
  data: DemoData,
  filters: ShipmentFilters,
  statusMode: 'workflow' | 'procurement' = 'workflow',
) {
  return requests.filter((request) => {
    const detail = getShipmentDetail(data, request.id)
    const searchable = [
      request.requestNo,
      request.productInfo,
      request.quantityInfo,
      detail?.location?.name,
      detail?.supplierCompany?.name,
      detail?.vehicleAssignment?.tractorPlate,
      detail?.vehicleAssignment?.trailerPlate,
      detail?.vehicleAssignment ? `${detail.vehicleAssignment.driverFirstName} ${detail.vehicleAssignment.driverLastName}` : '',
    ]
      .join(' ')
      .toLowerCase()

    const matchesSearch = filters.search ? searchable.includes(filters.search.toLowerCase()) : true
    const matchesStatus =
      filters.status === 'ALL' ||
      (statusMode === 'workflow'
        ? request.currentStatus === filters.status
        : getProcurementStatusMeta(request, detail?.vehicleAssignment).key === filters.status)
    const matchesLocation = filters.location === 'ALL' || request.targetLocationId === filters.location
    const matchesSupplier = filters.supplier === 'ALL' || request.assignedSupplierCompanyId === filters.supplier
    const matchesVehicleType = filters.vehicleType === 'ALL' || request.vehicleType === filters.vehicleType
    const matchesDateFrom = filters.dateFrom ? request.loadDate >= filters.dateFrom : true
    const matchesDateTo = filters.dateTo ? request.loadDate <= filters.dateTo : true

    return matchesSearch && matchesStatus && matchesLocation && matchesSupplier && matchesVehicleType && matchesDateFrom && matchesDateTo
  })
}

export function ShipmentFiltersBar({
  data,
  filters,
  onChange,
  statusMode = 'workflow',
  statusLabelOverrides,
}: {
  data: DemoData
  filters: ShipmentFilters
  onChange: (next: ShipmentFilters) => void
  statusMode?: 'workflow' | 'procurement'
  statusLabelOverrides?: Partial<Record<ShipmentStatus, string>>
}) {
  const hasActiveFilters =
    filters.status !== 'ALL' ||
    filters.location !== 'ALL' ||
    filters.supplier !== 'ALL' ||
    filters.vehicleType !== 'ALL' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '' ||
    filters.search !== ''

  return (
    <Card className="filters-card filters-card--compact">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.875rem' }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Filtrele</span>
        {hasActiveFilters && (
          <button
            type="button"
            style={{ fontSize: '0.75rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}
            onClick={() => onChange(initialShipmentFilters)}
          >
            Temizle
          </button>
        )}
      </div>
      <div className="filters-grid">
        <FormField label="Durum">
          <Select value={filters.status} onChange={(event) => onChange({ ...filters, status: event.target.value })}>
            <option value="ALL">Tüm durumlar</option>
            {statusMode === 'workflow'
              ? Array.from(new Set(data.shipmentRequests.map((request) => request.currentStatus))).map((status) => (
                  <option key={status} value={status}>
                    {statusLabelOverrides?.[status] ?? getStatusMeta(status).label}
                  </option>
                ))
              : PROCUREMENT_STATUS_OPTIONS.map((status) => (
                  <option key={status.key} value={status.key}>
                    {status.label}
                  </option>
                ))}
          </Select>
        </FormField>
        <FormField label="Lokasyon">
          <Select value={filters.location} onChange={(event) => onChange({ ...filters, location: event.target.value })}>
            <option value="ALL">Tüm lokasyonlar</option>
            {data.locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Tedarikçi">
          <Select value={filters.supplier} onChange={(event) => onChange({ ...filters, supplier: event.target.value })}>
            <option value="ALL">Tüm firmalar</option>
            {data.companies
              .filter((company) => company.type !== 'MAIN')
              .map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
          </Select>
        </FormField>
        <FormField label="Araç tipi">
          <Select value={filters.vehicleType} onChange={(event) => onChange({ ...filters, vehicleType: event.target.value })}>
            <option value="ALL">Tüm tipler</option>
            <option value="TIR">TIR</option>
            <option value="KAMYON">Kamyon</option>
            <option value="KAMYONET">Kamyonet</option>
          </Select>
        </FormField>
        <FormField label="Yükleme başlangıç">
          <Input type="date" value={filters.dateFrom} onChange={(event) => onChange({ ...filters, dateFrom: event.target.value })} />
        </FormField>
        <FormField label="Yükleme bitiş">
          <Input type="date" value={filters.dateTo} onChange={(event) => onChange({ ...filters, dateTo: event.target.value })} />
        </FormField>
        <FormField label="Plaka / sürücü / talep no">
          <Input placeholder="34 ABC 123 veya talep no..." value={filters.search} onChange={(event) => onChange({ ...filters, search: event.target.value })} />
        </FormField>
      </div>
    </Card>
  )
}

const colHelper = createColumnHelper<ShipmentRequest>()

export function ShipmentTable({
  requests,
  data,
  selectedId,
  onSelect,
  statusMode = 'workflow',
  showPhoneColumn = false,
  showRequestDateColumn = false,
  showOperationalTimeColumns = false,
  actionsHeaderLabel = 'Aksiyon',
  renderRowActions,
}: {
  requests: ShipmentRequest[]
  data: DemoData
  selectedId?: string | null
  onSelect: (shipmentRequestId: string) => void
  statusMode?: 'workflow' | 'procurement'
  showPhoneColumn?: boolean
  showRequestDateColumn?: boolean
  showOperationalTimeColumns?: boolean
  actionsHeaderLabel?: string
  renderRowActions?: (request: ShipmentRequest) => ReactNode
}) {
  const columns = useMemo<ColumnDef<ShipmentRequest, any>[]>(() => {
    const cols: ColumnDef<ShipmentRequest, any>[] = [
      colHelper.display({
        id: 'status',
        header: 'Durum',
        cell: ({ row }) => {
          const req = row.original
          const detail = getShipmentDetail(data, req.id)
          const meta = statusMode === 'procurement'
            ? getProcurementStatusMeta(req, detail?.vehicleAssignment)
            : getStatusMeta(req.currentStatus)
          return (
            <div className="status-cell">
              <Badge tone={meta.tone}>{meta.label}</Badge>
              {req.currentStatus === 'CORRECTION_REQUESTED' && detail?.vehicleAssignment?.rejectionReason && (
                <span className="table-note">{detail.vehicleAssignment.rejectionReason}</span>
              )}
              {isDelayed(req) && <span className="delay-dot" title="Gecikme riski" />}
            </div>
          )
        },
        meta: {
          exportValue: (req) => {
            const detail = getShipmentDetail(data, req.id)
            return statusMode === 'procurement'
              ? getProcurementStatusMeta(req, detail?.vehicleAssignment).label
              : getStatusMeta(req.currentStatus).label
          },
        },
      }),
      colHelper.accessor('requestNo', { header: 'Talep No' }),
      colHelper.display({
        id: 'location',
        header: 'Lokasyon',
        cell: ({ row }) => getShipmentDetail(data, row.original.id)?.location?.name ?? '-',
        meta: { exportValue: (req) => getShipmentDetail(data, req.id)?.location?.name ?? '-' },
      }),
    ]

    if (showRequestDateColumn) {
      cols.push(colHelper.accessor('requestDate', {
        id: 'requestDate',
        header: 'Talep Tarihi',
        cell: ({ getValue }) => formatDateLabel(getValue()),
        meta: { exportValue: (req) => req.requestDate },
      }))
    }

    cols.push(
      colHelper.accessor('loadDate', {
        header: 'Yukleme Tarihi',
        cell: ({ getValue }) => formatDateLabel(getValue()),
        meta: { exportValue: (req) => req.loadDate },
      }),
      colHelper.accessor('loadTime', { header: 'Saat' }),
      colHelper.display({
        id: 'supplier',
        header: 'Tedarikci',
        cell: ({ row }) => getShipmentDetail(data, row.original.id)?.supplierCompany?.name ?? '-',
        meta: { exportValue: (req) => getShipmentDetail(data, req.id)?.supplierCompany?.name ?? '-' },
      }),
      colHelper.display({
        id: 'tractorPlate',
        header: 'Cekici',
        cell: ({ row }) => getShipmentDetail(data, row.original.id)?.vehicleAssignment?.tractorPlate ?? '-',
        meta: { exportValue: (req) => getShipmentDetail(data, req.id)?.vehicleAssignment?.tractorPlate ?? '-' },
      }),
      colHelper.display({
        id: 'trailerPlate',
        header: 'Dorse',
        cell: ({ row }) => getShipmentDetail(data, row.original.id)?.vehicleAssignment?.trailerPlate ?? '-',
        meta: { exportValue: (req) => getShipmentDetail(data, req.id)?.vehicleAssignment?.trailerPlate ?? '-' },
      }),
      colHelper.display({
        id: 'driver',
        header: 'Sofor',
        cell: ({ row }) => {
          const va = getShipmentDetail(data, row.original.id)?.vehicleAssignment
          return va ? `${va.driverFirstName} ${va.driverLastName}` : '-'
        },
        meta: {
          exportValue: (req) => {
            const va = getShipmentDetail(data, req.id)?.vehicleAssignment
            return va ? `${va.driverFirstName} ${va.driverLastName}` : '-'
          },
        },
      }),
    )

    if (showPhoneColumn) {
      cols.push(colHelper.display({
        id: 'phone',
        header: 'Telefon',
        cell: ({ row }) => formatPhoneLabel(getShipmentDetail(data, row.original.id)?.vehicleAssignment?.driverPhone),
        meta: { exportValue: (req) => getShipmentDetail(data, req.id)?.vehicleAssignment?.driverPhone ?? '-' },
      }))
    }

    cols.push(colHelper.display({
      id: 'ramp',
      header: 'Rampa',
      cell: ({ row }) => getShipmentDetail(data, row.original.id)?.ramp?.code ?? '-',
      meta: { exportValue: (req) => getShipmentDetail(data, req.id)?.ramp?.code ?? '-' },
    }))

    if (showOperationalTimeColumns) {
      cols.push(
        colHelper.display({
          id: 'rampTakenAt',
          header: 'Rampaya Alinma',
          cell: ({ row }) => formatDateTimeLabel(getRampTakenAt(getShipmentDetail(data, row.original.id))),
          meta: { exportValue: (req) => formatDateTimeLabel(getRampTakenAt(getShipmentDetail(data, req.id))) ?? '-' },
        }),
        colHelper.display({
          id: 'loadingDone',
          header: 'Yukleme Bitis',
          cell: ({ row }) => formatDateTimeLabel(getLoadingCompletedAt(getShipmentDetail(data, row.original.id))),
          meta: { exportValue: (req) => formatDateTimeLabel(getLoadingCompletedAt(getShipmentDetail(data, req.id))) ?? '-' },
        }),
        colHelper.display({
          id: 'exitAt',
          header: 'Rampa Cikis',
          cell: ({ row }) => formatDateTimeLabel(getExitAt(getShipmentDetail(data, row.original.id))),
          meta: { exportValue: (req) => formatDateTimeLabel(getExitAt(getShipmentDetail(data, req.id))) ?? '-' },
        }),
      )
    }

    cols.push(colHelper.accessor('updatedAt', {
      id: 'lastUpdate',
      header: 'Son islem',
      cell: ({ getValue }) => formatDateTimeLabel(getValue()),
      meta: { exportValue: (req) => formatDateTimeLabel(req.updatedAt) ?? '-' },
    }))

    if (renderRowActions) {
      cols.push(colHelper.display({
        id: 'actions',
        header: actionsHeaderLabel,
        cell: ({ row }) => (
          <div className="table-cell-actions" onClick={(e) => e.stopPropagation()}>
            {renderRowActions(row.original)}
          </div>
        ),
        meta: { noExport: true },
        enableSorting: false,
        enableGlobalFilter: false,
      }))
    }

    return cols
  }, [data, statusMode, showPhoneColumn, showRequestDateColumn, showOperationalTimeColumns, renderRowActions, actionsHeaderLabel])

  return (
    <DataTable
      data={requests}
      columns={columns}
      filename="sevkiyatlar"
      searchPlaceholder="Talep no, plaka, sofor..."
      defaultPageSize={20}
      getRowId={(row) => row.id}
      selectedRowId={selectedId}
      onRowClick={(row) => onSelect(row.id)}
      noDataMessage="Secili filtrelere uyan sevkiyat bulunmuyor."
    />
  )
}

export function getProcurementStatusMeta(request: ShipmentRequest, assignment?: DemoData['vehicleAssignments'][number]) {
  if (request.currentStatus === 'VEHICLE_CANCELLED') {
    return {
      key: 'VEHICLE_CANCELLED',
      label: 'Arac iptal edildi',
      tone: 'danger' as const,
    }
  }

  if (request.currentStatus === 'CANCELLED') {
    return {
      key: 'CANCELLED',
      label: 'Iptal edildi',
      tone: 'danger' as const,
    }
  }

  if (request.currentStatus === 'REJECTED') {
    return {
      key: 'REJECTED',
      label: 'Reddedildi',
      tone: 'danger' as const,
    }
  }

  if (request.currentStatus === 'CORRECTION_REQUESTED') {
    return {
      key: 'CORRECTION_REQUESTED',
      label: 'Duzeltme talebi var',
      tone: 'warning' as const,
    }
  }

  if (request.currentStatus === 'APPROVED') {
    return {
      key: 'REGISTERED',
      label: 'Arac kaydi yapildi',
      tone: 'success' as const,
    }
  }

  if (request.currentStatus === 'RAMP_PLANNED') {
    return {
      key: 'RAMP_CALLED',
      label: 'Rampaya cagrildi',
      tone: 'info' as const,
    }
  }

  if (request.currentStatus === 'LOADING') {
    return {
      key: 'LOADING',
      label: 'Yukleniyor',
      tone: 'info' as const,
    }
  }

  if (request.currentStatus === 'LOADED') {
    return {
      key: 'LOADED',
      label: 'Yuklemesi tamamlandi',
      tone: 'success' as const,
    }
  }

  if (request.currentStatus === 'SEALED') {
    return {
      key: 'SEALED',
      label: 'Muhurlendi',
      tone: 'success' as const,
    }
  }

  if (request.currentStatus === 'EXITED') {
    return {
      key: 'EXITED',
      label: 'Cikis yapti',
      tone: 'success' as const,
    }
  }

  if (request.currentStatus === 'COMPLETED') {
    return {
      key: 'COMPLETED',
      label: 'Tamamlandi',
      tone: 'success' as const,
    }
  }

  const isSupplied = Boolean(
    assignment?.tractorPlate &&
      assignment?.trailerPlate &&
      assignment?.driverFirstName &&
      assignment?.driverLastName &&
      assignment?.driverPhone,
  )

  return isSupplied
    ? {
        key: 'SUPPLIED',
        label: 'Tedarik edildi',
        tone: 'success' as const,
      }
    : {
        key: 'WAITING',
        label: 'Arac tedarik bekliyor',
        tone: 'warning' as const,
      }
}

const PROCUREMENT_STATUS_OPTIONS = [
  { key: 'WAITING', label: 'Arac tedarik bekliyor' },
  { key: 'SUPPLIED', label: 'Tedarik edildi' },
  { key: 'CORRECTION_REQUESTED', label: 'Duzeltme talebi var' },
  { key: 'REGISTERED', label: 'Arac kaydi yapildi' },
  { key: 'RAMP_CALLED', label: 'Rampaya cagrildi' },
  { key: 'LOADING', label: 'Yukleniyor' },
  { key: 'LOADED', label: 'Yuklemesi tamamlandi' },
  { key: 'SEALED', label: 'Muhurlendi' },
  { key: 'EXITED', label: 'Cikis yapti' },
  { key: 'COMPLETED', label: 'Tamamlandi' },
  { key: 'REJECTED', label: 'Reddedildi' },
  { key: 'VEHICLE_CANCELLED', label: 'Arac iptal edildi' },
  { key: 'CANCELLED', label: 'Iptal edildi' },
]

export function ShipmentDetailDrawer({
  data,
  shipmentRequestId,
  onClose,
}: {
  data: DemoData
  shipmentRequestId?: string | null
  onClose: () => void
}) {
  if (!shipmentRequestId) {
    return null
  }

  const detail = getShipmentDetail(data, shipmentRequestId)
  if (!detail) {
    return null
  }

  const history = getStatusHistory(data, shipmentRequestId)

  const statusMeta = getStatusMeta(detail.request.currentStatus)

  return (
    <aside className="drawer">
      <div className="drawer__overlay" onClick={onClose} />
      <div className="drawer__panel">
        <header className="drawer__header">
          <div>
            <p className="drawer__eyebrow">{detail.request.requestNo}</p>
            <h3>Sevkiyat Detayı</h3>
            <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={15} />
            Kapat
          </Button>
        </header>

        <div className="drawer__content">
          <Card title="Genel bilgiler">
            <div className="detail-grid">
              <KeyValue label="Lokasyon" value={detail.location?.name ?? '-'} />
              <KeyValue label="Talep tarihi" value={formatDateLabel(detail.request.requestDate)} />
              <KeyValue label="Yukleme tarihi" value={formatDateLabel(detail.request.loadDate)} />
              <KeyValue label="Saat" value={detail.request.loadTime} />
              <KeyValue label="Urun / yuk" value={detail.request.productInfo} />
              <KeyValue label="Miktar" value={detail.request.quantityInfo} />
              <KeyValue label="Not" value={detail.request.notes || '-'} />
            </div>
          </Card>

          <Card title="Arac ve sofor">
            <div className="detail-grid">
              <KeyValue label="Tedarikci" value={detail.supplierCompany?.name ?? '-'} />
              <KeyValue label="Cekici plakasi" value={detail.vehicleAssignment?.tractorPlate ?? '-'} />
              <KeyValue label="Dorse plakasi" value={detail.vehicleAssignment?.trailerPlate ?? '-'} />
              <KeyValue label="Sofor" value={detail.vehicleAssignment ? `${detail.vehicleAssignment.driverFirstName} ${detail.vehicleAssignment.driverLastName}` : '-'} />
              <KeyValue label="Telefon" value={formatPhoneLabel(detail.vehicleAssignment?.driverPhone)} />
              <KeyValue label="Duzeltme notu" value={detail.vehicleAssignment?.rejectionReason ?? '-'} />
              <KeyValue label="Rampa" value={detail.ramp ? `${detail.ramp.code} • ${detail.ramp.name}` : '-'} />
              <KeyValue label="Rampaya alinma" value={formatDateTimeLabel(getRampTakenAt(detail))} />
              <KeyValue
                label="Kapi kontrolu yapan"
                value={formatFullName(data.users.find(u => u.id === detail.gateOperation?.checkedBy))}
              />
              <KeyValue label="Yukleme bitis" value={formatDateTimeLabel(getLoadingCompletedAt(detail))} />
              <KeyValue
                label="Yuklemeyi tamamlayan"
                value={formatFullName(data.users.find(u => u.id === detail.loadingOperation?.finalizedBy))}
              />
              <KeyValue label="Rampa cikis" value={formatDateTimeLabel(getExitAt(detail))} />
              <KeyValue label="Muhur No" value={detail.loadingOperation?.sealNumber ?? '-'} />
              <KeyValue
                label="Muhuru onaylayan"
                value={formatFullName(data.users.find(u => u.id === detail.loadingOperation?.sealApprovedBy))}
              />
            </div>
          </Card>

          <Card title="Islem zaman akisi">
            <div className="timeline">
              {history.map((item) => {
                const actor = data.users.find((u) => u.id === item.changedBy)
                return (
                  <div key={item.id} className="timeline__item">
                    <div className="timeline__dot" />
                    <div>
                      <strong>{getStatusMeta(item.newStatus).label}</strong>
                      {actor && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          marginLeft: '0.5rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: '#0d9488',
                          background: '#f0fdfa',
                          border: '1px solid #ccfbf1',
                          borderRadius: 99,
                          padding: '0.1rem 0.5rem',
                        }}>
                          {formatFullName(actor)}
                        </span>
                      )}
                      <p>{item.note || '-'}</p>
                      <span>{formatDateTimeLabel(item.changedAt)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </div>
    </aside>
  )
}
