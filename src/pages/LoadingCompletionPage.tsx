import { useState } from 'react'

import { Badge, Button, Card, FormField, InlineMessage, Input, PageHeader, Textarea } from '../components/ui'
import { getCurrentUser, getShipmentDetail, getVisibleRequests } from '../domain/selectors'
import { formatDateTimeLabel } from '../domain/workflow'
import { useAppStore } from '../store/app-store'
import { hasTokens, shipmentApi } from '../services/api'

export function LoadingCompletionPage() {
  const data = useAppStore((state) => state.data)
  const session = useAppStore((state) => state.session)
  const finalizeLoading = useAppStore((state) => state.finalizeLoading)
  const currentUser = getCurrentUser(data, session.currentUserId)
  const queue = getVisibleRequests(data, currentUser).filter((request) => request.currentStatus === 'LOADING')
  const [selectedId, setSelectedId] = useState<string | null>(queue[0]?.id ?? null)
  const [sealNumber, setSealNumber] = useState('')
  const [note, setNote] = useState('')
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const detail = selectedId ? getShipmentDetail(data, selectedId) : undefined
  const loadingOp = detail?.loadingOperation
  const isRejected = !!loadingOp?.sealRejected

  function handleSelectRequest(id: string) {
    setSelectedId(id)
    setFeedback(null)
    const op = data.loadingOperations.find((item) => item.shipmentRequestId === id)
    setSealNumber(op?.sealNumber ?? '')
    setNote('')
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedId) return

    if (hasTokens()) {
      try {
        const result = await shipmentApi.finalize(selectedId, { sealNumber, note })
        setFeedback({ kind: result.ok ? 'success' : 'error', text: result.message })
        return
      } catch { /* fallback */ }
    }
    const result = finalizeLoading(selectedId, { sealNumber, note })
    setFeedback({ kind: result.ok ? 'success' : 'error', text: result.message })
    if (result.ok) {
      setSelectedId(null)
      setSealNumber('')
      setNote('')
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Kullanici akisi 5/5"
        title="Yukleme tamamlama"
        description="Yukleniyor durumundaki araclar listelenir. Muhur numarasi girilip kaydedildikten sonra guvenlik onayina gonderilir."
      />

      {feedback && <InlineMessage kind={feedback.kind} message={feedback.text} />}

      <div className="split-layout">
        <Card title="Yukleme bekleyen araclar" subtitle={`${queue.length} aktif is`}>
          <div className="selection-list">
            {queue.length === 0 && <p className="muted-text">Yukleme bekleyen arac yok.</p>}
            {queue.map((request) => {
              const requestDetail = getShipmentDetail(data, request.id)
              const op = data.loadingOperations.find((item) => item.shipmentRequestId === request.id)
              return (
                <button
                  key={request.id}
                  type="button"
                  className={selectedId === request.id ? 'selection-list__item selection-list__item--active' : 'selection-list__item'}
                  onClick={() => handleSelectRequest(request.id)}
                >
                  <div>
                    <strong>{requestDetail?.vehicleAssignment?.tractorPlate ?? request.requestNo}</strong>
                    <p>{request.requestNo}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span>{requestDetail?.ramp?.code ?? '-'}</span>
                    {op?.sealRejected && <Badge tone="danger">Red</Badge>}
                  </div>
                </button>
              )
            })}
          </div>
        </Card>

        <Card title="Muhur islemi" subtitle="Muhur numarasi girip kaydedin. Guvenlik onaylayana kadar surec bekler.">
          {!detail ? (
            <p className="muted-text">Islem icin soldan bir arac secin.</p>
          ) : (
            <>
              <div className="request-summary request-summary--card">
                <div>
                  <strong>{detail.request.requestNo}</strong>
                  <p>{detail.vehicleAssignment?.tractorPlate}</p>
                </div>
                <div>
                  <strong>{detail.ramp?.code ?? '-'}</strong>
                  <p>Yukleme baslangici: {formatDateTimeLabel(loadingOp?.startedAt)}</p>
                </div>
              </div>

              {isRejected && (
                <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'var(--color-danger-subtle, #fef2f2)', border: '1px solid var(--color-danger-border, #fecaca)', borderRadius: 8 }}>
                  <strong style={{ color: 'var(--color-danger, #dc2626)', fontSize: '0.875rem' }}>Guvenlik tarafından reddedildi</strong>
                  <p style={{ fontSize: '0.875rem', marginTop: 4, color: 'var(--color-text-secondary)' }}>{loadingOp?.sealRejectionNote}</p>
                </div>
              )}

              <form className="form-grid" onSubmit={handleSubmit}>
                <FormField label="Muhur numarasi" hint="Muhur olmadan surec guvenlige gonderilemez.">
                  <Input
                    value={sealNumber}
                    onChange={(event) => setSealNumber(event.target.value)}
                    placeholder="Ornek: SL-900001"
                  />
                </FormField>

                <FormField label="Not (opsiyonel)">
                  <Textarea
                    rows={3}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Muhur takılıp kontrol edildi..."
                  />
                </FormField>

                <div className="form-actions">
                  <Button type="submit" size="lg" variant="success">
                    {isRejected ? 'Muhuru Düzenle ve Tekrar Gönder' : 'Muhur Kaydet ve Guvenlige Gönder'}
                  </Button>
                </div>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
