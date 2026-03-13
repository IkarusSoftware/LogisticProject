import { Card, MetricCard, PageHeader, ProgressBar } from '../components/ui'
import { getAverageDurations, getCompanyPerformance, getLocationIntensity, getRampUsage } from '../domain/selectors'
import { useAppStore } from '../store/app-store'

export function ReportsPage() {
  const data = useAppStore((state) => state.data)
  const averages = getAverageDurations(data)
  const companyPerformance = getCompanyPerformance(data)
  const locationIntensity = getLocationIntensity(data)
  const rampUsage = getRampUsage(data)

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Raporlama"
        title="Operasyon KPI ve performans raporlari"
        description="Gunluk talep, red oranlari, onay hizlari ve rampa kullanim yogunlugu ayni analiz panelinde toplanir."
      />

      <section className="metric-grid">
        <MetricCard label="Gunluk toplam talep" value={data.shipmentRequests.filter((request) => request.requestDate === data.shipmentRequests[0]?.requestDate).length} helper="Bugun acilan kayitlar" />
        <MetricCard label="Tamamlanan sevkiyat" value={data.shipmentRequests.filter((request) => request.currentStatus === 'COMPLETED').length} helper="Tum zamanlar" tone="success" />
        <MetricCard label="Reddedilen sevkiyat" value={data.shipmentRequests.filter((request) => request.currentStatus === 'REJECTED').length} helper="Kalite sinyali" tone="warning" />
        <MetricCard label="Ortalama onay suresi" value={`${averages.averageApprovalMinutes} dk`} helper="Talep acilis > onay" tone="info" />
        <MetricCard label="Ortalama saha girisi" value={`${averages.averageGateMinutes} dk`} helper="Rampa atama > tesise gelis" tone="info" />
        <MetricCard label="Ortalama yukleme" value={`${averages.averageLoadingMinutes} dk`} helper="Yukleme baslangic > tamamlanma" tone="neutral" />
      </section>

      <section className="dashboard-grid">
        <Card title="Firma bazli performans">
          <div className="stack-list">
            {companyPerformance.map((item) => (
              <div key={item.company.id} className="stack-list__item">
                <div>
                  <strong>{item.company.name}</strong>
                  <p>{item.completed} tamamlanan / {item.rejected} red</p>
                </div>
                <ProgressBar label="Tamamlama orani" value={item.completionRate} />
              </div>
            ))}
          </div>
        </Card>

        <Card title="Lokasyon bazli yogunluk">
          <div className="stack-list">
            {locationIntensity.map((item) => (
              <div key={item.location.id} className="stack-list__item">
                <div>
                  <strong>{item.location.name}</strong>
                  <p>{item.active} aktif / {item.total} toplam</p>
                </div>
                <span>{item.total} is</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <Card title="Rampa kullanim yogunlugu">
        <div className="stack-list">
          {rampUsage.map((item) => (
            <div key={item.ramp.id} className="stack-list__item">
              <div>
                <strong>{item.ramp.code}</strong>
                <p>{item.ramp.name}</p>
              </div>
              <span>{item.count} atama</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
