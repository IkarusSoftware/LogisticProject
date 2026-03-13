import { useState } from 'react'

import { Card, FormField, InlineMessage, Input, PageHeader, Textarea, Button } from '../components/ui'
import { getCurrentUser, getVisibleRequests } from '../domain/selectors'
import { getStatusMeta } from '../domain/workflow'
import { useAppStore } from '../store/app-store'

export function SupplierAssignmentsPage() {
  const data = useAppStore((state) => state.data)
  const session = useAppStore((state) => state.session)
  const beginSupplierReview = useAppStore((state) => state.beginSupplierReview)
  const submitVehicleAssignment = useAppStore((state) => state.submitVehicleAssignment)
  const rejectBySupplier = useAppStore((state) => state.rejectBySupplier)
  const currentUser = getCurrentUser(data, session.currentUserId)
  const requests = getVisibleRequests(data, currentUser).filter((request) =>
    ['SENT_TO_SUPPLIER', 'SUPPLIER_REVIEWING'].includes(request.currentStatus),
  )

  const [selectedId, setSelectedId] = useState<string | null>(requests[0]?.id ?? null)
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [form, setForm] = useState({
    tractorPlate: '',
    trailerPlate: '',
    driverFirstName: '',
    driverLastName: '',
    driverPhone: '',
  })

  const selected = requests.find((request) => request.id === selectedId)

  function handleStartReview() {
    if (!selected) {
      return
    }

    const result = beginSupplierReview(selected.id)
    setFeedback({ kind: result.ok ? 'success' : 'error', text: result.message })
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected) {
      return
    }

    const result = submitVehicleAssignment(selected.id, form)
    setFeedback({ kind: result.ok ? 'success' : 'error', text: result.message })
  }

  function handleReject() {
    if (!selected) {
      return
    }

    const result = rejectBySupplier(selected.id, rejectionReason)
    setFeedback({ kind: result.ok ? 'success' : 'error', text: result.message })
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Kullanici akisi 2/5"
        title="Tedarikci arac atama ekrani"
        description="Bekleyen talepler solda listelenir; sag panelde plaka, sofor ve telefon formu kisa ve hatayi azaltacak sekilde ilerler."
      />

      {feedback && <InlineMessage kind={feedback.kind} message={feedback.text} />}

      <div className="split-layout">
        <Card title="Bekleyen talepler" subtitle={`${requests.length} kayit`}>
          <div className="selection-list">
            {requests.map((request) => (
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

        <Card title="Arac / sofor girisi" subtitle="Eksik bilgi varsa kayit onaya gonderilemez.">
          {!selected ? (
            <p className="muted-text">Atama icin soldan bir talep secin.</p>
          ) : (
            <>
              <div className="request-summary">
                <div>
                  <strong>{selected.requestNo}</strong>
                  <p>{selected.productInfo}</p>
                </div>
                <Button variant="secondary" size="sm" onClick={handleStartReview}>
                  Incelemeye Al
                </Button>
              </div>

              <form className="form-grid" onSubmit={handleSubmit}>
                <FormField label="Cekici plakasi" hint="Ornek: 34 ABC 123">
                  <Input value={form.tractorPlate} onChange={(event) => setForm({ ...form, tractorPlate: event.target.value })} placeholder="34 ABC 123" />
                </FormField>

                <FormField label="Dorse plakasi" hint="Ornek: 34 AB 1234">
                  <Input value={form.trailerPlate} onChange={(event) => setForm({ ...form, trailerPlate: event.target.value })} placeholder="34 TR 9045" />
                </FormField>

                <FormField label="Sofor adi">
                  <Input value={form.driverFirstName} onChange={(event) => setForm({ ...form, driverFirstName: event.target.value })} placeholder="Hakan" />
                </FormField>

                <FormField label="Sofor soyadi">
                  <Input value={form.driverLastName} onChange={(event) => setForm({ ...form, driverLastName: event.target.value })} placeholder="Kurt" />
                </FormField>

                <FormField label="Telefon" hint="+90 5xx xxx xx xx">
                  <Input value={form.driverPhone} onChange={(event) => setForm({ ...form, driverPhone: event.target.value })} placeholder="+905327659876" />
                </FormField>

                <div className="form-actions form-actions--between">
                  <Button type="submit" size="lg">
                    Onaya Gonder
                  </Button>
                </div>
              </form>

              <div className="divider" />

              <FormField label="Uygun degilse red aciklamasi">
                <Textarea rows={3} value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Arac bulunamadi, sure yetismiyor vb." />
              </FormField>
              <Button variant="danger" onClick={handleReject}>
                Talebi Reddet
              </Button>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
