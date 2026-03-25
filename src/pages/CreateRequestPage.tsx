import { useEffect, useMemo, useState } from 'react'
import { addDays, format } from 'date-fns'

import { Badge, Button, Card, InlineMessage, PageHeader } from '../components/ui'
import { getCurrentUser, getShipmentDetail, getVisibleRequests } from '../domain/selectors'
import type { CreateRequestInput, DemoData, RequestRevisionInput, ShipmentStatus } from '../domain/models'
import { canCancelRequest, formatDateLabel, formatDateTimeLabel, formatVehicleTypeLabel, getExitAt, getRampTakenAt, getStatusMeta } from '../domain/workflow'
import { useAppStore } from '../store/app-store'
import { hasTokens, shipmentApi } from '../services/api'

type DraftRequest = CreateRequestInput & {
  draftId: string
}

export function CreateRequestPage() {
  const data = useAppStore((state) => state.data)
  const session = useAppStore((state) => state.session)
  const loadingZones = useAppStore((state) => state.loadingZones)
  const createShipmentRequests = useAppStore((state) => state.createShipmentRequests)
  const clearActiveRequests = useAppStore((state) => state.clearActiveRequests)
  const reviseActiveRequest = useAppStore((state) => state.reviseActiveRequest)
  const cancelVehicleRequest = useAppStore((state) => state.cancelVehicleRequest)
  const currentUser = getCurrentUser(data, session.currentUserId)
  const activeRequests = getVisibleRequests(data, currentUser).filter(
    (request) => !['COMPLETED', 'REJECTED', 'CANCELLED'].includes(request.currentStatus),
  )

  const supplierOptions = useMemo(
    () => data.companies.filter((c) => (c.type === 'SUPPLIER' || c.type === 'LOGISTICS') && c.status === 'ACTIVE'),
    [data.companies],
  )

  // Zones configured by admin filter which locations are shown.
  // IDs always come from data.locations so validation in the store always passes.
  const locationOptions = useMemo(() => {
    const activeLocs = data.locations.filter((l) => l.isActive)
    if (!Array.isArray(loadingZones) || loadingZones.length === 0) {
      return activeLocs.map((l) => ({ id: l.id, name: l.name }))
    }
    const validZones = loadingZones.filter(
      (z): z is { name: string; locationId: string } => typeof z === 'object' && z !== null && Boolean(z.locationId),
    )
    if (validZones.length === 0) return activeLocs.map((l) => ({ id: l.id, name: l.name }))
    // Match by exact locationId first, fall back to name match (handles legacy loc-* IDs)
    const filtered = activeLocs.filter((l) =>
      validZones.some((z) => z.locationId === l.id || z.name.toLowerCase() === l.name.toLowerCase()),
    )
    return filtered.length > 0 ? filtered.map((l) => ({ id: l.id, name: l.name })) : activeLocs.map((l) => ({ id: l.id, name: l.name }))
  }, [loadingZones, data.locations])

  const [drafts, setDrafts] = useState<DraftRequest[]>(() => [
    createDraftRow(locationOptions[0]?.id ?? '', supplierOptions[0]?.id ?? ''),
  ])

  // Keep draft location and supplier IDs in sync when available options change
  useEffect(() => {
    const locIds = new Set(locationOptions.map((l) => l.id))
    const supIds = new Set(supplierOptions.map((c) => c.id))
    setDrafts((prev) =>
      prev.map((d) => ({
        ...d,
        targetLocationId: locIds.has(d.targetLocationId) ? d.targetLocationId : (locationOptions[0]?.id ?? d.targetLocationId),
        assignedSupplierCompanyId: supIds.has(d.assignedSupplierCompanyId) ? d.assignedSupplierCompanyId : (supplierOptions[0]?.id ?? d.assignedSupplierCompanyId),
      }))
    )
  }, [locationOptions, supplierOptions])
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null)
  const [revisionForm, setRevisionForm] = useState<RequestRevisionInput>({ vehicleType: 'TIR', requestDate: '', loadDate: '', loadTime: '09:00' })
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  function handleRowChange<K extends keyof DraftRequest>(draftId: string, field: K, value: DraftRequest[K]) {
    setDrafts((current) => current.map((draft) => (draft.draftId === draftId ? { ...draft, [field]: value } : draft)))
  }

  function handleAddRow() {
    setDrafts((current) => [...current, createDraftRow(locationOptions[0]?.id ?? '', supplierOptions[0]?.id ?? '')])
    setMessage(null)
  }

  function handleRemoveRow(draftId: string) {
    setDrafts((current) => {
      const remaining = current.filter((draft) => draft.draftId !== draftId)
      return remaining.length > 0 ? remaining : [createDraftRow(locationOptions[0]?.id ?? '', supplierOptions[0]?.id ?? '')]
    })
  }

  async function handleSubmitAll() {
    const normalized = drafts.map(({ draftId, ...request }) => normalizeDraftRequest(request, data))

    if (hasTokens()) {
      try {
        const items = normalized.map((r) => ({
          targetLocationId: r.targetLocationId,
          assignedSupplierCompanyId: r.assignedSupplierCompanyId,
          vehicleType: r.vehicleType,
          requestDate: r.requestDate,
          loadDate: r.loadDate,
          loadTime: r.loadTime,
          quantityInfo: r.quantityInfo,
          productInfo: r.productInfo,
          notes: r.notes ?? '',
        }))
        const result = await shipmentApi.createBatch({ items })
        setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
        if (result.ok) {
          // Also persist to local Zustand so requests survive user switches
          createShipmentRequests(normalized)
          setDrafts([createDraftRow(locationOptions[0]?.id ?? '', supplierOptions[0]?.id ?? '')])
        }
        return
      } catch { /* fallback */ }
    }

    const result = createShipmentRequests(normalized)
    setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
    if (result.ok) setDrafts([createDraftRow(locationOptions[0]?.id ?? '', supplierOptions[0]?.id ?? '')])
  }

  async function handleClearActiveRequests() {
    if (hasTokens()) {
      try {
        const result = await shipmentApi.clearActive()
        setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
        return
      } catch { /* fallback */ }
    }
    const result = clearActiveRequests()
    setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
  }

  function handleStartRevision(shipmentRequestId: string, currentVehicleType: RequestRevisionInput['vehicleType'], currentLoadTime: string) {
    setEditingRequestId(shipmentRequestId)
    const request = activeRequests.find((r) => r.id === shipmentRequestId)
    setRevisionForm({ vehicleType: currentVehicleType, requestDate: request?.requestDate ?? '', loadDate: request?.loadDate ?? '', loadTime: currentLoadTime })
    setMessage(null)
  }

  async function handleSaveRevision(shipmentRequestId: string) {
    if (hasTokens()) {
      try {
        const result = await shipmentApi.revise(shipmentRequestId, {
          vehicleType: revisionForm.vehicleType,
          requestDate: revisionForm.requestDate,
          loadDate: revisionForm.loadDate,
          loadTime: revisionForm.loadTime,
        })
        setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
        if (result.ok) setEditingRequestId(null)
        return
      } catch { /* fallback */ }
    }
    const result = reviseActiveRequest(shipmentRequestId, revisionForm)
    setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
    if (result.ok) setEditingRequestId(null)
  }

  function handleCancelRevision() {
    setEditingRequestId(null)
  }

  async function handleCancelVehicle(shipmentRequestId: string) {
    if (hasTokens()) {
      try {
        const result = await shipmentApi.cancelVehicle(shipmentRequestId)
        setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
        if (result.ok && editingRequestId === shipmentRequestId) setEditingRequestId(null)
        return
      } catch { /* fallback */ }
    }
    const result = cancelVehicleRequest(shipmentRequestId)
    setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
    if (result.ok && editingRequestId === shipmentRequestId) setEditingRequestId(null)
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Kullanici akisi 1/5"
        title="Coklu sevkiyat talebi"
        description="Talep satirlari artik tablo icinde dogrudan duzenlenir. Her satirda yukleme bolgesi, arac turu, tarih, saat ve tedarikci firma secimini alt alta yapabilirsiniz."
      />

      {message && <InlineMessage kind={message.kind} message={message.text} />}

      <Card
        title="Talep listesi"
        subtitle="Liste tipi giris yapisi: satir ekleyin, satir icinde secim yapin, sonra toplu kaydedin."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={handleAddRow}>
              Satir Ekle
            </Button>
            <Button variant="success" size="sm" onClick={handleSubmitAll}>
              Tumunu Kaydet ve Gonder
            </Button>
          </>
        }
      >
        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Durum</th>
                <th>Talep No</th>
                <th>Yukleme Bolgesi</th>
                <th>Arac Turu</th>
                <th>Talep Tarihi</th>
                <th>Yukleme Tarihi</th>
                <th>Saat</th>
                <th>Tedarikci Firma</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {drafts.map((draft) => (
                <tr key={draft.draftId} className="data-table__row data-table__row--form">
                  <td>
                    <Badge tone="neutral">Taslak</Badge>
                  </td>
                  <td className="muted-text">Kayit sonrasi</td>
                  <td>
                    <select
                      className="table-input"
                      value={draft.targetLocationId}
                      onChange={(event) => handleRowChange(draft.draftId, 'targetLocationId', event.target.value)}
                    >
                      {locationOptions.map((loc) => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="table-input"
                      value={draft.vehicleType}
                      onChange={(event) => handleRowChange(draft.draftId, 'vehicleType', event.target.value as DraftRequest['vehicleType'])}
                    >
                      <option value="TIR">Tir</option>
                      <option value="KAMYON">Kamyon</option>
                    </select>
                  </td>
                  <td>
                    <input
                      className="table-input"
                      type="date"
                      value={draft.requestDate}
                      onChange={(event) => handleRowChange(draft.draftId, 'requestDate', event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="table-input"
                      type="date"
                      value={draft.loadDate}
                      onChange={(event) => handleRowChange(draft.draftId, 'loadDate', event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="table-input"
                      type="time"
                      value={draft.loadTime}
                      onChange={(event) => handleRowChange(draft.draftId, 'loadTime', event.target.value)}
                    />
                  </td>
                  <td>
                    <select
                      className="table-input"
                      value={draft.assignedSupplierCompanyId}
                      onChange={(event) => handleRowChange(draft.draftId, 'assignedSupplierCompanyId', event.target.value)}
                    >
                      {supplierOptions.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="table-cell-actions">
                    <Button variant="danger" size="sm" onClick={() => handleRemoveRow(draft.draftId)}>
                      Sil
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        title="Aktif talepler"
        subtitle="Kayitlar yukleme tarih ve saatine gore alt alta listelenir."
        actions={
          <Button variant="danger" size="sm" onClick={handleClearActiveRequests}>
            Aktif Talepleri Temizle
          </Button>
        }
      >
        {activeRequests.length === 0 ? (
          <p className="muted-text">Henuz aktif talep bulunmuyor.</p>
        ) : (
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Durum</th>
                  <th>Talep No</th>
                  <th>Yukleme Bolgesi</th>
                  <th>Arac Turu</th>
                  <th>Talep Tarihi</th>
                  <th>Yukleme Tarihi</th>
                  <th>Saat</th>
                  <th>Tedarikci Firma</th>
                  <th>Rampaya Alinma</th>
                  <th>Rampa Cikis</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {activeRequests.map((request) => {
                  const isEditing = editingRequestId === request.id
                  const canRevise = canReviseActiveRequestStatus(request.currentStatus)
                  const canCancel = canCancelRequest(request)
                  const detail = getShipmentDetail(data, request.id)
                  const rampTakenAt = getRampTakenAt(detail)
                  const exitAt = getExitAt(detail)
                  const showCompletedOperationTimes = ['LOADED', 'SEALED', 'EXITED', 'COMPLETED'].includes(request.currentStatus)

                  return (
                    <tr key={request.id} className="data-table__row data-table__row--static">
                      <td>
                        <StatusBadge status={request.currentStatus} />
                      </td>
                      <td>{request.requestNo}</td>
                      <td>{getLocationName(data, request.targetLocationId)}</td>
                      <td>
                        {isEditing ? (
                          <select
                            className="table-input"
                            value={revisionForm.vehicleType}
                            onChange={(event) =>
                              setRevisionForm((current) => ({
                                ...current,
                                vehicleType: event.target.value as RequestRevisionInput['vehicleType'],
                              }))
                            }
                          >
                            <option value="TIR">Tir</option>
                            <option value="KAMYON">Kamyon</option>
                          </select>
                        ) : (
                          formatVehicleTypeLabel(request.vehicleType)
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            className="table-input"
                            type="date"
                            value={revisionForm.requestDate}
                            onChange={(event) => setRevisionForm((current) => ({ ...current, requestDate: event.target.value }))}
                          />
                        ) : (
                          formatDateLabel(request.requestDate)
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            className="table-input"
                            type="date"
                            value={revisionForm.loadDate}
                            onChange={(event) => setRevisionForm((current) => ({ ...current, loadDate: event.target.value }))}
                          />
                        ) : (
                          formatDateLabel(request.loadDate)
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            className="table-input"
                            type="time"
                            value={revisionForm.loadTime}
                            onChange={(event) => setRevisionForm((current) => ({ ...current, loadTime: event.target.value }))}
                          />
                        ) : (
                          request.loadTime
                        )}
                      </td>
                      <td>{getCompanyName(data, request.assignedSupplierCompanyId)}</td>
                      <td>{showCompletedOperationTimes ? formatDateTimeLabel(rampTakenAt) : '-'}</td>
                      <td>{showCompletedOperationTimes ? formatDateTimeLabel(exitAt) : '-'}</td>
                      <td className="table-cell-actions">
                        {isEditing ? (
                          <div className="table-action-group">
                            <Button variant="secondary" size="sm" onClick={handleCancelRevision}>
                              Vazgec
                            </Button>
                            <Button variant="success" size="sm" onClick={() => handleSaveRevision(request.id)}>
                              Kaydet
                            </Button>
                          </div>
                        ) : request.currentStatus === 'VEHICLE_CANCELLED' ? (
                          <span className="muted-text">Arac iptal edildi</span>
                        ) : !canRevise && !canCancel ? (
                          <span className="muted-text">Saha sonrasi</span>
                        ) : (
                          <div className="table-action-group">
                            {canRevise && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleStartRevision(request.id, request.vehicleType, request.loadTime)}
                              >
                                Revize
                              </Button>
                            )}
                            {canCancel && (
                              <Button variant="danger" size="sm" onClick={() => handleCancelVehicle(request.id)}>
                                Arac Iptal
                              </Button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function createDraftRow(defaultZone = '', defaultSupplier = ''): DraftRequest {
  return {
    draftId: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    targetLocationId: defaultZone,
    vehicleType: 'TIR',
    requestDate: format(new Date(), 'yyyy-MM-dd'),
    loadDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    loadTime: '09:00',
    assignedSupplierCompanyId: defaultSupplier,
    quantityInfo: '1 tir',
    productInfo: 'Sevkiyat talebi',
    notes: '',
  }
}

function getLocationName(data: DemoData, locationId: string) {
  return data.locations.find((location) => location.id === locationId)?.name ?? '-'
}

function getCompanyName(data: DemoData, companyId: string) {
  return data.companies.find((company) => company.id === companyId)?.name ?? '-'
}


function normalizeDraftRequest(request: CreateRequestInput, data: DemoData): CreateRequestInput {
  const locationName = getLocationName(data, request.targetLocationId)
  const vehicleLabel = request.vehicleType === 'TIR' ? 'tir' : 'kamyon'

  return {
    ...request,
    quantityInfo: `1 ${vehicleLabel}`,
    productInfo: `${locationName} bolgesi sevkiyati`,
    notes: request.notes ?? '',
  }
}

function StatusBadge({ status }: { status: ShipmentStatus }) {
  const statusMeta = getStatusMeta(status)
  return <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
}

function canReviseActiveRequestStatus(status: ShipmentStatus) {
  return !['VEHICLE_CANCELLED', 'ARRIVED', 'ADMITTED', 'AT_RAMP', 'LOADING', 'LOADED', 'SEALED', 'EXITED'].includes(status)
}
