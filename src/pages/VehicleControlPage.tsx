import { useState } from 'react'

import { Card, FormField, InlineMessage, PageHeader, Textarea, Button, KeyValue } from '../components/ui'
import { getCurrentUser, getShipmentDetail, getVisibleRequests } from '../domain/selectors'
import { formatPhoneLabel, getStatusMeta } from '../domain/workflow'
import { useAppStore } from '../store/app-store'
import { hasTokens, shipmentApi } from '../services/api'

export function VehicleControlPage() {
  const data = useAppStore((state) => state.data)
  const session = useAppStore((state) => state.session)
  const reviewVehicleAssignment = useAppStore((state) => state.reviewVehicleAssignment)
  const currentUser = getCurrentUser(data, session.currentUserId)
  const queue = getVisibleRequests(data, currentUser).filter((request) => ['VEHICLE_ASSIGNED', 'IN_CONTROL'].includes(request.currentStatus))
  const [selectedId, setSelectedId] = useState<string | null>(queue[0]?.id ?? null)
  const [note, setNote] = useState('')
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const detail = selectedId ? getShipmentDetail(data, selectedId) : undefined

  async function handleDecision(decision: 'approve' | 'reject') {
    if (!selectedId) {
      return
    }

    if (hasTokens()) {
      try {
        const result = await shipmentApi.review(selectedId, { decision, note })
        setFeedback({ kind: result.ok ? 'success' : 'error', text: result.message })
        return
      } catch { /* fallback */ }
    }
    const result = reviewVehicleAssignment(selectedId, { decision, note })
    setFeedback({ kind: result.ok ? 'success' : 'error', text: result.message })
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Kullanici akisi 3/5"
        title="Arac dogrulama ve kontrol"
        description="Kontrol yetkilisi, tedarikcinin girdigi arac ve sofor bilgisini karsilastirmali gorunumde inceler; her karar not ile kayda gecer."
      />

      {feedback && <InlineMessage kind={feedback.kind} message={feedback.text} />}

      <div className="split-layout">
        <Card title="Kontrol kuyrugu" subtitle={`${queue.length} kayit`}>
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
                  <p>{request.productInfo}</p>
                </div>
                <span className={`chip chip--${getStatusMeta(request.currentStatus).tone}`}>{getStatusMeta(request.currentStatus).label}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card title="Karsilastirma paneli" subtitle="Beklenen veri ile girilen kayit yan yana durur.">
          {!detail ? (
            <p className="muted-text">Kontrol icin soldan bir kayit secin.</p>
          ) : (
            <>
              <div className="comparison-grid">
                <Card title="Talep tarafindaki baglam">
                  <div className="detail-grid">
                    <KeyValue label="Talep No" value={detail.request.requestNo} />
                    <KeyValue label="Lokasyon" value={detail.location?.name ?? '-'} />
                    <KeyValue label="Yuk" value={detail.request.productInfo} />
                    <KeyValue label="Miktar" value={detail.request.quantityInfo} />
                    <KeyValue label="Plan saat" value={`${detail.request.loadDate} ${detail.request.loadTime}`} />
                  </div>
                </Card>

                <Card title="Tedarikci girdisi">
                  <div className="detail-grid">
                    <KeyValue label="Cekici plakasi" value={detail.vehicleAssignment?.tractorPlate ?? '-'} />
                    <KeyValue label="Dorse plakasi" value={detail.vehicleAssignment?.trailerPlate ?? '-'} />
                    <KeyValue label="Sofor" value={detail.vehicleAssignment ? `${detail.vehicleAssignment.driverFirstName} ${detail.vehicleAssignment.driverLastName}` : '-'} />
                    <KeyValue label="Telefon" value={formatPhoneLabel(detail.vehicleAssignment?.driverPhone)} />
                    <KeyValue label="Tedarikci firma" value={detail.supplierCompany?.name ?? '-'} />
                  </div>
                </Card>
              </div>

              <FormField label="Karar notu" hint="Red karari verilecekse neden zorunlu olacak sekilde not dusun.">
                <Textarea rows={4} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Bilgi eslesti, rampa planlamaya aktarilabilir." />
              </FormField>

              <div className="form-actions form-actions--between">
                <Button variant="danger" size="lg" onClick={() => handleDecision('reject')}>
                  Reddet
                </Button>
                <Button variant="success" size="lg" onClick={() => handleDecision('approve')}>
                  Onayla
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
