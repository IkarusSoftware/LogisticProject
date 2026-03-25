import { useState, useCallback, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { Button, Card, MetricCard, PageHeader, InlineMessage } from '../components/ui'
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
        <div className="metric-row">
          <MetricCard label="Toplam Siparis" value={data.totalOrders.toLocaleString('tr-TR')} helper="Benzersiz siparis" tone="info" />
          <MetricCard label="Toplam Kasa" value={data.totalBoxes.toLocaleString('tr-TR')} helper="Tum depolar" tone="success" />
          <MetricCard label="Toplam Palet" value={data.totalPallets.toLocaleString('tr-TR')} helper="24 kasa/palet" tone="warning" />
          <MetricCard label="Aktif Bolge" value={data.regionSummaries.length} helper="Veri iceren bolge" tone="neutral" />
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

  return (
    <Card>
      <div className="table-shell">
        <table className="data-table" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '140px' }} />
            <col style={{ width: '80px' }} />
            <col style={{ width: '80px' }} />
            <col style={{ width: '80px' }} />
            <col style={{ width: '80px' }} />
            <col style={{ width: '80px' }} />
            <col style={{ width: '85px' }} />
            <col style={{ width: '60px' }} />
          </colgroup>
          <thead>
            <tr>
              <th>Bolge</th>
              <th>Toplama</th>
              <th>Kasalama</th>
              <th>Sevkiyat</th>
              <th>DAB Top.</th>
              <th>DAB Ramp</th>
              <th>Toplam</th>
              <th>Palet</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((s) => (
              <tr
                key={s.bolge}
                className="data-table__row"
                onClick={() => onRegionClick(s.bolge)}
                style={{ cursor: 'pointer' }}
              >
                <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{s.bolge}</td>
                <td style={{ textAlign: 'center', ...heatBg(s.toplama, mx.toplama) }}>{fmt(s.toplama)}</td>
                <td style={{ textAlign: 'center', ...heatBg(s.kasalama, mx.kasalama) }}>{fmt(s.kasalama)}</td>
                <td style={{ textAlign: 'center', ...heatBg(s.sevkiyatKasa, mx.sevkiyatKasa) }}>{fmt(s.sevkiyatKasa)}</td>
                <td style={{ textAlign: 'center', ...heatBg(s.dabToplama, mx.dabToplama) }}>{fmt(s.dabToplama)}</td>
                <td style={{ textAlign: 'center', ...heatBg(s.dabRamp, mx.dabRamp) }}>{fmt(s.dabRamp)}</td>
                <td style={{ textAlign: 'center', fontWeight: 700, ...heatBg(s.toplam, mx.toplam) }}>{fmt(s.toplam)}</td>
                <td style={{ textAlign: 'center', fontWeight: 700, ...heatBg(s.paletSayisi, mx.palet) }}>{s.paletSayisi}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: 700 }}>
              <td>Toplam</td>
              <td style={{ textAlign: 'center' }}>{fmt(totals.toplama)}</td>
              <td style={{ textAlign: 'center' }}>{fmt(totals.kasalama)}</td>
              <td style={{ textAlign: 'center' }}>{fmt(totals.sevkiyatKasa)}</td>
              <td style={{ textAlign: 'center' }}>{fmt(totals.dabToplama)}</td>
              <td style={{ textAlign: 'center' }}>{fmt(totals.dabRamp)}</td>
              <td style={{ textAlign: 'center' }}>{fmt(totals.toplam)}</td>
              <td style={{ textAlign: 'center' }}>{fmt(totals.paletSayisi)}</td>
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
        <div className="metric-row" style={{ padding: '1rem' }}>
          <MetricCard label="Buyuk Kasa" value={buyuk} helper="B. Kasa" tone="info" />
          <MetricCard label="Kucuk Kasa" value={kucuk} helper="K. Kasa" tone="success" />
          <MetricCard label="Muhtelif Koli" value={muhtelif} helper="Koli" tone="warning" />
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
          <div className="metric-row">
            <MetricCard label="Magaza" value={regionTotals.magaza} helper="Toplam magaza" tone="neutral" />
            <MetricCard label="Buyuk Kasa" value={regionTotals.buyuk} helper="B. Kasa" tone="info" />
            <MetricCard label="Kucuk Kasa" value={regionTotals.kucuk} helper="K. Kasa" tone="success" />
            <MetricCard label="Muhtelif Koli" value={regionTotals.muhtelif} helper="Koli" tone="warning" />
          </div>

          <Card>
            <div className="table-shell" style={{ maxHeight: '500px', overflowY: 'auto' }}>
              <table className="data-table" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '60px' }} />
                  <col style={{ width: '180px' }} />
                  <col style={{ width: '120px' }} />
                  <col style={{ width: '90px' }} />
                  <col style={{ width: '70px' }} />
                  <col style={{ width: '70px' }} />
                  <col style={{ width: '70px' }} />
                  <col style={{ width: '70px' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Depo</th>
                    <th>Magaza</th>
                    <th>PLT No</th>
                    <th>Lokasyon</th>
                    <th>B. Kasa</th>
                    <th>K. Kasa</th>
                    <th>Koli</th>
                    <th>Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  {storeGroups.map((store) =>
                    store.mlps.map((mlp, mIdx) => (
                      <tr key={`${store.magazaKodu}-${mlp.mlp}`} className="data-table__row">
                        {mIdx === 0 && (
                          <>
                            <td rowSpan={store.mlps.length} style={{ textAlign: 'center', fontWeight: 700, verticalAlign: 'top' }}>
                              {store.depo}
                            </td>
                            <td rowSpan={store.mlps.length} style={{ verticalAlign: 'top' }}>
                              <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {store.magazaAdi || '-'}
                              </div>
                              <div className="muted-text" style={{ fontSize: '0.7rem' }}>{store.magazaKodu}</div>
                            </td>
                          </>
                        )}
                        <td style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: '0.8rem' }}>{mlp.mlp || '-'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge--neutral">{mlp.lokasyon || '-'}</span>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: mlp.buyuk > 0 ? 600 : 400, color: mlp.buyuk > 0 ? 'var(--color-info)' : undefined }}>
                          {mlp.buyuk || '0'}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: mlp.kucuk > 0 ? 600 : 400, color: mlp.kucuk > 0 ? 'var(--color-success)' : undefined }}>
                          {mlp.kucuk || '0'}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: mlp.muhtelif > 0 ? 600 : 400, color: mlp.muhtelif > 0 ? 'var(--color-warning)' : undefined }}>
                          {mlp.muhtelif || '0'}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{mlp.toplam}</td>
                      </tr>
                    )),
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 700 }}>
                    <td colSpan={2}>Toplam ({storeGroups.length} magaza)</td>
                    <td style={{ textAlign: 'center' }}>{storeGroups.reduce((a, s) => a + s.mlps.length, 0)} PLT</td>
                    <td style={{ textAlign: 'center' }}>-</td>
                    <td style={{ textAlign: 'center' }}>{regionTotals.buyuk}</td>
                    <td style={{ textAlign: 'center' }}>{regionTotals.kucuk}</td>
                    <td style={{ textAlign: 'center' }}>{regionTotals.muhtelif}</td>
                    <td style={{ textAlign: 'center' }}>{regionTotals.toplam}</td>
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

function getStoreName(order: OrderRow): string {
  if (order.magazaAdi && order.magazaAdi.trim()) return order.magazaAdi
  const kod = parseInt(order.magazaKodu, 10)
  if (!isNaN(kod)) {
    const store = storeMap.get(kod)
    if (store) return store.ad
  }
  return order.magazaKodu || 'Bilinmiyor'
}
