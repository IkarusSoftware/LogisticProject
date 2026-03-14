import type { ReactNode } from 'react'
import { X } from 'lucide-react'

import { getAuditLogs, getShipmentDetail, getStatusHistory } from '../domain/selectors'
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
import { Badge, Button, Card, EmptyState, FormField, Input, KeyValue, Select } from './ui'

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
  return (
    <Card className="filters-card">
      <div className="filters-grid">
        <FormField label="Durum">
          <Select value={filters.status} onChange={(event) => onChange({ ...filters, status: event.target.value })}>
            <option value="ALL">Tum durumlar</option>
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
            <option value="ALL">Tum lokasyonlar</option>
            {data.locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Tedarikci">
          <Select value={filters.supplier} onChange={(event) => onChange({ ...filters, supplier: event.target.value })}>
            <option value="ALL">Tum firmalar</option>
            {data.companies
              .filter((company) => company.type !== 'MAIN')
              .map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
          </Select>
        </FormField>
        <FormField label="Arac tipi">
          <Select value={filters.vehicleType} onChange={(event) => onChange({ ...filters, vehicleType: event.target.value })}>
            <option value="ALL">Tum tipler</option>
            <option value="TIR">TIR</option>
            <option value="KAMYON">Kamyon</option>
            <option value="KAMYONET">Kamyonet</option>
          </Select>
        </FormField>
        <FormField label="Yukleme baslangic">
          <Input type="date" value={filters.dateFrom} onChange={(event) => onChange({ ...filters, dateFrom: event.target.value })} />
        </FormField>
        <FormField label="Yukleme bitis">
          <Input type="date" value={filters.dateTo} onChange={(event) => onChange({ ...filters, dateTo: event.target.value })} />
        </FormField>
        <FormField label="Plaka / sofor / talep no">
          <Input placeholder="34 ABC 123 / Hakan Kurt / SR-..." value={filters.search} onChange={(event) => onChange({ ...filters, search: event.target.value })} />
        </FormField>
      </div>
    </Card>
  )
}

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
  if (requests.length === 0) {
    return <EmptyState title="Kayit bulunamadi" description="Secili filtrelere uyan sevkiyat bulunmuyor." />
  }

  return (
    <div className="table-shell">
      <table className="data-table">
        <thead>
          <tr>
            <th>Durum</th>
            <th>Talep No</th>
            <th>Lokasyon</th>
            {showRequestDateColumn && <th>Talep Tarihi</th>}
            <th>Yukleme Tarihi</th>
            <th>Saat</th>
            <th>Tedarikci</th>
            <th>Cekici</th>
            <th>Dorse</th>
            <th>Sofor</th>
            {showPhoneColumn && <th>Telefon</th>}
            <th>Rampa</th>
            {showOperationalTimeColumns && <th>Rampaya Alinma</th>}
            {showOperationalTimeColumns && <th>Yukleme Bitis</th>}
            {showOperationalTimeColumns && <th>Rampa Cikis</th>}
            <th>Son islem</th>
            {renderRowActions && <th>{actionsHeaderLabel}</th>}
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => {
            const detail = getShipmentDetail(data, request.id)
            const statusMeta =
              statusMode === 'procurement' ? getProcurementStatusMeta(request, detail?.vehicleAssignment) : getStatusMeta(request.currentStatus)
            return (
              <tr
                key={request.id}
                className={selectedId === request.id ? 'data-table__row data-table__row--selected' : 'data-table__row'}
                onClick={() => onSelect(request.id)}
              >
                <td>
                  <div className="status-cell">
                    <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                    {request.currentStatus === 'CORRECTION_REQUESTED' && detail?.vehicleAssignment?.rejectionReason && (
                      <span className="table-note">{detail.vehicleAssignment.rejectionReason}</span>
                    )}
                    {isDelayed(request) && <span className="delay-dot" title="Gecikme riski" />}
                  </div>
                </td>
                <td>{request.requestNo}</td>
                <td>{detail?.location?.name ?? '-'}</td>
                {showRequestDateColumn && <td>{formatDateLabel(request.requestDate)}</td>}
                <td>{formatDateLabel(request.loadDate)}</td>
                <td>{request.loadTime}</td>
                <td>{detail?.supplierCompany?.name ?? '-'}</td>
                <td>{detail?.vehicleAssignment?.tractorPlate ?? '-'}</td>
                <td>{detail?.vehicleAssignment?.trailerPlate ?? '-'}</td>
                <td>{detail?.vehicleAssignment ? `${detail.vehicleAssignment.driverFirstName} ${detail.vehicleAssignment.driverLastName}` : '-'}</td>
                {showPhoneColumn && <td>{formatPhoneLabel(detail?.vehicleAssignment?.driverPhone)}</td>}
                <td>{detail?.ramp?.code ?? '-'}</td>
                {showOperationalTimeColumns && <td>{formatDateTimeLabel(getRampTakenAt(detail))}</td>}
                {showOperationalTimeColumns && <td>{formatDateTimeLabel(getLoadingCompletedAt(detail))}</td>}
                {showOperationalTimeColumns && <td>{formatDateTimeLabel(getExitAt(detail))}</td>}
                <td>{formatDateTimeLabel(request.updatedAt)}</td>
                {renderRowActions && (
                  <td className="table-cell-actions" onClick={(event) => event.stopPropagation()}>
                    {renderRowActions(request)}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
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
  const auditLogs = getAuditLogs(data, shipmentRequestId)
  const statusMeta = getStatusMeta(detail.request.currentStatus)

  return (
    <aside className="drawer">
      <div className="drawer__overlay" onClick={onClose} />
      <div className="drawer__panel">
        <header className="drawer__header">
          <div>
            <p className="drawer__eyebrow">{detail.request.requestNo}</p>
            <h3>Sevkiyat detayi</h3>
            <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={16} />
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
              <KeyValue label="Yukleme bitis" value={formatDateTimeLabel(getLoadingCompletedAt(detail))} />
              <KeyValue label="Rampa cikis" value={formatDateTimeLabel(getExitAt(detail))} />
              <KeyValue label="Muhur No" value={detail.loadingOperation?.sealNumber ?? '-'} />
            </div>
          </Card>

          <Card title="Islem zaman akisi">
            <div className="timeline">
              {history.map((item) => (
                <div key={item.id} className="timeline__item">
                  <div className="timeline__dot" />
                  <div>
                    <strong>{getStatusMeta(item.newStatus).label}</strong>
                    <p>{item.note || '-'}</p>
                    <span>{formatDateTimeLabel(item.changedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Audit log">
            <div className="audit-list">
              {auditLogs.map((log) => {
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
        </div>
      </div>
    </aside>
  )
}
