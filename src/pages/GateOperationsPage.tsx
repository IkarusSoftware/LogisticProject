import { useState } from 'react'

import { Button, Card, InlineMessage, Input, PageHeader } from '../components/ui'
import { getCurrentUser, getShipmentDetail, getVisibleRequests } from '../domain/selectors'
import { formatDateTimeLabel, getStatusMeta, isDelayed } from '../domain/workflow'
import { useAppStore } from '../store/app-store'

export function GateOperationsPage() {
  const data = useAppStore((state) => state.data)
  const session = useAppStore((state) => state.session)
  const recordGateAction = useAppStore((state) => state.recordGateAction)
  const currentUser = getCurrentUser(data, session.currentUserId)
  const baseQueue = getVisibleRequests(data, currentUser).filter((request) =>
    ['RAMP_PLANNED', 'ARRIVED', 'ADMITTED', 'AT_RAMP'].includes(request.currentStatus),
  )
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(baseQueue[0]?.id ?? null)
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const queue = baseQueue.filter((request) => {
    const detail = getShipmentDetail(data, request.id)
    const haystack = [request.requestNo, detail?.vehicleAssignment?.tractorPlate, detail?.vehicleAssignment?.trailerPlate].join(' ').toLowerCase()
    return haystack.includes(search.toLowerCase())
  })
  const detail = selectedId ? getShipmentDetail(data, selectedId) : undefined

  function handleAction(action: Parameters<typeof recordGateAction>[1]) {
    if (!selectedId) {
      return
    }

    const result = recordGateAction(selectedId, action, '')
    setFeedback({ kind: result.ok ? 'success' : 'error', text: result.message })
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Kullanici akisi 4/5"
        title="Kapi ve saha operasyonu"
        description="Bugun beklenen araclar listelenir; plaka ile arama yapilir ve geldi / giris yapti / rampaya alindi aksiyonlari buyuk butonlarla yonetilir."
      />

      {feedback && <InlineMessage kind={feedback.kind} message={feedback.text} />}

      <Card title="Bugun beklenen araclar" subtitle="Hizli arama ve tek tik aksiyon">
        <div className="action-strip">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Plaka ile hizli ara" />
        </div>

        <div className="split-layout">
          <div className="selection-list">
            {queue.map((request) => {
              const requestDetail = getShipmentDetail(data, request.id)
              return (
                <button
                  key={request.id}
                  type="button"
                  className={selectedId === request.id ? 'selection-list__item selection-list__item--active' : 'selection-list__item'}
                  onClick={() => setSelectedId(request.id)}
                >
                  <div>
                    <strong>{requestDetail?.vehicleAssignment?.tractorPlate ?? request.requestNo}</strong>
                    <p>{request.requestNo} • {request.loadTime}</p>
                  </div>
                  <div className="selection-list__right">
                    <span className={`chip chip--${getStatusMeta(request.currentStatus).tone}`}>{getStatusMeta(request.currentStatus).label}</span>
                    {isDelayed(request) && <span className="chip chip--danger">Gecikiyor</span>}
                  </div>
                </button>
              )
            })}
          </div>

          <Card title="Hizli saha aksiyonlari">
            {!detail ? (
              <p className="muted-text">Islem icin bir arac secin.</p>
            ) : (
              <div className="gate-panel">
                <div className="request-summary request-summary--card">
                  <div>
                    <strong>{detail.vehicleAssignment?.tractorPlate ?? detail.request.requestNo}</strong>
                    <p>{detail.vehicleAssignment ? `${detail.vehicleAssignment.driverFirstName} ${detail.vehicleAssignment.driverLastName}` : detail.request.productInfo}</p>
                  </div>
                  <div>
                    <strong>{detail.ramp?.code ?? 'Rampa bekliyor'}</strong>
                    <p>{detail.location?.name}</p>
                  </div>
                </div>

                <div className="detail-grid">
                  <div className="key-value">
                    <span className="key-value__label">Tesise geldi</span>
                    <span className="key-value__value">{formatDateTimeLabel(detail.gateOperation?.arrivedAt)}</span>
                  </div>
                  <div className="key-value">
                    <span className="key-value__label">Saha girisi</span>
                    <span className="key-value__value">{formatDateTimeLabel(detail.gateOperation?.admittedAt)}</span>
                  </div>
                  <div className="key-value">
                    <span className="key-value__label">Rampaya alindi</span>
                    <span className="key-value__value">{formatDateTimeLabel(detail.gateOperation?.rampTakenAt)}</span>
                  </div>
                </div>

                <div className="quick-actions">
                  <Button fill size="lg" onClick={() => handleAction('arrive')}>
                    Arac Geldi
                  </Button>
                  <Button fill size="lg" variant="secondary" onClick={() => handleAction('admit')}>
                    Sahaya Giris Yapti
                  </Button>
                  <Button fill size="lg" variant="secondary" onClick={() => handleAction('takeToRamp')}>
                    Rampaya Alindi
                  </Button>
                  <Button fill size="lg" variant="success" onClick={() => handleAction('startLoading')}>
                    Yuklemeyi Baslat
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </Card>
    </div>
  )
}
