import { useState } from 'react'

import { Button, Card, FormField, InlineMessage, Input, PageHeader, Textarea } from '../components/ui'
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
  const [sealNumber, setSealNumber] = useState('SL-900001')
  const [note, setNote] = useState('Muhur takildi, cikis kontrolu tamamlandi.')
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const detail = selectedId ? getShipmentDetail(data, selectedId) : undefined

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedId) {
      return
    }

    if (hasTokens()) {
      try {
        const result = await shipmentApi.finalize(selectedId, { sealNumber, note })
        setFeedback({ kind: result.ok ? 'success' : 'error', text: result.message })
        return
      } catch { /* fallback */ }
    }
    const result = finalizeLoading(selectedId, { sealNumber, note })
    setFeedback({ kind: result.ok ? 'success' : 'error', text: result.message })
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Kullanici akisi 5/5"
        title="Yukleme tamamlama"
        description="Yukleniyor durumundaki araclar listelenir. Muhur numarasi zorunlu tutulur; kayit tamamlandiginda arac aktif listeden duser ve gecmise tasinir."
      />

      {feedback && <InlineMessage kind={feedback.kind} message={feedback.text} />}

      <div className="split-layout">
        <Card title="Yukleme bekleyen araclar" subtitle={`${queue.length} aktif is`}>
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
                    <p>{request.requestNo}</p>
                  </div>
                  <span>{requestDetail?.ramp?.code ?? '-'}</span>
                </button>
              )
            })}
          </div>
        </Card>

        <Card title="Muhur ve cikis islemi" subtitle="Bu aksiyon zincir halinde yuklendi > muhurlendi > cikis yapti > tamamlandi gecisini kaydeder.">
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
                  <p>Yukleme baslangici: {formatDateTimeLabel(detail.loadingOperation?.startedAt)}</p>
                </div>
              </div>

              <form className="form-grid" onSubmit={handleSubmit}>
                <FormField label="Muhur numarasi" hint="Muhur olmadan surec kapanamaz.">
                  <Input value={sealNumber} onChange={(event) => setSealNumber(event.target.value)} placeholder="SL-900001" />
                </FormField>

                <FormField label="Cikis notu">
                  <Textarea rows={4} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Muhur takildi, cikis guvenlik kontrolu tamamlandi." />
                </FormField>

                <div className="form-actions">
                  <Button type="submit" size="lg" variant="success">
                    Muhur Kaydet ve Cikisi Tamamla
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
