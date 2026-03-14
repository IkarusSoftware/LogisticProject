import { useEffect, useState, type FormEvent } from 'react'

import { ShipmentFiltersBar, ShipmentTable, applyShipmentFilters, initialShipmentFilters } from '../components/shipments'
import { Button, Card, FormField, InlineMessage, Input, PageHeader } from '../components/ui'
import { getCurrentRoleKey, getCurrentUser, getShipmentDetail, getVisibleRequests } from '../domain/selectors'
import { useAppStore } from '../store/app-store'

export function SupplierAssignmentsPage() {
  const data = useAppStore((state) => state.data)
  const session = useAppStore((state) => state.session)
  const submitVehicleAssignment = useAppStore((state) => state.submitVehicleAssignment)
  const currentUser = getCurrentUser(data, session.currentUserId)
  const roleKey = getCurrentRoleKey(currentUser)
  const visibleRequests = getVisibleRequests(data, currentUser).filter((request) => !isSeedRequest(request.id))

  const [filters, setFilters] = useState(initialShipmentFilters)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [supplyForm, setSupplyForm] = useState({
    tractorPlate: '',
    trailerPlate: '',
    driverFirstName: '',
    driverLastName: '',
    driverPhone: '',
  })
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const filteredRequests = applyShipmentFilters(visibleRequests, data, filters, 'procurement')
  const selectedRequest = filteredRequests.find((request) => request.id === selectedId) ?? visibleRequests.find((request) => request.id === selectedId)
  const selectedDetail = selectedRequest ? getShipmentDetail(data, selectedRequest.id) : undefined
  const canSupplyOnList = roleKey === 'supplier' && selectedRequest && ['SENT_TO_SUPPLIER', 'SUPPLIER_REVIEWING'].includes(selectedRequest.currentStatus)

  useEffect(() => {
    const assignment = selectedDetail?.vehicleAssignment
    setSupplyForm({
      tractorPlate: assignment?.tractorPlate ?? '',
      trailerPlate: assignment?.trailerPlate ?? '',
      driverFirstName: assignment?.driverFirstName ?? '',
      driverLastName: assignment?.driverLastName ?? '',
      driverPhone: assignment?.driverPhone ?? '',
    })
  }, [selectedDetail?.vehicleAssignment, selectedId])

  function handleSupplySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedRequest) {
      return
    }

    const result = submitVehicleAssignment(selectedRequest.id, supplyForm)
    setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Tedarikci ekrani"
        title="Arac talep listesi"
        description="Her tedarikci sadece kendi firmasina atanmis talepleri gorur. Talep tablosundan secim yapip cekici, dorse, sofor ve telefon bilgilerini bu ekrandan girebilirsiniz."
      />

      {message && <InlineMessage kind={message.kind} message={message.text} />}

      <ShipmentFiltersBar data={data} filters={filters} onChange={setFilters} statusMode="procurement" />

      <Card title="Talep tablosu" subtitle={`${filteredRequests.length} kayit listeleniyor`}>
        <ShipmentTable
          requests={filteredRequests}
          data={data}
          selectedId={selectedId}
          onSelect={setSelectedId}
          statusMode="procurement"
          showPhoneColumn
          showRequestDateColumn
        />
      </Card>

      <Card
        title="Tedarik bilgileri girisi"
        subtitle={
          selectedRequest
            ? `${selectedRequest.requestNo} icin cekici, dorse ve sofor bilgilerini buradan girin.`
            : 'Arac bilgisi girmek icin tablodan bir talep secin.'
        }
      >
        {!selectedRequest ? (
          <p className="muted-text">Ustteki listeden bir talep secmeden bilgi girisi yapilamaz.</p>
        ) : canSupplyOnList ? (
          <form className="form-grid" onSubmit={handleSupplySubmit}>
            <FormField label="Cekici plakasi">
              <Input
                value={supplyForm.tractorPlate}
                onChange={(event) => setSupplyForm({ ...supplyForm, tractorPlate: event.target.value })}
                placeholder="34 ABC 123"
              />
            </FormField>

            <FormField label="Dorse plakasi">
              <Input
                value={supplyForm.trailerPlate}
                onChange={(event) => setSupplyForm({ ...supplyForm, trailerPlate: event.target.value })}
                placeholder="34 AB 1234"
              />
            </FormField>

            <FormField label="Sofor adi">
              <Input
                value={supplyForm.driverFirstName}
                onChange={(event) => setSupplyForm({ ...supplyForm, driverFirstName: event.target.value })}
                placeholder="Hakan"
              />
            </FormField>

            <FormField label="Sofor soyadi">
              <Input
                value={supplyForm.driverLastName}
                onChange={(event) => setSupplyForm({ ...supplyForm, driverLastName: event.target.value })}
                placeholder="Kurt"
              />
            </FormField>

            <FormField label="Sofor telefonu">
              <Input
                value={supplyForm.driverPhone}
                onChange={(event) => setSupplyForm({ ...supplyForm, driverPhone: event.target.value })}
                placeholder="+905327659876"
              />
            </FormField>

            <div className="form-actions">
              <Button type="submit" size="lg">
                Tedarik Bilgilerini Gonder
              </Button>
            </div>
          </form>
        ) : (
          <p className="muted-text">Bu talep icin bilgi giris asamasi tamamlanmis veya talep sonraki asamaya gecmis.</p>
        )}
      </Card>
    </div>
  )
}

function isSeedRequest(requestId: string) {
  return /^req-\d{3}$/.test(requestId)
}
