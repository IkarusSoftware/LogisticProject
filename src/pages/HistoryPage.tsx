import { useState } from 'react'

import { ShipmentDetailDrawer, ShipmentFiltersBar, ShipmentTable, applyShipmentFilters, initialShipmentFilters } from '../components/shipments'
import { Button, Card, PageHeader } from '../components/ui'
import { getCurrentUser, getVisibleRequests } from '../domain/selectors'
import { useAppStore } from '../store/app-store'

export function HistoryPage() {
  const data = useAppStore((state) => state.data)
  const session = useAppStore((state) => state.session)
  const currentUser = getCurrentUser(data, session.currentUserId)
  const requests = getVisibleRequests(data, currentUser).filter((request) =>
    ['COMPLETED', 'REJECTED', 'CANCELLED'].includes(request.currentStatus),
  )
  const [filters, setFilters] = useState(initialShipmentFilters)
  const [selectedId, setSelectedId] = useState<string | null>(requests[0]?.id ?? null)
  const filtered = applyShipmentFilters(requests, data, filters)

  function handleExport() {
    const rows = filtered.map((request) => {
      const assignment = data.vehicleAssignments.find((item) => item.shipmentRequestId === request.id)
      return [
        request.requestNo,
        request.currentStatus,
        request.loadDate,
        request.loadTime,
        assignment?.tractorPlate ?? '',
        assignment ? `${assignment.driverFirstName} ${assignment.driverLastName}` : '',
      ].join(';')
    })

    const csv = ['TalepNo;Durum;YuklemeTarihi;Saat;Cekici;Sofor', ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'sevkiyat-gecmisi.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Kapanan operasyonlar"
        title="Islem gecmisi ve tamamlananlar"
        description="Tamamlanan, reddedilen ve iptal edilen sevkiyatlar ayni ekranda tutulur. Detay cekmecesinde tam zaman cizelgesi ve audit log gorulur."
        actions={
          <Button variant="secondary" onClick={handleExport}>
            Export
          </Button>
        }
      />

      <ShipmentFiltersBar data={data} filters={filters} onChange={setFilters} />
      <Card title="Gecmis kayitlari" subtitle={`${filtered.length} kayit`}>
        <ShipmentTable requests={filtered} data={data} selectedId={selectedId} onSelect={setSelectedId} />
      </Card>
      <ShipmentDetailDrawer data={data} shipmentRequestId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  )
}
