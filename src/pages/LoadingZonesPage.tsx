import { useState } from 'react'
import { MapPin, Plus, Trash2 } from 'lucide-react'

import { Card, PageHeader, Button, Badge, FormField, Select, InlineMessage } from '../components/ui'
import { useAppStore } from '../store/app-store'

export function LoadingZonesPage() {
  const zones = useAppStore((state) => state.loadingZones)
  const locations = useAppStore((state) => state.data.locations)
  const addLoadingZone = useAppStore((state) => state.addLoadingZone)
  const removeLoadingZone = useAppStore((state) => state.removeLoadingZone)

  const [showForm, setShowForm] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  // Only active locations not already added
  const availableLocations = locations.filter(
    (l) => l.isActive && !zones.some((z) => z.locationId === l.id),
  )

  function handleSave() {
    const loc = locations.find((l) => l.id === selectedId)
    if (!loc) return
    addLoadingZone(loc.name, loc.id, loc.address)
    setMessage({ kind: 'success', text: `"${loc.name}" yükleme bölgesi eklendi.` })
    setSelectedId('')
    setShowForm(false)
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Tanımlar"
        title="Yükleme Bölgeleri"
        description="Sisteme tanımlı yükleme bölgelerini yönetin."
        actions={
          !showForm && availableLocations.length > 0 ? (
            <Button onClick={() => { setShowForm(true); setMessage(null) }}>
              <Plus size={16} />
              Yükleme Bölgesi Ekle
            </Button>
          ) : undefined
        }
      />

      {message && <InlineMessage kind={message.kind} message={message.text} />}

      {showForm && (
        <Card title="Yeni Yükleme Bölgesi">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 400 }}>
            <FormField label="Yükleme Alanı">
              <Select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                <option value="">-- Şehir seçin --</option>
                {availableLocations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </Select>
            </FormField>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button onClick={handleSave} disabled={!selectedId}>Kaydet</Button>
              <Button variant="secondary" onClick={() => { setShowForm(false); setSelectedId('') }}>İptal</Button>
            </div>
          </div>
        </Card>
      )}

      <Card title={`Kayıtlı Bölgeler (${zones.length})`}>
        {zones.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <MapPin size={32} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
            <p>Henüz yükleme bölgesi eklenmedi.</p>
          </div>
        ) : (
          <div className="stack-list">
            {zones.map((zone) => (
              <div key={zone.locationId} className="stack-list__item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={16} style={{ color: 'var(--color-primary)' }} />
                  <strong>{zone.name}</strong>
                </div>
                <div className="stack-list__actions">
                  <Badge tone="success">Aktif</Badge>
                  <Button size="sm" variant="secondary" onClick={() => removeLoadingZone(zone.name)}>
                    <Trash2 size={14} />
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
