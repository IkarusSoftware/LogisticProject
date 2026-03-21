import { useState } from 'react'

import { Card, FormField, InlineMessage, PageHeader, Select, Textarea, Button } from '../components/ui'
import { getCurrentUser, getRampOccupancy, getShipmentDetail, getVisibleRequests } from '../domain/selectors'
import { getStatusMeta } from '../domain/workflow'
import { useAppStore } from '../store/app-store'
import { hasTokens, shipmentApi } from '../services/api'

export function RampPlanningPage() {
  const data = useAppStore((state) => state.data)
  const session = useAppStore((state) => state.session)
  const assignRamp = useAppStore((state) => state.assignRamp)
  const currentUser = getCurrentUser(data, session.currentUserId)
  const queue = getVisibleRequests(data, currentUser).filter((request) => request.currentStatus === 'APPROVED')
  const occupancy = getRampOccupancy(data)

  const [selectedId, setSelectedId] = useState<string | null>(queue[0]?.id ?? null)
  const [rampId, setRampId] = useState('ramp-ist-01')
  const [note, setNote] = useState('Saat cakismasi kontrol edildi, atama uygundur.')
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const detail = selectedId ? getShipmentDetail(data, selectedId) : undefined

  async function handleAssign() {
    if (!selectedId) {
      return
    }

    if (hasTokens()) {
      try {
        const result = await shipmentApi.assignRamp(selectedId, { rampId, note })
        setFeedback({ kind: result.ok ? 'success' : 'error', text: result.message })
        return
      } catch { /* fallback */ }
    }
    const result = assignRamp(selectedId, { rampId, note })
    setFeedback({ kind: result.ok ? 'success' : 'error', text: result.message })
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Kullanici akisi 4/5"
        title="Rampa planlama"
        description="Onaylanan araclar listelenir; ayni saat araliginda ayni rampaya cift atama engellenir. Kullanici satir secip rampa atar."
      />

      {feedback && <InlineMessage kind={feedback.kind} message={feedback.text} />}

      <div className="dashboard-grid">
        <Card title="Onayli araclar" subtitle={`${queue.length} planlama bekliyor`}>
          <div className="selection-list">
            {queue.map((request) => (
              <button
                key={request.id}
                type="button"
                className={selectedId === request.id ? 'selection-list__item selection-list__item--active' : 'selection-list__item'}
                onClick={() => setSelectedId(request.id)}
              >
                <div>
                  <strong>{request.requestNo}</strong>
                  <p>{request.loadDate} • {request.loadTime}</p>
                </div>
                <span className={`chip chip--${getStatusMeta(request.currentStatus).tone}`}>{getStatusMeta(request.currentStatus).label}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card title="Rampa doluluk durumu" subtitle="Rampa kartlari aktif isleri gosterir.">
          <div className="ramp-board">
            {occupancy.map((item) => (
              <div key={item.ramp.id} className={item.shipment ? 'ramp-tile ramp-tile--busy' : 'ramp-tile'}>
                <strong>{item.ramp.code}</strong>
                <p>{item.ramp.name}</p>
                <span>{item.shipment ? item.shipment.requestNo : 'Uygun'}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Rampa atama formu" subtitle="Basit ve kontrollu planlama.">
        {!detail ? (
          <p className="muted-text">Atama icin bir kayit secin.</p>
        ) : (
          <div className="form-grid">
            <div className="request-summary request-summary--card">
              <div>
                <strong>{detail.request.requestNo}</strong>
                <p>{detail.location?.name}</p>
              </div>
              <div>
                <strong>{detail.vehicleAssignment?.tractorPlate ?? 'Plaka bekliyor'}</strong>
                <p>{detail.request.loadDate} {detail.request.loadTime}</p>
              </div>
            </div>

            <FormField label="Rampa secimi">
              <Select value={rampId} onChange={(event) => setRampId(event.target.value)}>
                {data.ramps
                  .filter((ramp) => ramp.locationId === detail.request.targetLocationId && ramp.isActive)
                  .map((ramp) => (
                    <option key={ramp.id} value={ramp.id}>
                      {ramp.code} • {ramp.name}
                    </option>
                  ))}
              </Select>
            </FormField>

            <FormField label="Planlama notu">
              <Textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Saat uygun, sahaya bilgi verildi." />
            </FormField>

            <div className="form-actions">
              <Button size="lg" onClick={handleAssign}>
                Rampa Ata
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
