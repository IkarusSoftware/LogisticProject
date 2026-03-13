import { useState } from 'react'
import { addDays, format } from 'date-fns'

import { Button, Card, FormField, InlineMessage, Input, PageHeader, Select, Textarea } from '../components/ui'
import { useAppStore } from '../store/app-store'

export function CreateRequestPage() {
  const data = useAppStore((state) => state.data)
  const createShipmentRequest = useAppStore((state) => state.createShipmentRequest)

  const [form, setForm] = useState({
    targetLocationId: 'loc-istanbul',
    vehicleType: 'TIR' as const,
    requestDate: format(new Date(), 'yyyy-MM-dd'),
    loadDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    loadTime: '09:00',
    quantityInfo: '24 palet / 18 ton',
    productInfo: 'Kozmetik ve kisisel bakim urunleri',
    notes: 'Kapida evrak teslimi ve son plaka kontrolu istenir.',
    assignedSupplierCompanyId: 'company-anadolu',
  })
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = createShipmentRequest(form)
    setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
    if (result.ok) {
      setForm((current) => ({
        ...current,
        notes: '',
        productInfo: '',
        quantityInfo: '',
      }))
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Kullanici akisi 1/5"
        title="Yeni sevkiyat talebi"
        description="Form kisa tutuldu; kullanici yalnizca karar icin gerekli alanlari girer, sistem geri kalan operasyonu rol bazli olarak yonlendirir."
      />

      <Card title="Talep bilgileri" subtitle="Kaydet ve gonder aksiyonu ile talep dogrudan tedarikci kuyruğuna duser.">
        <form className="form-grid" onSubmit={handleSubmit}>
          <FormField label="Lokasyon">
            <Select value={form.targetLocationId} onChange={(event) => setForm({ ...form, targetLocationId: event.target.value })}>
              {data.locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Arac tipi">
            <Select value={form.vehicleType} onChange={(event) => setForm({ ...form, vehicleType: event.target.value as typeof form.vehicleType })}>
              <option value="TIR">TIR</option>
              <option value="KAMYON">Kamyon</option>
              <option value="KAMYONET">Kamyonet</option>
            </Select>
          </FormField>

          <FormField label="Talep tarihi">
            <Input type="date" value={form.requestDate} onChange={(event) => setForm({ ...form, requestDate: event.target.value })} />
          </FormField>

          <FormField label="Yukleme tarihi">
            <Input type="date" value={form.loadDate} onChange={(event) => setForm({ ...form, loadDate: event.target.value })} />
          </FormField>

          <FormField label="Saat">
            <Input type="time" value={form.loadTime} onChange={(event) => setForm({ ...form, loadTime: event.target.value })} />
          </FormField>

          <FormField label="Tedarikci firma">
            <Select
              value={form.assignedSupplierCompanyId}
              onChange={(event) => setForm({ ...form, assignedSupplierCompanyId: event.target.value })}
            >
              {data.companies
                .filter((company) => company.type !== 'MAIN')
                .map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
            </Select>
          </FormField>

          <FormField label="Miktar bilgisi" hint="Ornek: 24 palet / 18 ton">
            <Input value={form.quantityInfo} onChange={(event) => setForm({ ...form, quantityInfo: event.target.value })} placeholder="24 palet / 18 ton" />
          </FormField>

          <FormField label="Urun / yuk bilgisi" hint="Ornek: Kozmetik ve kisisel bakim urunleri">
            <Input value={form.productInfo} onChange={(event) => setForm({ ...form, productInfo: event.target.value })} placeholder="Kozmetik ve kisisel bakim urunleri" />
          </FormField>

          <FormField label="Notlar" hint="Kritik saha notlari veya ek beklentiler">
            <Textarea rows={4} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Rampa veya evrak notu" />
          </FormField>

          <div className="form-actions">
            <Button type="submit" size="lg">
              Kaydet ve Gonder
            </Button>
          </div>
        </form>
      </Card>

      {message && <InlineMessage kind={message.kind} message={message.text} />}
    </div>
  )
}
