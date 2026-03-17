import { useState } from 'react'

import {
  ShipmentDetailDrawer,
  ShipmentFiltersBar,
  ShipmentTable,
  applyShipmentFilters,
  getProcurementStatusMeta,
  initialShipmentFilters,
} from '../components/shipments'
import { Badge, Button, Card, InlineMessage, PageHeader, Textarea } from '../components/ui'
import { getCurrentRoleKey, getCurrentUser, getShipmentDetail, getVisibleRequests } from '../domain/selectors'
import type { DemoData, ShipmentRequest, ShipmentStatus, VehicleAssignmentInput } from '../domain/models'
import {
  canCancelRequest,
  formatDateLabel,
  formatDateTimeLabel,
  formatPhoneLabel,
  formatVehicleTypeLabel,
  getExitAt,
  getLoadingCompletedAt,
  getRampTakenAt,
  getStatusMeta,
} from '../domain/workflow'
import { useAppStore } from '../store/app-store'
import { hasTokens, shipmentApi } from '../services/api'

type SupplierSupplyForm = {
  tractorPlate: string
  trailerPlate: string
  driverFullName: string
  driverPhone: string
}

type SealForm = {
  sealNumber: string
  note: string
}

const EMPTY_SUPPLY_FORM: SupplierSupplyForm = {
  tractorPlate: '',
  trailerPlate: '',
  driverFullName: '',
  driverPhone: '',
}

const EMPTY_SEAL_FORM: SealForm = {
  sealNumber: '',
  note: '',
}

const RAMP_OPTIONS = Array.from({ length: 15 }, (_, index) => ({
  id: `ramp-generic-${String(index + 1).padStart(2, '0')}`,
  label: `Rampa ${index + 1}`,
}))

const OPERATIONS_STATUS_LABEL_OVERRIDES = {
  RAMP_PLANNED: 'Arac Rampada',
} as const

