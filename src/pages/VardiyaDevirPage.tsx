import { useState, useCallback, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { Button, Card, PageHeader, InlineMessage } from '../components/ui'
import { parseExcelFile } from '../lib/shift-parseExcel'
import { processOrders, getRegionDetails, storeMap } from '../lib/shift-processData'
import { classifyLocation, REGIONS } from '../lib/shift-constants'
import type { OrderRow, ProcessedData, RegionSummary } from '../lib/shift-types'

/* ─────────────────── Main Page ─────────────────── */

export function VardiyaDevirPage() {
  const [orders130, setOrders130] = useState<OrderRow[]>([])
  const [orders190, setOrders190] = useState<OrderRow[]>([])
  const [file130, setFile130] = useState('')
  const [file190, setFile190] = useState('')
  const [processing130, setProcessing130] = useState(false)
  const [processing190, setProcessing190] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'summary' | 'detail'>('summary')
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const allOrders = useMemo(() => [...orders130, ...orders190], [orders130, orders190])
  const data: ProcessedData | null = allOrders.length > 0 ? processOrders(allOrders) : null

  const handleFileLoaded = useCallback((buffer: ArrayBuffer, name: string, depoCode: string) => {
    const setProcessing = depoCode === '130' ? setProcessing130 : setProcessing190
    const setOrders = depoCode === '130' ? setOrders130 : setOrders190
    const setFile = depoCode === '130' ? setFile130 : setFile190

    setProcessing(true)
    setFile(name)
    setMessage(null)

    setTimeout(() => {
      try {
        const { orders } = parseExcelFile(buffer, depoCode)
        setOrders(orders)
        setMessage({ kind: 'success', text: `${name} basariyla yuklendi (${orders.length} kayit)` })
      } catch {
        setMessage({ kind: 'error', text: 'Dosya islenirken hata olustu. Gecerli bir Excel dosyasi yukleyin.' })
      } finally {
        setProcessing(false)
      }
    }, 50)
  }, [])

  const handleExport = useCallback(() => {
    if (!data) return
    const wb = XLSX.utils.book_new()
    const summaryRows = data.regionSummaries.map((s) => ({
      Bolge: s.bolge,
      Toplama: s.toplama,
      Kasalama: s.kasalama,
      'Sevkiyat Kasa': s.sevkiyatKasa,
      'DAB Toplama': s.dabToplama,
      'DAB Ramp': s.dabRamp,
      Toplam: s.toplam,
      Palet: s.paletSayisi,
      'Buyuk Kasa': s.buyukKasa,
      'Kucuk Kasa': s.kucukKasa,
      'Muhtelif Koli': s.muhtelifKoli,
    }))
    const ws = XLSX.utils.json_to_sheet(summaryRows)
    XLSX.utils.book_append_sheet(wb, ws, 'Bolge Ozet')
    XLSX.writeFile(wb, `vardiya_devri_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }, [data])

  const handleReset = useCallback(() => {
    setOrders130([])
    setOrders190([])
    setFile130('')
    setFile190('')
    setSelectedRegion(null)
    setActiveTab('summary')
    setMessage(null)
  }, [])

  const regionOrders = selectedRegion && data ? getRegionDetails(data.orderDetails, selectedRegion) : []

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Vardiya Devir"
        title="Vardiya Devri"
        description="130 ve 190 depo Excel dosyalarini yukleyerek bolgesel kasa, palet ve siparis ozetini goruntuleyin."
        actions={
          <div className="table-action-group">
            {data && (
              <Button variant="success" size="sm" onClick={handleExport}>
                Excel Indir
              </Button>
            )}
            {(file130 || file190) && (
              <Button variant="secondary" size="sm" onClick={handleReset}>
                Sifirla
              </Button>
            )}
          </div>
        }
      />

      {message && <InlineMessage kind={message.kind} message={message.text} />}

      {/* File Upload Area */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <FileUploadCard
          label="130 Depo Data"
          depoCode="130"
          onFileLoaded={handleFileLoaded}
          isProcessing={processing130}
          loadedFileName={file130}
        />
        <FileUploadCard
          label="190 Depo Data"
          depoCode="190"
          onFileLoaded={handleFileLoaded}
          isProcessing={processing190}
          loadedFileName={file190}
        />
      </div>

      {/* Stats */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
          <StatChip label="Toplam Siparis" value={data.totalOrders.toLocaleString('tr-TR')} sub="benzersiz siparis" accent="#3b82f6" />
          <StatChip label="Toplam Kasa" value={data.totalBoxes.toLocaleString('tr-TR')} sub="tum depolar" accent="#10b981" />
          <StatChip label="Toplam Palet" value={data.totalPallets.toLocaleString('tr-TR')} sub="24 kasa / palet" accent="#f59e0b" />
          <StatChip label="Aktif Bolge" value={data.regionSummaries.length} sub="veri iceren bolge" accent="#8b5cf6" />
        </div>
      )}

      {/* Tab Navigation */}
      {data && (
        <div className="table-action-group">
          <Button
            variant={activeTab === 'summary' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setActiveTab('summary')}
          >
            Bolge Ozet
          </Button>
          <Button
            variant={activeTab === 'detail' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setActiveTab('detail')}
          >
            Siparis Detay
          </Button>
        </div>
      )}

      {/* Summary Table */}
      {data && activeTab === 'summary' && (
        <RegionSummaryTable summaries={data.regionSummaries} onRegionClick={setSelectedRegion} />
      )}

      {/* Detail View */}
      {data && activeTab === 'detail' && <ConveyorSummary orders={data.orderDetails} />}

      {/* Empty State */}
      {!data && (
        <Card>
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <p className="muted-text" style={{ fontSize: '1.1rem' }}>Veri Bekleniyor</p>
            <p className="muted-text">130 ve 190 depo Excel dosyalarini yukleyin</p>
          </div>
        </Card>
      )}

      {/* Region Detail Modal */}
      {selectedRegion && data && (
        <RegionDetailModal bolge={selectedRegion} orders={regionOrders} onClose={() => setSelectedRegion(null)} />
      )}
    </div>
  )
}

/* ─────────────────── File Upload Card ─────────────────── */

function FileUploadCard({
  label,
  depoCode,
  onFileLoaded,
  isProcessing,
  loadedFileName,
}: {
  label: string
  depoCode: string
  onFileLoaded: (buffer: ArrayBuffer, fileName: string, depoCode: string) => void
  isProcessing: boolean
  loadedFileName?: string
}) {
  const [isDragging, setIsDragging] = useState(false)
  const inputId = `file-input-${depoCode}`

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const buffer = e.target?.result as ArrayBuffer
        if (buffer) onFileLoaded(buffer, file.name, depoCode)
      }
      reader.readAsArrayBuffer(file)
    },
    [onFileLoaded, depoCode],
  )

  return (
    <Card>
      <div
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          const file = e.dataTransfer.files[0]
          if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) handleFile(file)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => document.getElementById(inputId)?.click()}
        className="file-upload-zone"
        style={{
          border: `2px dashed ${isDragging ? 'var(--color-info)' : loadedFileName ? 'var(--color-success)' : 'var(--color-border)'}`,
          borderRadius: '0.75rem',
          padding: '1.5rem',
          textAlign: 'center',
          cursor: isProcessing ? 'wait' : 'pointer',
          opacity: isProcessing ? 0.6 : 1,
          background: isDragging ? 'var(--color-info-bg)' : loadedFileName ? 'var(--color-success-bg)' : 'transparent',
          transition: 'all 0.2s ease',
        }}
      >
        <input
          id={inputId}
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
          style={{ display: 'none' }}
        />
        {isProcessing ? (
          <p style={{ fontWeight: 500 }}>Isleniyor...</p>
        ) : loadedFileName ? (
          <div>
            <p style={{ fontWeight: 600, color: 'var(--color-success)' }}>{label}</p>
            <p className="muted-text" style={{ fontSize: '0.8rem' }}>{loadedFileName}</p>
          </div>
        ) : (
          <div>
            <p style={{ fontWeight: 500 }}>{label}</p>
            <p className="muted-text" style={{ fontSize: '0.8rem' }}>Surukle birak veya tikla</p>
          </div>
        )}
      </div>
    </Card>
  )
}

/* ─────────────────── Heat Background Helper ─────────────────── */

function heatBg(value: number, max: number): React.CSSProperties {
  if (value === 0 || max === 0) return {}
  const ratio = Math.min(value / max, 1)

  let r: number, g: number, b: number
  if (ratio <= 0.5) {
    const t = ratio / 0.5
    r = Math.round(87 + (255 - 87) * t)
    g = Math.round(187 + (235 - 187) * t)
    b = Math.round(59 + (59 - 59) * t)
  } else {
    const t = (ratio - 0.5) / 0.5
    r = Math.round(255 + (220 - 255) * t)
    g = Math.round(235 + (53 - 235) * t)
    b = Math.round(59 + (46 - 59) * t)
  }

  const bg = `rgb(${r},${g},${b})`
  const textColor = ratio > 0.65 ? '#fff' : '#1e293b'
  return { background: bg, color: textColor, fontWeight: ratio > 0.4 ? 700 : 600 }
}

/* ─────────────────── Region Summary Table ─────────────────── */

function RegionSummaryTable({ summaries, onRegionClick }: { summaries: RegionSummary[]; onRegionClick: (bolge: string) => void }) {
  const totals = summaries.reduce(
    (acc, s) => ({
      toplama: acc.toplama + s.toplama,
      kasalama: acc.kasalama + s.kasalama,
      sevkiyatKasa: acc.sevkiyatKasa + s.sevkiyatKasa,
      dabToplama: acc.dabToplama + s.dabToplama,
      dabRamp: acc.dabRamp + s.dabRamp,
      toplam: acc.toplam + s.toplam,
      paletSayisi: acc.paletSayisi + s.paletSayisi,
    }),
    { toplama: 0, kasalama: 0, sevkiyatKasa: 0, dabToplama: 0, dabRamp: 0, toplam: 0, paletSayisi: 0 },
  )

  const mx = {
    toplama: Math.max(...summaries.map((s) => s.toplama)),
    kasalama: Math.max(...summaries.map((s) => s.kasalama)),
    sevkiyatKasa: Math.max(...summaries.map((s) => s.sevkiyatKasa)),
    dabToplama: Math.max(...summaries.map((s) => s.dabToplama)),
    dabRamp: Math.max(...summaries.map((s) => s.dabRamp)),
    toplam: Math.max(...summaries.map((s) => s.toplam)),
    palet: Math.max(...summaries.map((s) => s.paletSayisi)),
  }

  const fmt = (v: number) => (v === 0 ? '0' : v.toLocaleString('tr-TR'))

  const border = '1px solid #e2e8f0'
  const thStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '5px 6px',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    borderRight: border,
  }
  const tdBase: React.CSSProperties = {
    textAlign: 'center',
    padding: '3px 6px',
    fontSize: '12px',
    borderRight: border,
    borderBottom: border,
  }

  return (
    <Card>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ tableLayout: 'fixed', width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <colgroup>
            <col style={{ width: '120px' }} />
            <col style={{ width: '68px' }} />
            <col style={{ width: '68px' }} />
            <col style={{ width: '68px' }} />
            <col style={{ width: '68px' }} />
            <col style={{ width: '68px' }} />
            <col style={{ width: '72px' }} />
            <col style={{ width: '50px' }} />
          </colgroup>
          <thead>
            <tr style={{ background: '#1e293b', color: '#fff' }}>
              <th style={{ ...thStyle, textAlign: 'left', paddingLeft: '10px' }}>Bölge</th>
              <th style={thStyle}>Toplama</th>
              <th style={thStyle}>Kasalama</th>
              <th style={thStyle}>Sevkiyat</th>
              <th style={thStyle}>DAB Top.</th>
              <th style={thStyle}>DAB Ramp</th>
              <th style={{ ...thStyle, background: '#1e3a5f' }}>Toplam</th>
              <th style={{ ...thStyle, background: '#1e2d6b', borderRight: 'none' }}>Palet</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((s, idx) => (
              <tr
                key={s.bolge}
                onClick={() => onRegionClick(s.bolge)}
                style={{ cursor: 'pointer', background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}
              >
                <td style={{ ...tdBase, textAlign: 'left', paddingLeft: '10px', fontWeight: 600, whiteSpace: 'nowrap', color: '#1e293b' }}>{s.bolge}</td>
                <td style={{ ...tdBase, ...heatBg(s.toplama, mx.toplama) }}>{fmt(s.toplama)}</td>
                <td style={{ ...tdBase, ...heatBg(s.kasalama, mx.kasalama) }}>{fmt(s.kasalama)}</td>
                <td style={{ ...tdBase, ...heatBg(s.sevkiyatKasa, mx.sevkiyatKasa) }}>{fmt(s.sevkiyatKasa)}</td>
                <td style={{ ...tdBase, ...heatBg(s.dabToplama, mx.dabToplama) }}>{fmt(s.dabToplama)}</td>
                <td style={{ ...tdBase, ...heatBg(s.dabRamp, mx.dabRamp) }}>{fmt(s.dabRamp)}</td>
                <td style={{ ...tdBase, fontWeight: 700, ...heatBg(s.toplam, mx.toplam) }}>{fmt(s.toplam)}</td>
                <td style={{ ...tdBase, fontWeight: 700, borderRight: 'none', ...heatBg(s.paletSayisi, mx.palet) }}>{s.paletSayisi}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#1e293b', color: '#fff', fontWeight: 700 }}>
              <td style={{ ...tdBase, textAlign: 'left', paddingLeft: '10px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: 'none' }}>Toplam</td>
              <td style={{ ...tdBase, borderBottom: 'none' }}>{fmt(totals.toplama)}</td>
              <td style={{ ...tdBase, borderBottom: 'none' }}>{fmt(totals.kasalama)}</td>
              <td style={{ ...tdBase, borderBottom: 'none' }}>{fmt(totals.sevkiyatKasa)}</td>
              <td style={{ ...tdBase, borderBottom: 'none' }}>{fmt(totals.dabToplama)}</td>
              <td style={{ ...tdBase, borderBottom: 'none' }}>{fmt(totals.dabRamp)}</td>
              <td style={{ ...tdBase, background: '#1e3a5f', borderBottom: 'none' }}>{fmt(totals.toplam)}</td>
              <td style={{ ...tdBase, background: '#1e2d6b', borderRight: 'none', borderBottom: 'none' }}>{fmt(totals.paletSayisi)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  )
}

/* ─────────────────── Region Detail Modal ─────────────────── */

function RegionDetailModal({ bolge, orders, onClose }: { bolge: string; orders: OrderRow[]; onClose: () => void }) {
  const storeGroups = new Map<string, { ad: string; orders: OrderRow[] }>()
  for (const order of orders) {
    const key = order.magazaKodu || 'Bilinmiyor'
    if (!storeGroups.has(key)) {
      storeGroups.set(key, { ad: getStoreName(order), orders: [] })
    }
    storeGroups.get(key)!.orders.push(order)
  }

  const sortedStores = Array.from(storeGroups.entries()).sort((a, b) => b[1].orders.length - a[1].orders.length)

  const stageLabels: Record<string, string> = {
    toplama: 'Toplama',
    kasalama: 'Kasalama',
    sevkiyat: 'Sevkiyat',
    dabToplama: 'DAB Toplama',
    dabRamp: 'DAB Ramp',
  }

  let buyuk = 0,
    kucuk = 0,
    muhtelif = 0
  for (const order of orders) {
    const kasa = order.kasaTipi.toUpperCase()
    if (kasa.includes('BÜYÜK') || kasa.includes('BUYUK')) buyuk++
    else if (kasa.includes('KÜÇÜK') || kasa.includes('KUCUK')) kucuk++
    else if (kasa.includes('MUHTELİF') || kasa.includes('MUHTELIF')) muhtelif++
  }

  return (
    <div className="drawer">
      <div className="drawer__overlay" onClick={onClose} />
      <div className="drawer__panel" style={{ maxWidth: '56rem' }}>
        <header className="drawer__header">
          <div>
            <h3>{bolge}</h3>
            <p className="muted-text">{orders.length} kasa / {sortedStores.length} magaza</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>Kapat</Button>
        </header>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', padding: '1rem' }}>
          <StatChip label="Buyuk Kasa" value={buyuk} sub="B. Kasa" accent="#3b82f6" />
          <StatChip label="Kucuk Kasa" value={kucuk} sub="K. Kasa" accent="#10b981" />
          <StatChip label="Muhtelif Koli" value={muhtelif} sub="Koli" accent="#f59e0b" />
        </div>

        {/* Store list */}
        <div style={{ padding: '1rem', overflowY: 'auto', flex: 1 }}>
          <p className="muted-text" style={{ marginBottom: '0.75rem', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem' }}>
            Magaza Bazli Dagilim
          </p>
          {sortedStores.map(([kod, { ad, orders: storeOrders }]) => {
            const stageCounts = new Map<string, number>()
            for (const o of storeOrders) {
              const stage = classifyLocation(o.lokasyon, o.depo)
              stageCounts.set(stage, (stageCounts.get(stage) || 0) + 1)
            }

            return (
              <div
                key={kod}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  marginBottom: '0.5rem',
                  background: 'var(--color-surface-alt, #f9fafb)',
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad}</p>
                  <p className="muted-text" style={{ fontSize: '0.75rem' }}>Kod: {kod}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '1rem' }}>
                  {Array.from(stageCounts.entries()).map(([stage, count]) => (
                    <span key={stage} className={`badge badge--${stage === 'sevkiyat' ? 'info' : stage === 'kasalama' ? 'warning' : 'success'}`}>
                      {stageLabels[stage] || stage}: {count}
                    </span>
                  ))}
                  <strong>{storeOrders.length}</strong>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────── Conveyor Summary ─────────────────── */

interface StoreGroup {
  magazaKodu: string
  magazaAdi: string
  depo: string
  mlps: MlpGroup[]
  buyuk: number
  kucuk: number
  muhtelif: number
  toplam: number
}

interface MlpGroup {
  mlp: string
  lokasyon: string
  buyuk: number
  kucuk: number
  muhtelif: number
  toplam: number
}

function ConveyorSummary({ orders }: { orders: OrderRow[] }) {
  const [selectedRegion, setSelectedRegion] = useState('')

  const availableRegions = useMemo(() => {
    const regionSet = new Set<string>()
    for (const o of orders) {
      const bolge = o.dagitimBolgesi?.trim()
      if (bolge) {
        regionSet.add(bolge)
      } else {
        const kod = parseInt(o.magazaKodu, 10)
        if (!isNaN(kod)) {
          const store = storeMap.get(kod)
          if (store) regionSet.add(store.bolge)
          else regionSet.add('Bilinmiyor')
        } else {
          regionSet.add('Bilinmiyor')
        }
      }
    }
    return Array.from(regionSet).sort((a, b) => {
      const ia = REGIONS.indexOf(a)
      const ib = REGIONS.indexOf(b)
      if (ia >= 0 && ib >= 0) return ia - ib
      if (ia >= 0) return -1
      if (ib >= 0) return 1
      return a.localeCompare(b, 'tr')
    })
  }, [orders])

  const filteredOrders = useMemo(() => {
    if (!selectedRegion) return []
    return orders.filter((o) => {
      const bolge = o.dagitimBolgesi?.trim()
      if (bolge) return bolge === selectedRegion
      const kod = parseInt(o.magazaKodu, 10)
      if (!isNaN(kod)) {
        const store = storeMap.get(kod)
        return store ? store.bolge === selectedRegion : selectedRegion === 'Bilinmiyor'
      }
      return selectedRegion === 'Bilinmiyor'
    })
  }, [orders, selectedRegion])

  const storeGroups = useMemo((): StoreGroup[] => {
    const map = new Map<
      string,
      {
        magazaKodu: string
        magazaAdi: string
        depo: string
        mlpMap: Map<string, { lokasyon: string; buyuk: number; kucuk: number; muhtelif: number; toplam: number }>
        buyuk: number
        kucuk: number
        muhtelif: number
        toplam: number
      }
    >()

    for (const row of filteredOrders) {
      const storeKey = row.magazaKodu || 'unknown'
      if (!map.has(storeKey)) {
        const kod = parseInt(row.magazaKodu, 10)
        const storeName = !isNaN(kod) ? storeMap.get(kod)?.ad || '' : ''
        map.set(storeKey, {
          magazaKodu: row.magazaKodu,
          magazaAdi: storeName || row.magazaAdi || '',
          depo: row.depo,
          mlpMap: new Map(),
          buyuk: 0,
          kucuk: 0,
          muhtelif: 0,
          toplam: 0,
        })
      }
      const store = map.get(storeKey)!

      const mlpKey = row.mlp || 'no-mlp'
      if (!store.mlpMap.has(mlpKey)) {
        store.mlpMap.set(mlpKey, { lokasyon: row.lokasyon, buyuk: 0, kucuk: 0, muhtelif: 0, toplam: 0 })
      }
      const mlp = store.mlpMap.get(mlpKey)!

      const kasa = row.kasaTipi.toUpperCase()
      if (kasa.includes('BÜYÜK') || kasa.includes('BUYUK')) {
        mlp.buyuk++
        store.buyuk++
      } else if (kasa.includes('KÜÇÜK') || kasa.includes('KUCUK')) {
        mlp.kucuk++
        store.kucuk++
      } else {
        mlp.muhtelif++
        store.muhtelif++
      }
      mlp.toplam++
      store.toplam++
    }

    return Array.from(map.values())
      .map((s) => ({
        magazaKodu: s.magazaKodu,
        magazaAdi: s.magazaAdi,
        depo: s.depo,
        mlps: Array.from(s.mlpMap.entries()).map(([mlp, d]) => ({ mlp, ...d })),
        buyuk: s.buyuk,
        kucuk: s.kucuk,
        muhtelif: s.muhtelif,
        toplam: s.toplam,
      }))
      .sort((a, b) => b.toplam - a.toplam)
  }, [filteredOrders])

  const regionTotals = useMemo(() => {
    let buyuk = 0,
      kucuk = 0,
      muhtelif = 0
    for (const s of storeGroups) {
      buyuk += s.buyuk
      kucuk += s.kucuk
      muhtelif += s.muhtelif
    }
    return { buyuk, kucuk, muhtelif, toplam: buyuk + kucuk + muhtelif, magaza: storeGroups.length }
  }, [storeGroups])

  return (
    <div className="page-stack">
      {/* Region Selector */}
      <Card title="Bolge Sec">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0.5rem 0' }}>
          {availableRegions.map((r) => (
            <Button key={r} variant={selectedRegion === r ? 'primary' : 'secondary'} size="sm" onClick={() => setSelectedRegion(r)}>
              {r}
            </Button>
          ))}
        </div>
      </Card>

      {!selectedRegion && (
        <Card>
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <p className="muted-text">Detaylari gormek icin bir bolge secin</p>
          </div>
        </Card>
      )}

      {selectedRegion && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
            <StatChip label="Magaza" value={regionTotals.magaza} sub="toplam magaza" accent="#64748b" />
            <StatChip label="Buyuk Kasa" value={regionTotals.buyuk} sub="B. Kasa" accent="#3b82f6" />
            <StatChip label="Kucuk Kasa" value={regionTotals.kucuk} sub="K. Kasa" accent="#10b981" />
            <StatChip label="Muhtelif Koli" value={regionTotals.muhtelif} sub="Koli" accent="#f59e0b" />
          </div>

          <Card
            actions={
              <Button variant="secondary" size="sm" onClick={() => {
                const wb = XLSX.utils.book_new()
                const rows = storeGroups.flatMap(store =>
                  store.mlps.map(mlp => ({
                    'Depo': store.depo,
                    'Magaza': store.magazaAdi || store.magazaKodu,
                    'Magaza Kodu': store.magazaKodu,
                    'PLT No': mlp.mlp || '-',
                    'Lokasyon': mlp.lokasyon || '-',
                    'Buyuk Kasa': mlp.buyuk,
                    'Kucuk Kasa': mlp.kucuk,
                    'Muhtelif Koli': mlp.muhtelif,
                    'Toplam': mlp.toplam,
                  }))
                )
                const ws = XLSX.utils.json_to_sheet(rows)
                XLSX.utils.book_append_sheet(wb, ws, selectedRegion.substring(0, 31))
                XLSX.writeFile(wb, `${selectedRegion}_detay_${new Date().toISOString().slice(0,10)}.xlsx`)
              }}>
                Excel Indir
              </Button>
            }
          >
            <div style={{ maxHeight: '520px', overflowY: 'auto' }}>
              <table style={{ tableLayout: 'fixed', width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <colgroup>
                  <col style={{ width: '58px' }} />
                  <col style={{ width: '180px' }} />
                  <col style={{ width: '130px' }} />
                  <col style={{ width: '88px' }} />
                  <col style={{ width: '66px' }} />
                  <col style={{ width: '66px' }} />
                  <col style={{ width: '66px' }} />
                  <col style={{ width: '66px' }} />
                </colgroup>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr style={{ background: '#1e293b', color: '#fff' }}>
                    {[
                      { label: 'DEPO',    align: 'center' },
                      { label: 'MAGAZA',  align: 'left'   },
                      { label: 'PLT NO',  align: 'center' },
                      { label: 'LOKASYON',align: 'center' },
                      { label: 'B. KASA', align: 'center' },
                      { label: 'K. KASA', align: 'center' },
                      { label: 'KOLI',    align: 'center' },
                      { label: 'TOPLAM',  align: 'center' },
                    ].map((col, i) => (
                      <th key={col.label} style={{
                        textAlign: col.align as React.CSSProperties['textAlign'],
                        padding: '6px 8px',
                        fontSize: '10px',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        borderRight: i < 7 ? '1px solid #334155' : 'none',
                      }}>{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {storeGroups.map((store, sIdx) =>
                    store.mlps.map((mlp, mIdx) => {
                      const rowBg = sIdx % 2 === 0 ? '#fff' : '#f8fafc'
                      const cellStyle: React.CSSProperties = {
                        padding: '4px 8px',
                        borderBottom: '1px solid #e2e8f0',
                        borderRight: '1px solid #e2e8f0',
                        verticalAlign: 'middle',
                        textAlign: 'center',
                        fontSize: '12px',
                        background: rowBg,
                      }
                      return (
                        <tr key={`${store.magazaKodu}-${mlp.mlp}`}>
                          {mIdx === 0 && (
                            <>
                              <td rowSpan={store.mlps.length} style={{ ...cellStyle, fontWeight: 700, verticalAlign: 'top', paddingTop: '6px' }}>
                                {store.depo}
                              </td>
                              <td rowSpan={store.mlps.length} style={{ ...cellStyle, textAlign: 'left', verticalAlign: 'top', paddingTop: '6px' }}>
                                <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {store.magazaAdi || '-'}
                                </div>
                                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '1px' }}>{store.magazaKodu}</div>
                              </td>
                            </>
                          )}
                          <td style={{ ...cellStyle, fontFamily: 'monospace', fontSize: '11px' }}>{mlp.mlp || '-'}</td>
                          <td style={{ ...cellStyle }}>
                            <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.03em' }}>
                              {mlp.lokasyon || '-'}
                            </span>
                          </td>
                          <td style={{ ...cellStyle, fontWeight: mlp.buyuk > 0 ? 700 : 400, color: mlp.buyuk > 0 ? '#2563eb' : '#cbd5e1' }}>
                            {mlp.buyuk || '0'}
                          </td>
                          <td style={{ ...cellStyle, fontWeight: mlp.kucuk > 0 ? 700 : 400, color: mlp.kucuk > 0 ? '#059669' : '#cbd5e1' }}>
                            {mlp.kucuk || '0'}
                          </td>
                          <td style={{ ...cellStyle, fontWeight: mlp.muhtelif > 0 ? 700 : 400, color: mlp.muhtelif > 0 ? '#d97706' : '#cbd5e1' }}>
                            {mlp.muhtelif || '0'}
                          </td>
                          <td style={{ ...cellStyle, fontWeight: 700, borderRight: 'none', background: mlp.toplam > 0 ? (sIdx % 2 === 0 ? '#f0f9ff' : '#e0f2fe') : rowBg }}>
                            {mlp.toplam}
                          </td>
                        </tr>
                      )
                    }),
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#1e293b', color: '#fff', fontWeight: 700, fontSize: '11px' }}>
                    <td colSpan={2} style={{ padding: '6px 8px', borderRight: '1px solid #334155' }}>
                      Toplam ({storeGroups.length} magaza)
                    </td>
                    <td style={{ textAlign: 'center', padding: '6px 8px', borderRight: '1px solid #334155' }}>
                      {storeGroups.reduce((a, s) => a + s.mlps.length, 0)} PLT
                    </td>
                    <td style={{ textAlign: 'center', padding: '6px 8px', borderRight: '1px solid #334155' }}>-</td>
                    <td style={{ textAlign: 'center', padding: '6px 8px', borderRight: '1px solid #334155' }}>{regionTotals.buyuk}</td>
                    <td style={{ textAlign: 'center', padding: '6px 8px', borderRight: '1px solid #334155' }}>{regionTotals.kucuk}</td>
                    <td style={{ textAlign: 'center', padding: '6px 8px', borderRight: '1px solid #334155' }}>{regionTotals.muhtelif}</td>
                    <td style={{ textAlign: 'center', padding: '6px 8px' }}>{regionTotals.toplam}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

/* ─────────────────── Helpers ─────────────────── */

/* ─────────────────── StatChip ─────────────────── */

function StatChip({ label, value, sub, accent }: { label: string; value: number | string; sub: string; accent: string }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: '0.625rem',
      padding: '0.75rem 1rem',
      borderTop: `3px solid ${accent}`,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.125rem',
    }}>
      <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>{label}</span>
      <strong style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>{value}</strong>
      <span style={{ fontSize: '11px', color: '#94a3b8' }}>{sub}</span>
    </div>
  )
}

function getStoreName(order: OrderRow): string {
  if (order.magazaAdi && order.magazaAdi.trim()) return order.magazaAdi
  const kod = parseInt(order.magazaKodu, 10)
  if (!isNaN(kod)) {
    const store = storeMap.get(kod)
    if (store) return store.ad
  }
  return order.magazaKodu || 'Bilinmiyor'
}
