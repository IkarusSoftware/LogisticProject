import { useState, useMemo, useCallback } from 'react'
import { Button, Card, PageHeader, InlineMessage } from '../components/ui'
import { getAllStores, addStore, removeStore, isCustomStore } from '../lib/shift-processData'
import { REGIONS } from '../lib/shift-constants'
import type { StoreInfo } from '../lib/shift-types'

const MAGAZA_TIPI_OPTIONS = ['AVM', 'CADDE', '']
const SINIF_OPTIONS = ['A', 'B', 'C', 'D', '']

export function MagazaBilgileriPage() {
  const [storeList, setStoreList] = useState<StoreInfo[]>(() => getAllStores())
  const [search, setSearch] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newKod, setNewKod] = useState('')
  const [newAd, setNewAd] = useState('')
  const [newBolge, setNewBolge] = useState(REGIONS[0])
  const [newMagazaTipi, setNewMagazaTipi] = useState('')
  const [newSinif, setNewSinif] = useState('')
  const [newBolgeMuduru, setNewBolgeMuduru] = useState('')
  const [newSatisMuduru, setNewSatisMuduru] = useState('')
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const refresh = useCallback(() => setStoreList(getAllStores()), [])

  const filtered = useMemo(() => {
    if (!search.trim()) return storeList
    const q = search.toLowerCase()
    return storeList.filter(
      (s) =>
        s.kod.toString().includes(q) ||
        s.ad.toLowerCase().includes(q) ||
        s.bolge.toLowerCase().includes(q) ||
        (s.bolgeMuduru ?? '').toLowerCase().includes(q) ||
        (s.satisMuduru ?? '').toLowerCase().includes(q),
    )
  }, [storeList, search])

  const handleAdd = useCallback(() => {
    const kod = parseInt(newKod, 10)
    if (isNaN(kod) || kod <= 0) {
      setMessage({ kind: 'error', text: 'Gecerli bir magaza kodu girin.' })
      return
    }
    if (!newAd.trim()) {
      setMessage({ kind: 'error', text: 'Magaza adi bos olamaz.' })
      return
    }
    if (storeList.some((s) => s.kod === kod)) {
      setMessage({ kind: 'error', text: `${kod} kodlu magaza zaten mevcut.` })
      return
    }
    addStore({
      kod,
      ad: newAd.trim(),
      bolge: newBolge,
      magazaTipi: newMagazaTipi || undefined,
      sinif: newSinif || undefined,
      bolgeMuduru: newBolgeMuduru.trim() || undefined,
      satisMuduru: newSatisMuduru.trim() || undefined,
    })
    refresh()
    setNewKod('')
    setNewAd('')
    setNewBolge(REGIONS[0])
    setNewMagazaTipi('')
    setNewSinif('')
    setNewBolgeMuduru('')
    setNewSatisMuduru('')
    setShowAddForm(false)
    setMessage({ kind: 'success', text: `${newAd.trim()} (${kod}) basariyla eklendi.` })
  }, [newKod, newAd, newBolge, newMagazaTipi, newSinif, newBolgeMuduru, newSatisMuduru, storeList, refresh])

  const handleRemove = useCallback(
    (kod: number, ad: string) => {
      removeStore(kod)
      refresh()
      setMessage({ kind: 'success', text: `${ad} (${kod}) silindi.` })
    },
    [refresh],
  )

  const border = '1px solid #e2e8f0'
  const thStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '6px 10px',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    borderRight: border,
  }
  const tdStyle: React.CSSProperties = {
    padding: '5px 10px',
    fontSize: '12px',
    borderBottom: border,
    borderRight: border,
  }
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '6px 10px',
    border,
    borderRadius: '6px',
    fontSize: '13px',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 600,
    marginBottom: '4px',
    color: '#64748b',
    textTransform: 'uppercase',
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Magaza Yonetimi"
        title="Magaza Bilgileri"
        description="Magaza kodu, adi, bolge, tip, sinif ve sorumlu bilgilerini yonetin."
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? 'Iptal' : 'Magaza Ekle'}
          </Button>
        }
      />

      {message && <InlineMessage kind={message.kind} message={message.text} />}

      {/* Add Form */}
      {showAddForm && (
        <Card title="Yeni Magaza Ekle">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr 1fr', gap: '0.75rem', alignItems: 'end' }}>
            <div>
              <label style={labelStyle}>Magaza Kodu</label>
              <input type="number" value={newKod} onChange={(e) => setNewKod(e.target.value)} placeholder="Orn: 2067" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Magaza Adi</label>
              <input type="text" value={newAd} onChange={(e) => setNewAd(e.target.value)} placeholder="Orn: GRS FORUM AVM" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Bolge</label>
              <select value={newBolge} onChange={(e) => setNewBolge(e.target.value)} style={{ ...inputStyle, background: '#fff' }}>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Magaza Tipi</label>
              <select value={newMagazaTipi} onChange={(e) => setNewMagazaTipi(e.target.value)} style={{ ...inputStyle, background: '#fff' }}>
                {MAGAZA_TIPI_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t || '-'}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Sinif</label>
              <select value={newSinif} onChange={(e) => setNewSinif(e.target.value)} style={{ ...inputStyle, background: '#fff' }}>
                {SINIF_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s || '-'}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.75rem', alignItems: 'end', marginTop: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Bolge Muduru</label>
              <input type="text" value={newBolgeMuduru} onChange={(e) => setNewBolgeMuduru(e.target.value)} placeholder="Ad Soyad" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Satis Muduru</label>
              <input type="text" value={newSatisMuduru} onChange={(e) => setNewSatisMuduru(e.target.value)} placeholder="Ad Soyad" style={inputStyle} />
            </div>
            <Button variant="success" size="sm" onClick={handleAdd}>
              Kaydet
            </Button>
          </div>
        </Card>
      )}

      {/* Search */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Magaza kodu, adi, bolge veya sorumlu ile ara..."
            style={{ flex: 1, padding: '6px 12px', border, borderRadius: '6px', fontSize: '13px' }}
          />
          <span style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
            {filtered.length} / {storeList.length} magaza
          </span>
        </div>
      </Card>

      {/* Store Table */}
      <Card>
        <div style={{ maxHeight: '560px', overflowY: 'auto' }}>
          <table style={{ tableLayout: 'fixed', width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <colgroup>
              <col style={{ width: '70px' }} />
              <col />
              <col style={{ width: '130px' }} />
              <col style={{ width: '65px' }} />
              <col style={{ width: '50px' }} />
              <col style={{ width: '130px' }} />
              <col style={{ width: '130px' }} />
              <col style={{ width: '65px' }} />
            </colgroup>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <tr style={{ background: '#1e293b', color: '#fff' }}>
                <th style={{ ...thStyle, textAlign: 'center' }}>KOD</th>
                <th style={{ ...thStyle, textAlign: 'left' }}>MAGAZA ADI</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>BOLGE</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>TIP</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>SINIF</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>BOLGE MUDURU</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>SATIS MUDURU</th>
                <th style={{ ...thStyle, borderRight: 'none', textAlign: 'center' }}>ISLEM</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, idx) => {
                const custom = isCustomStore(s.kod)
                return (
                  <tr key={s.kod} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, fontFamily: 'monospace' }}>{s.kod}</td>
                    <td style={{ ...tdStyle }}>
                      <span style={{ fontWeight: 500 }}>{s.ad}</span>
                      {custom && (
                        <span style={{ marginLeft: '8px', fontSize: '9px', padding: '1px 6px', borderRadius: '4px', background: '#dbeafe', color: '#2563eb', fontWeight: 600 }}>
                          MANUEL
                        </span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontSize: '11px' }}>{s.bolge}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      {s.magazaTipi ? (
                        <span style={{
                          fontSize: '10px', padding: '1px 6px', borderRadius: '4px', fontWeight: 600,
                          background: s.magazaTipi === 'AVM' ? '#fef3c7' : '#e0e7ff',
                          color: s.magazaTipi === 'AVM' ? '#92400e' : '#3730a3',
                        }}>
                          {s.magazaTipi}
                        </span>
                      ) : <span style={{ color: '#94a3b8' }}>-</span>}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600 }}>
                      {s.sinif ? (
                        <span style={{
                          fontSize: '10px', padding: '1px 6px', borderRadius: '4px', fontWeight: 700,
                          background: s.sinif === 'A' ? '#dcfce7' : s.sinif === 'B' ? '#dbeafe' : s.sinif === 'C' ? '#fef9c3' : '#fee2e2',
                          color: s.sinif === 'A' ? '#166534' : s.sinif === 'B' ? '#1e40af' : s.sinif === 'C' ? '#854d0e' : '#991b1b',
                        }}>
                          {s.sinif}
                        </span>
                      ) : <span style={{ color: '#94a3b8' }}>-</span>}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontSize: '11px' }}>{s.bolgeMuduru || <span style={{ color: '#94a3b8' }}>-</span>}</td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontSize: '11px' }}>{s.satisMuduru || <span style={{ color: '#94a3b8' }}>-</span>}</td>
                    <td style={{ ...tdStyle, textAlign: 'center', borderRight: 'none' }}>
                      {custom ? (
                        <Button variant="danger" size="sm" onClick={() => handleRemove(s.kod, s.ad)}>
                          Sil
                        </Button>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>-</span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                    Sonuc bulunamadi
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
