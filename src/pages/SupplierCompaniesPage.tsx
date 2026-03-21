import { useState } from 'react'
import { Building2, Plus, Truck } from 'lucide-react'

import { Card, PageHeader, Button, Badge, FormField, Input, Select, InlineMessage } from '../components/ui'
import { useAppStore } from '../store/app-store'

const TYPE_LABELS: Record<string, string> = {
  MAIN: 'Ana Firma',
  SUPPLIER: 'Tedarikçi',
  LOGISTICS: 'Lojistik',
}

export function SupplierCompaniesPage() {
  const data = useAppStore((state) => state.data)
  const toggleCompanyStatus = useAppStore((state) => state.toggleCompanyStatus)
  const addCompany = useAppStore((state) => state.addCompany)

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<'SUPPLIER' | 'LOGISTICS'>('SUPPLIER')
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const supplierCompanies = data.companies.filter((c) => c.type === 'SUPPLIER' || c.type === 'LOGISTICS')

  function handleSave() {
    if (!name.trim()) return
    addCompany(name.trim(), type)
    setMessage({ kind: 'success', text: `"${name.trim()}" başarıyla eklendi.` })
    setName('')
    setType('SUPPLIER')
    setShowForm(false)
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Sistem Yönetimi"
        title="Tedarikçi Firmalar"
        description="Sisteme kayıtlı tedarikçi ve lojistik firmaları yönetin."
        actions={
          !showForm ? (
            <Button onClick={() => { setShowForm(true); setMessage(null) }}>
              <Plus size={16} />
              Firma Ekle
            </Button>
          ) : undefined
        }
      />

      {message && <InlineMessage kind={message.kind} message={message.text} />}

      {showForm && (
        <Card title="Yeni Tedarikçi Firma">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 480 }}>
            <FormField label="Firma Adı">
              <Input
                placeholder="ör. Yıldız Nakliyat"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </FormField>
            <FormField label="Firma Türü">
              <Select value={type} onChange={(e) => setType(e.target.value as 'SUPPLIER' | 'LOGISTICS')}>
                <option value="SUPPLIER">Tedarikçi</option>
                <option value="LOGISTICS">Lojistik</option>
              </Select>
            </FormField>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button onClick={handleSave} disabled={!name.trim()}>Kaydet</Button>
              <Button variant="secondary" onClick={() => { setShowForm(false); setName('') }}>İptal</Button>
            </div>
          </div>
        </Card>
      )}

      <Card title={`Tedarikçi Listesi (${supplierCompanies.length})`}>
        {supplierCompanies.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <Truck size={32} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
            <p>Henüz tedarikçi firma eklenmedi.</p>
          </div>
        ) : (
          <div className="stack-list">
            {supplierCompanies.map((company) => (
              <div key={company.id} className="stack-list__item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Building2 size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                  <div>
                    <strong>{company.name}</strong>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {TYPE_LABELS[company.type] ?? company.type}
                    </p>
                  </div>
                </div>
                <div className="stack-list__actions">
                  <Badge tone={company.status === 'ACTIVE' ? 'success' : 'warning'}>
                    {company.status === 'ACTIVE' ? 'Aktif' : 'Pasif'}
                  </Badge>
                  <Button size="sm" variant="secondary" onClick={() => toggleCompanyStatus(company.id)}>
                    {company.status === 'ACTIVE' ? 'Pasife Al' : 'Aktife Al'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
