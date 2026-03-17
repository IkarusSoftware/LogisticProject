import { useMemo, useState } from 'react'

import { getProcurementStatusMeta } from '../components/shipments'
import { Badge, Button, Card, InlineMessage, Input, PageHeader } from '../components/ui'
import { getCurrentUser, getShipmentDetail, getVisibleRequests } from '../domain/selectors'
import { formatDateLabel, formatDateTimeLabel, formatPhoneLabel } from '../domain/workflow'
import { useAppStore } from '../store/app-store'
import { hasTokens, shipmentApi } from '../services/api'

const SECURITY_QUEUE_STATUSES = ['VEHICLE_ASSIGNED', 'CORRECTION_REQUESTED', 'APPROVED', 'RAMP_PLANNED'] as const

export function GateOperationsPage() {
  const data = useAppStore((state) => state.data)
  const session = useAppStore((state) => state.session)
  const requestSecurityCorrection = useAppStore((state) => state.requestSecurityCorrection)
  const registerVehicleRecord = useAppStore((state) => state.registerVehicleRecord)
  const currentUser = getCurrentUser(data, session.currentUserId)

  const [search, setSearch] = useState('')
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const queue = useMemo(() => {
    return getVisibleRequests(data, currentUser)
      .filter((request) => SECURITY_QUEUE_STATUSES.includes(request.currentStatus as (typeof SECURITY_QUEUE_STATUSES)[number]))
      .filter((request) => {
        if (!search.trim()) {
          return true
        }

        const detail = getShipmentDetail(data, request.id)
        const haystack = [
          request.requestNo,
          detail?.supplierCompany?.name,
          detail?.location?.name,
          detail?.vehicleAssignment?.tractorPlate,
          detail?.vehicleAssignment?.trailerPlate,
          detail?.vehicleAssignment ? `${detail.vehicleAssignment.driverFirstName} ${detail.vehicleAssignment.driverLastName}` : '',
        ]
          .join(' ')
          .toLowerCase()

        return haystack.includes(search.trim().toLowerCase())
      })
  }, [currentUser, data, search])

  function updateActionNote(shipmentRequestId: string, value: string) {
    setActionNotes((current) => ({ ...current, [shipmentRequestId]: value }))
  }

  async function handleRequestCorrection(shipmentRequestId: string) {
    const note = actionNotes[shipmentRequestId]?.trim()
    if (!note) {
      setFeedback({ kind: 'error', text: 'Duzeltme istegi gondermek icin ilgili satira not girin.' })
      return
    }

    if (hasTokens()) {
      try {
        const result = await shipmentApi.requestCorrection(shipmentRequestId, note)
        setFeedback({ kind: result.ok ? 'success' : 'error', text: result.message })
        if (result.ok) setActionNotes((current) => ({ ...current, [shipmentRequestId]: '' }))
        return
      } catch { /* fallback */ }
    }
    const result = requestSecurityCorrection(shipmentRequestId, note)
    setFeedback({ kind: result.ok ? 'success' : 'error', text: result.message })
    if (result.ok) {
      setActionNotes((current) => ({ ...current, [shipmentRequestId]: '' }))
    }
  }

  async function handleRegisterVehicle(shipmentRequestId: string) {
    const note = actionNotes[shipmentRequestId] ?? ''
    if (hasTokens()) {
      try {
        const result = await shipmentApi.registerVehicle(shipmentRequestId, note || undefined)
        setFeedback({ kind: result.ok ? 'success' : 'error', text: result.message })
        if (result.ok) setActionNotes((current) => ({ ...current, [shipmentRequestId]: '' }))
        return
      } catch { /* fallback */ }
    }
    const result = registerVehicleRecord(shipmentRequestId, note)
    setFeedback({ kind: result.ok ? 'success' : 'error', text: result.message })
    if (result.ok) {
      setActionNotes((current) => ({ ...current, [shipmentRequestId]: '' }))
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Dis guvenlik"
        title="Arac kontrol ekrani"
        description="Tedarik edilen araclari ortak sevkiyat tablosunda gorun, fiziksel kontrolu tablo uzerinden tamamlayin."
      />

      {feedback && <InlineMessage kind={feedback.kind} message={feedback.text} />}

      <Card title="Sevkiyat tablosu" subtitle={`${queue.length} kayit listeleniyor`}>
        <div className="action-strip">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Talep no, tedarikci veya plaka ile ara" />
        </div>

        {queue.length === 0 ? (
          <p className="muted-text">Dis guvenlik kontrolu bekleyen arac bulunmuyor.</p>
        ) : (
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
                  <th>Son islem</th>
                  <th>Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((request) => {
                  const detail = getShipmentDetail(data, request.id)
                  const assignment = detail?.vehicleAssignment
                  const statusMeta = getProcurementStatusMeta(request, assignment)
                  const canTakeAction = ['VEHICLE_ASSIGNED', 'CORRECTION_REQUESTED'].includes(request.currentStatus)
                  const noteValue = actionNotes[request.id] ?? ''

                  return (
                    <tr key={request.id} className="data-table__row data-table__row--static">
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
                      <td>{formatDateLabel(request.loadDate)}</td>
                      <td>{request.loadTime}</td>
                      <td>{detail?.supplierCompany?.name ?? '-'}</td>
                      <td>{assignment?.tractorPlate ?? '-'}</td>
                      <td>{assignment?.trailerPlate ?? '-'}</td>
                      <td>{assignment ? `${assignment.driverFirstName} ${assignment.driverLastName}` : '-'}</td>
                      <td>{formatPhoneLabel(assignment?.driverPhone)}</td>
                      <td>{detail?.ramp?.code ?? '-'}</td>
                      <td>{formatDateTimeLabel(request.updatedAt)}</td>
                      <td className="table-cell-actions">
                        {canTakeAction ? (
                          <div className="security-action-cell">
                            <input
                              className="table-input"
                              value={noteValue}
                              onChange={(event) => updateActionNote(request.id, event.target.value)}
                              placeholder="Duzeltme notu"
                            />
                            <div className="table-action-group security-action-buttons">
                              <Button variant="secondary" size="sm" onClick={() => handleRequestCorrection(request.id)}>
                                Duzeltme iste
                              </Button>
                              <Button variant="success" size="sm" onClick={() => handleRegisterVehicle(request.id)}>
                                Arac kaydi yapildi
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <span className="muted-text">{request.currentStatus === 'RAMP_PLANNED' ? 'Rampaya cagrildi' : 'Kayit tamamlandi'}</span>
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