export function ShipmentListPage() {
  const data = useAppStore((state) => state.data)
  const session = useAppStore((state) => state.session)
  const cancelRequest = useAppStore((state) => state.cancelRequest)
  const cancelVehicleRequest = useAppStore((state) => state.cancelVehicleRequest)
  const submitVehicleAssignment = useAppStore((state) => state.submitVehicleAssignment)
  const acceptSecurityCorrection = useAppStore((state) => state.acceptSecurityCorrection)
  const assignRamp = useAppStore((state) => state.assignRamp)
  const finalizeLoading = useAppStore((state) => state.finalizeLoading)
  const currentUser = getCurrentUser(data, session.currentUserId)
  const roleKey = getCurrentRoleKey(currentUser)
  const visibleRequests = getVisibleRequests(data, currentUser).filter((request) => !isSeedRequest(request.id))
  const statusMode = roleKey === 'control' ? 'workflow' : 'procurement'

  const [filters, setFilters] = useState(initialShipmentFilters)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingSupplyRequestId, setEditingSupplyRequestId] = useState<string | null>(null)
  const [editingRampRequestId, setEditingRampRequestId] = useState<string | null>(null)
  const [editingSealRequestId, setEditingSealRequestId] = useState<string | null>(null)
  const [selectedRampId, setSelectedRampId] = useState('')
  const [cancelNote, setCancelNote] = useState('')
  const [supplyForm, setSupplyForm] = useState<SupplierSupplyForm>(EMPTY_SUPPLY_FORM)
  const [sealForm, setSealForm] = useState<SealForm>(EMPTY_SEAL_FORM)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const filteredRequests = applyShipmentFilters(visibleRequests, data, filters, statusMode)
  const selectedRequest = filteredRequests.find((request) => request.id === selectedId) ?? visibleRequests.find((request) => request.id === selectedId)

  async function handleCancel() {
    if (!selectedRequest) {
      return
    }

    if (hasTokens()) {
      try {
        const result = await shipmentApi.cancel(selectedRequest.id, { note: cancelNote })
        setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
        return
      } catch { /* fallback */ }
    }
    const result = cancelRequest(selectedRequest.id, cancelNote)
    setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
  }

  async function handleAdminVehicleCancel(shipmentRequestId: string) {
    if (hasTokens()) {
      try {
        const result = await shipmentApi.cancelVehicle(shipmentRequestId)
        setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
        return
      } catch { /* fallback */ }
    }
    const result = cancelVehicleRequest(shipmentRequestId)
    setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
  }

  async function handleAdminRequestCancel() {
    if (!selectedRequest) {
      return
    }

    const note = cancelNote || 'Talep vardiya amiri tarafindan iptal edildi.'
    if (hasTokens()) {
      try {
        const result = await shipmentApi.cancel(selectedRequest.id, { note })
        setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
        return
      } catch { /* fallback */ }
    }
    const result = cancelRequest(selectedRequest.id, note)
    setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
  }

  function handleStartSupplyEdit(shipmentRequestId: string) {
    const assignment = getShipmentDetail(data, shipmentRequestId)?.vehicleAssignment
    setSelectedId(shipmentRequestId)
    setEditingRampRequestId(null)
    setEditingSealRequestId(null)
    setSelectedRampId('')
    setSealForm(EMPTY_SEAL_FORM)
    setEditingSupplyRequestId(shipmentRequestId)
    setSupplyForm({
      tractorPlate: assignment?.tractorPlate ?? '',
      trailerPlate: assignment?.trailerPlate ?? '',
      driverFullName: assignment ? `${assignment.driverFirstName} ${assignment.driverLastName}`.trim() : '',
      driverPhone: assignment?.driverPhone ?? '',
    })
    setMessage(null)
  }

  function handleCancelSupplyEdit() {
    setEditingSupplyRequestId(null)
    setSupplyForm(EMPTY_SUPPLY_FORM)
  }

  async function handleAcceptCorrection(shipmentRequestId: string) {
    let ok = false
    if (hasTokens()) {
      try {
        const result = await shipmentApi.acceptCorrection(shipmentRequestId)
        setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
        ok = result.ok
      } catch { /* fallback */ }
    }
    if (!ok) {
      const result = acceptSecurityCorrection(shipmentRequestId)
      setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
      ok = result.ok
    }
    if (ok) {
      handleStartSupplyEdit(shipmentRequestId)
    }
  }

  async function handleCancelCorrection(shipmentRequestId: string) {
    if (hasTokens()) {
      try {
        const result = await shipmentApi.cancelVehicle(shipmentRequestId)
        setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
        return
      } catch { /* fallback */ }
    }
    const result = cancelVehicleRequest(shipmentRequestId)
    setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
  }

  function handleSupplyFieldChange<K extends keyof SupplierSupplyForm>(field: K, value: SupplierSupplyForm[K]) {
    setSupplyForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSupplySubmit(shipmentRequestId: string) {
    const driverName = splitDriverFullName(supplyForm.driverFullName)
    if (!driverName) {
      setMessage({ kind: 'error', text: 'Sofor ad soyad bilgisini tek alanda eksiksiz girin.' })
      return
    }

    const payload: VehicleAssignmentInput = {
      tractorPlate: supplyForm.tractorPlate,
      trailerPlate: supplyForm.trailerPlate,
      driverFirstName: driverName.firstName,
      driverLastName: driverName.lastName,
      driverPhone: supplyForm.driverPhone,
    }

    let ok = false
    if (hasTokens()) {
      try {
        const result = await shipmentApi.submitVehicleAssignment(shipmentRequestId, payload)
        setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
        ok = result.ok
      } catch { /* fallback */ }
    }
    if (!ok) {
      const result = submitVehicleAssignment(shipmentRequestId, payload)
      setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
      ok = result.ok
    }

    if (ok) {
      setEditingSupplyRequestId(null)
      setSupplyForm(EMPTY_SUPPLY_FORM)
    }
  }

  function handleStartRampEdit(shipmentRequestId: string) {
    const currentRampId = getShipmentDetail(data, shipmentRequestId)?.rampAssignment?.rampId ?? ''
    setSelectedId(shipmentRequestId)
    setEditingSupplyRequestId(null)
    setEditingSealRequestId(null)
    setSupplyForm(EMPTY_SUPPLY_FORM)
    setSealForm(EMPTY_SEAL_FORM)
    setEditingRampRequestId(shipmentRequestId)
    setSelectedRampId(currentRampId)
    setMessage(null)
  }

  function handleCancelRampEdit() {
    setEditingRampRequestId(null)
    setSelectedRampId('')
  }

  function handleStartSealEdit(shipmentRequestId: string) {
    const loadingOperation = getShipmentDetail(data, shipmentRequestId)?.loadingOperation
    setSelectedId(shipmentRequestId)
    setEditingSupplyRequestId(null)
    setEditingRampRequestId(null)
    setSupplyForm(EMPTY_SUPPLY_FORM)
    setSelectedRampId('')
    setEditingSealRequestId(shipmentRequestId)
    setSealForm({
      sealNumber: loadingOperation?.sealNumber ?? '',
      note: loadingOperation?.notes ?? '',
    })
    setMessage(null)
  }

  function handleCancelSealEdit() {
    setEditingSealRequestId(null)
    setSealForm(EMPTY_SEAL_FORM)
  }

  function handleSealFieldChange<K extends keyof SealForm>(field: K, value: SealForm[K]) {
    setSealForm((current) => ({ ...current, [field]: value }))
  }

  async function handleRampSubmit(shipmentRequestId: string) {
    if (!selectedRampId) {
      setMessage({ kind: 'error', text: 'Kaydetmeden once bir rampa secin.' })
      return
    }

    let ok = false
    if (hasTokens()) {
      try {
        const result = await shipmentApi.assignRamp(shipmentRequestId, { rampId: selectedRampId })
        setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
        ok = result.ok
      } catch { /* fallback */ }
    }
    if (!ok) {
      const result = assignRamp(shipmentRequestId, { rampId: selectedRampId, note: '' })
      setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
      ok = result.ok
    }

    if (ok) {
      setEditingRampRequestId(null)
      setSelectedRampId('')
    }
  }

  async function handleSealSubmit(shipmentRequestId: string) {
    let ok = false
    if (hasTokens()) {
      try {
        const result = await shipmentApi.finalize(shipmentRequestId, {
          sealNumber: sealForm.sealNumber,
          note: sealForm.note,
        })
        setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
        ok = result.ok
      } catch { /* fallback */ }
    }
    if (!ok) {
      const result = finalizeLoading(shipmentRequestId, {
        sealNumber: sealForm.sealNumber,
        note: sealForm.note,
      })
      setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
      ok = result.ok
    }

    if (ok) {
      setEditingSealRequestId(null)
      setSealForm(EMPTY_SEAL_FORM)
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Operasyon listesi"
        title="Talep ve sevkiyat listesi"
        description="Rolunuze gore ayni sevkiyat tablosu uzerinden tedarik, duzeltme ve rampa planlama aksiyonlarini yonetin."
      />

      {message && <InlineMessage kind={message.kind} message={message.text} />}

      <ShipmentFiltersBar
        data={data}
        filters={filters}
        onChange={setFilters}
        statusMode={statusMode}
        statusLabelOverrides={roleKey === 'control' ? OPERATIONS_STATUS_LABEL_OVERRIDES : undefined}
      />

      <Card
        title="Sevkiyat tablosu"
        subtitle={`${filteredRequests.length} kayit listeleniyor`}
        actions={
          selectedRequest && canCancelRequest(selectedRequest) ? (
            roleKey === 'requester' ? (
              <Button variant="danger" size="sm" onClick={handleCancel}>
                Iptal talebi baslat
              </Button>
            ) : (roleKey === 'admin' || roleKey === 'superadmin') ? (
              <Button variant="secondary" size="sm" onClick={handleAdminRequestCancel}>
                Talebi Iptal Et
              </Button>
            ) : undefined
          ) : undefined
        }
      >
        {selectedRequest && ['requester', 'admin', 'superadmin'].includes(roleKey ?? '') && canCancelRequest(selectedRequest) && (
          <div className="action-strip">
            <Textarea
              rows={2}
              placeholder="Iptal nedeni veya aciklama"
              value={cancelNote}
              onChange={(event) => setCancelNote(event.target.value)}
            />
          </div>
        )}

        {roleKey === 'supplier' ? (
          <SupplierInlineShipmentTable
            requests={filteredRequests}
            data={data}
            selectedId={selectedId}
            editingRequestId={editingSupplyRequestId}
            supplyForm={supplyForm}
            onSelect={setSelectedId}
            onStartEdit={handleStartSupplyEdit}
            onCancelEdit={handleCancelSupplyEdit}
            onAcceptCorrection={handleAcceptCorrection}
            onCancelCorrection={handleCancelCorrection}
            onSupplyFieldChange={handleSupplyFieldChange}
            onSubmit={handleSupplySubmit}
          />
        ) : roleKey === 'control' ? (
          <OperationsRampTable
            requests={filteredRequests}
            data={data}
            selectedId={selectedId}
            editingRequestId={editingRampRequestId}
            editingSealRequestId={editingSealRequestId}
            selectedRampId={selectedRampId}
            sealForm={sealForm}
            onSelect={setSelectedId}
            onStartEdit={handleStartRampEdit}
            onCancelEdit={handleCancelRampEdit}
            onRampChange={setSelectedRampId}
            onSubmit={handleRampSubmit}
            onStartSealEdit={handleStartSealEdit}
            onCancelSealEdit={handleCancelSealEdit}
            onSealFieldChange={handleSealFieldChange}
            onSealSubmit={handleSealSubmit}
          />
        ) : (
          <ShipmentTable
            requests={filteredRequests}
            data={data}
            selectedId={selectedId}
            onSelect={setSelectedId}
            statusMode={statusMode}
            showPhoneColumn
            showRequestDateColumn
            showOperationalTimeColumns={(roleKey === 'admin' || roleKey === 'superadmin')}
            renderRowActions={
              (roleKey === 'admin' || roleKey === 'superadmin')
                ? (request) =>
                    canCancelRequest(request) ? (
                      <Button variant="danger" size="sm" onClick={() => handleAdminVehicleCancel(request.id)}>
                        Araci Iptal Et
                      </Button>
                    ) : (
                      <span className="muted-text">-</span>
                    )
                : undefined
            }
          />
        )}
      </Card>

      {roleKey !== 'supplier' && roleKey !== 'control' && (
        <ShipmentDetailDrawer data={data} shipmentRequestId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  )
}

function SupplierInlineShipmentTable({
  requests,
  data,
  selectedId,
  editingRequestId,
  supplyForm,
  onSelect,
  onStartEdit,
  onCancelEdit,
  onAcceptCorrection,
  onCancelCorrection,
  onSupplyFieldChange,
  onSubmit,
}: {
  requests: ShipmentRequest[]
  data: DemoData
  selectedId: string | null
  editingRequestId: string | null
  supplyForm: SupplierSupplyForm
  onSelect: (shipmentRequestId: string) => void
  onStartEdit: (shipmentRequestId: string) => void
  onCancelEdit: () => void
  onAcceptCorrection: (shipmentRequestId: string) => void
  onCancelCorrection: (shipmentRequestId: string) => void
  onSupplyFieldChange: <K extends keyof SupplierSupplyForm>(field: K, value: SupplierSupplyForm[K]) => void
  onSubmit: (shipmentRequestId: string) => void
}) {
  if (requests.length === 0) {
    return <p className="muted-text">Secili filtrelere uyan talep bulunmuyor.</p>
  }

  return (
    <div className="table-shell">
      <table className="data-table">
        <thead>
          <tr>
            <th>Durum</th>
            <th>Talep No</th>
            <th>Lokasyon</th>
            <th>Talep Tarihi</th>
            <th>Arac Turu</th>
            <th>Yukleme Tarihi</th>
            <th>Saat</th>
            <th>Tedarikci</th>
            <th>Cekici</th>
            <th>Dorse</th>
            <th>Sofor</th>
            <th>Telefon</th>
            <th>Rampa</th>
            <th>Rampaya Alinma</th>
            <th>Yukleme Bitis</th>
            <th>Rampa Cikis</th>
            <th>Son islem</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => {
            const detail = getShipmentDetail(data, request.id)
            const assignment = detail?.vehicleAssignment
            const isEditing = editingRequestId === request.id
            const canEdit = canEditSupplierRequest(request.currentStatus)
            const statusMeta = getProcurementStatusMeta(request, assignment)
            const driverLabel = assignment ? `${assignment.driverFirstName} ${assignment.driverLastName}` : ''

            return (
              <tr
                key={request.id}
                className={
                  selectedId === request.id || isEditing
                    ? 'data-table__row data-table__row--static data-table__row--selected'
                    : 'data-table__row data-table__row--static'
                }
                onClick={() => onSelect(request.id)}
              >
                <td>
                  <div className="status-cell status-cell--stack">
                    <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                    {request.currentStatus === 'CORRECTION_REQUESTED' && assignment?.rejectionReason && (
                      <span className="table-note">{assignment.rejectionReason}</span>
                    )}
                  </div>
                </td>
                <td>{request.requestNo}</td>
                <td>{detail?.location?.name ?? '-'}</td>
                <td>{formatDateLabel(request.requestDate)}</td>
                <td>{formatVehicleTypeLabel(request.vehicleType)}</td>
                <td>{formatDateLabel(request.loadDate)}</td>
                <td>{request.loadTime}</td>
                <td>{detail?.supplierCompany?.name ?? '-'}</td>
                <td>
                  {isEditing ? (
                    <input
                      className="table-input"
                      value={supplyForm.tractorPlate}
                      onChange={(event) => onSupplyFieldChange('tractorPlate', event.target.value)}
                      placeholder="34 ABC 123"
                    />
                  ) : (
                    <EditableCellButton
                      value={assignment?.tractorPlate ?? ''}
                      placeholder="34 ABC 123"
                      canEdit={canEdit}
                      onClick={() => onStartEdit(request.id)}
                    />
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <input
                      className="table-input"
                      value={supplyForm.trailerPlate}
                      onChange={(event) => onSupplyFieldChange('trailerPlate', event.target.value)}
                      placeholder="34 AB 1234"
                    />
                  ) : (
                    <EditableCellButton
                      value={assignment?.trailerPlate ?? ''}
                      placeholder="34 AB 1234"
                      canEdit={canEdit}
                      onClick={() => onStartEdit(request.id)}
                    />
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <input
                      className="table-input"
                      value={supplyForm.driverFullName}
                      onChange={(event) => onSupplyFieldChange('driverFullName', event.target.value)}
                      placeholder="Sofor Ad Soyad"
                    />
                  ) : (
                    <EditableCellButton
                      value={driverLabel}
                      placeholder="Sofor Ad Soyad"
                      canEdit={canEdit}
                      onClick={() => onStartEdit(request.id)}
                    />
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <input
                      className="table-input"
                      value={supplyForm.driverPhone}
                      onChange={(event) => onSupplyFieldChange('driverPhone', event.target.value)}
                      placeholder="+905321234567"
                    />
                  ) : (
                    <EditableCellButton
                      value={assignment?.driverPhone ? formatPhoneLabel(assignment.driverPhone) : ''}
                      placeholder="+90 5xx xxx xx xx"
                      canEdit={canEdit}
                      onClick={() => onStartEdit(request.id)}
                    />
                  )}
                </td>
                <td>{detail?.ramp?.code ?? '-'}</td>
                <td>{formatDateTimeLabel(getRampTakenAt(detail))}</td>
                <td>{formatDateTimeLabel(getLoadingCompletedAt(detail))}</td>
                <td>{formatDateTimeLabel(getExitAt(detail))}</td>
                <td className="table-cell-actions">
                  {isEditing ? (
                    <div className="table-action-group">
                      <Button variant="secondary" size="sm" onClick={onCancelEdit}>
                        Vazgec
                      </Button>
                      <Button variant="success" size="sm" onClick={() => onSubmit(request.id)}>
                        Gonder
                      </Button>
                    </div>
                  ) : request.currentStatus === 'CORRECTION_REQUESTED' ? (
                    <div className="table-action-group">
                      <Button variant="secondary" size="sm" onClick={() => onAcceptCorrection(request.id)}>
                        Kabul Et
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => onCancelCorrection(request.id)}>
                        Iptal Et
                      </Button>
                    </div>
                  ) : (
                    formatDateTimeLabel(request.updatedAt)
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function OperationsRampTable({
  requests,
  data,
  selectedId,
  editingRequestId,
  editingSealRequestId,
  selectedRampId,
  sealForm,
  onSelect,
  onStartEdit,
  onCancelEdit,
  onRampChange,
  onSubmit,
  onStartSealEdit,
  onCancelSealEdit,
  onSealFieldChange,
  onSealSubmit,
}: {
  requests: ShipmentRequest[]
  data: DemoData
  selectedId: string | null
  editingRequestId: string | null
  editingSealRequestId: string | null
  selectedRampId: string
  sealForm: SealForm
  onSelect: (shipmentRequestId: string) => void
  onStartEdit: (shipmentRequestId: string) => void
  onCancelEdit: () => void
  onRampChange: (rampId: string) => void
  onSubmit: (shipmentRequestId: string) => void
  onStartSealEdit: (shipmentRequestId: string) => void
  onCancelSealEdit: () => void
  onSealFieldChange: <K extends keyof SealForm>(field: K, value: SealForm[K]) => void
  onSealSubmit: (shipmentRequestId: string) => void
}) {
  if (requests.length === 0) {
    return <p className="muted-text">Secili filtrelere uyan sevkiyat bulunmuyor.</p>
  }

  return (
    <div className="table-shell">
      <table className="data-table">
        <thead>
          <tr>
            <th>Durum</th>
            <th>Talep No</th>
            <th>Lokasyon</th>
            <th>Talep Tarihi</th>
            <th>Yukleme Tarihi</th>
            <th>Saat</th>
            <th>Tedarikci</th>
            <th>Cekici</th>
            <th>Dorse</th>
            <th>Sofor</th>
            <th>Telefon</th>
            <th>Rampa</th>
            <th>Rampaya Alinma</th>
            <th>Yukleme Bitis</th>
            <th>Rampa Cikis</th>
            <th>Son islem</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => {
            const detail = getShipmentDetail(data, request.id)
            const assignment = detail?.vehicleAssignment
            const statusMeta =
              request.currentStatus === 'RAMP_PLANNED'
                ? {
                    ...getStatusMeta(request.currentStatus),
                    label: 'Arac Rampada',
                  }
                : getStatusMeta(request.currentStatus)
            const isEditing = editingRequestId === request.id
            const isEditingSeal = editingSealRequestId === request.id
            const canAssign = canAssignRamp(request.currentStatus)
            const canFinalize = canFinalizeLoading(request.currentStatus)
            const rampLabel = detail?.ramp?.name ?? detail?.ramp?.code ?? ''

            return (
              <tr
                key={request.id}
                className={
                  selectedId === request.id || isEditing
                    ? 'data-table__row data-table__row--static data-table__row--selected'
                    : 'data-table__row data-table__row--static'
                }
                onClick={() => onSelect(request.id)}
              >
                <td>
                  <div className="status-cell">
                    <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                  </div>
                </td>
                <td>{request.requestNo}</td>
                <td>{detail?.location?.name ?? '-'}</td>
                <td>{formatDateLabel(request.requestDate)}</td>
                <td>{formatDateLabel(request.loadDate)}</td>
                <td>{request.loadTime}</td>
                <td>{detail?.supplierCompany?.name ?? '-'}</td>
                <td>{assignment?.tractorPlate ?? '-'}</td>
                <td>{assignment?.trailerPlate ?? '-'}</td>
                <td>{assignment ? `${assignment.driverFirstName} ${assignment.driverLastName}` : '-'}</td>
                <td>{formatPhoneLabel(assignment?.driverPhone)}</td>
                <td>
                  {isEditing ? (
                    <select className="table-input" value={selectedRampId} onChange={(event) => onRampChange(event.target.value)}>
                      <option value="">Rampa secin</option>
                      {RAMP_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : canAssign ? (
                    <EditableCellButton value={rampLabel} placeholder="Rampa sec" canEdit onClick={() => onStartEdit(request.id)} />
                  ) : (
                    detail?.ramp?.code ?? '-'
                  )}
                </td>
                <td>{formatDateTimeLabel(getRampTakenAt(detail))}</td>
                <td>{formatDateTimeLabel(getLoadingCompletedAt(detail))}</td>
                <td>{formatDateTimeLabel(getExitAt(detail))}</td>
                <td className="table-cell-actions">
                  {isEditing ? (
                    <div className="table-action-group">
                      <Button variant="secondary" size="sm" onClick={onCancelEdit}>
                        Vazgec
                      </Button>
                      <Button variant="success" size="sm" onClick={() => onSubmit(request.id)}>
                        Kaydet
                      </Button>
                    </div>
                  ) : isEditingSeal ? (
                    <div className="security-action-cell">
                      <input
                        className="table-input"
                        value={sealForm.sealNumber}
                        onChange={(event) => onSealFieldChange('sealNumber', event.target.value)}
                        placeholder="Muhur numarasi"
                      />
                      <input
                        className="table-input"
                        value={sealForm.note}
                        onChange={(event) => onSealFieldChange('note', event.target.value)}
                        placeholder="Yukleme notu"
                      />
                      <div className="table-action-group security-action-buttons">
                        <Button variant="secondary" size="sm" onClick={onCancelSealEdit}>
                          Vazgec
                        </Button>
                        <Button variant="success" size="sm" onClick={() => onSealSubmit(request.id)}>
                          Muhur Kaydet
                        </Button>
                      </div>
                    </div>
                  ) : canFinalize ? (
                    <Button variant="success" size="sm" onClick={() => onStartSealEdit(request.id)}>
                      Muhur Gir
                    </Button>
                  ) : (
                    formatDateTimeLabel(request.updatedAt)
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function EditableCellButton({
  value,
  placeholder,
  canEdit,
  onClick,
}: {
  value: string
  placeholder: string
  canEdit: boolean
  onClick: () => void
}) {
  const label = value.trim() || placeholder
  const className = value.trim() ? 'table-input table-input--trigger' : 'table-input table-input--trigger table-input--placeholder'

  if (!canEdit) {
    return <div className={className}>{label}</div>
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {label}
    </button>
  )
}

function canEditSupplierRequest(status: ShipmentStatus) {
  return ['SENT_TO_SUPPLIER', 'SUPPLIER_REVIEWING', 'CORRECTION_REQUESTED'].includes(status)
}

function canAssignRamp(status: ShipmentStatus) {
  return ['APPROVED', 'RAMP_PLANNED'].includes(status)
}

function canFinalizeLoading(status: ShipmentStatus) {
  return ['RAMP_PLANNED', 'LOADING'].includes(status)
}

function isSeedRequest(requestId: string) {
  return /^req-\d{3}$/.test(requestId)
}

function splitDriverFullName(value: string) {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length < 2) {
    return null
  }

  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts[parts.length - 1],
  }
}
