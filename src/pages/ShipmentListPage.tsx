import { useState } from 'react'

import { ShipmentDetailDrawer, ShipmentFiltersBar, ShipmentTable, applyShipmentFilters, initialShipmentFilters } from '../components/shipments'
import { Button, Card, InlineMessage, PageHeader, Textarea } from '../components/ui'
import { getCurrentRoleKey, getCurrentUser, getVisibleRequests } from '../domain/selectors'
import { canCancelRequest } from '../domain/workflow'
import { useAppStore } from '../store/app-store'

export function ShipmentListPage() {
  const data = useAppStore((state) => state.data)
  const session = useAppStore((state) => state.session)
  const cancelRequest = useAppStore((state) => state.cancelRequest)
  const currentUser = getCurrentUser(data, session.currentUserId)
  const roleKey = getCurrentRoleKey(currentUser)
  const visibleRequests = getVisibleRequests(data, currentUser)

  const [filters, setFilters] = useState(initialShipmentFilters)
  const [selectedId, setSelectedId] = useState<string | null>(visibleRequests[0]?.id ?? null)
  const [cancelNote, setCancelNote] = useState('')
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const filteredRequests = applyShipmentFilters(visibleRequests, data, filters)
  const selectedRequest = filteredRequests.find((request) => request.id === selectedId) ?? visibleRequests.find((request) => request.id === selectedId)

  function handleCancel() {
    if (!selectedRequest) {
      return
    }

    const result = cancelRequest(selectedRequest.id, cancelNote)
    setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Operasyon listesi"
        title="Talep ve sevkiyat listesi"
        description="Yuksek veri yogunluguna uygun filtreleme, plaka/sofor aramasi ve detay cekmecesi ile tum sevkiyatlar ayni tabloda gorunur."
      />

      {message && <InlineMessage kind={message.kind} message={message.text} />}

      <ShipmentFiltersBar data={data} filters={filters} onChange={setFilters} />

      <Card
        title="Sevkiyat tablosu"
        subtitle={`${filteredRequests.length} kayit listeleniyor`}
        actions={
          selectedRequest && roleKey === 'requester' && canCancelRequest(selectedRequest) ? (
            <Button variant="danger" size="sm" onClick={handleCancel}>
              Iptal talebi baslat
            </Button>
          ) : undefined
        }
      >
        {selectedRequest && roleKey === 'requester' && canCancelRequest(selectedRequest) && (
          <div className="action-strip">
            <Textarea
              rows={2}
              placeholder="Iptal nedeni veya aciklama"
              value={cancelNote}
              onChange={(event) => setCancelNote(event.target.value)}
            />
          </div>
        )}
        <ShipmentTable requests={filteredRequests} data={data} selectedId={selectedId} onSelect={setSelectedId} />
      </Card>

      <ShipmentDetailDrawer data={data} shipmentRequestId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  )
}
