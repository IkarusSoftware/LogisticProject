import { useState, useMemo, useCallback, useRef } from 'react'
import { read, utils } from 'xlsx'
import { Card, PageHeader } from '../components/ui'

interface RampaRow {
  sira: string
  magazaKodu: string
  magazaAdi: string
  siparisNo: string
  lokasyon: string
  mlp: string
  kasaSayisi: number
  sonIslemTarihi: string
  bolge: string
  denetleyen: string
}

type DenetimFilter = 'all' | 'inspected' | 'not_inspected'
type SortKey = 'sonIslemTarihi' | 'bolge' | 'lokasyon' | 'denetleyen' | 'kasaSayisi' | 'magazaKodu' | null
type SortDir = 'asc' | 'desc'

function parseDateStr(s: string): number {
  // "13.03.2026 09:30:36" → timestamp
  const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/)
  if (!m) return 0
  return new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +m[6]).getTime()
}

function compareRows(a: RampaRow, b: RampaRow, key: SortKey, dir: SortDir): number {
  if (!key) return 0
  let cmp = 0
  switch (key) {
    case 'sonIslemTarihi':
      cmp = parseDateStr(a.sonIslemTarihi) - parseDateStr(b.sonIslemTarihi)
      break
    case 'kasaSayisi':
      cmp = a.kasaSayisi - b.kasaSayisi
      break
    case 'magazaKodu':
      cmp = parseInt(a.magazaKodu, 10) - parseInt(b.magazaKodu, 10)
      break
    case 'bolge':
      cmp = a.bolge.localeCompare(b.bolge, 'tr')
      break
    case 'lokasyon':
      cmp = a.lokasyon.localeCompare(b.lokasyon, 'tr')
      break
    case 'denetleyen': {
      const da = a.denetleyen || '\uffff'
      const db = b.denetleyen || '\uffff'
      cmp = da.localeCompare(db, 'tr')
      break
    }
  }
  return dir === 'desc' ? -cmp : cmp
}

function parseRampaExcel(buffer: ArrayBuffer): RampaRow[] {
  const wb = read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw = utils.sheet_to_json<string[]>(ws, { header: 1 })
  const rows: RampaRow[] = []
  for (let i = 1; i < raw.length; i++) {
    const r = raw[i]
    if (!r || !r[1]) continue
    rows.push({
      sira: (r[0] ?? '').toString(),
      magazaKodu: (r[1] ?? '').toString().replace(/^0+/, ''),
      magazaAdi: (r[2] ?? '').toString(),
      siparisNo: (r[3] ?? '').toString(),
      lokasyon: (r[4] ?? '').toString(),
      mlp: (r[5] ?? '').toString(),
      kasaSayisi: parseInt(r[6]?.toString() ?? '0', 10) || 0,
      sonIslemTarihi: (r[7] ?? '').toString(),
      bolge: (r[8] ?? '').toString(),
      denetleyen: (r[9] ?? '').toString().trim(),
    })
  }
  return rows
}

function extractDate(dateTimeStr: string): string {
  const match = dateTimeStr.match(/^(\d{2}\.\d{2}\.\d{4})/)
  return match ? match[1] : ''
}

function isEcommerce(siparisNo: string): boolean {
  return siparisNo.startsWith('PR')
}

/** Deduplicate e-commerce rows: keep only the first occurrence per MLP */
function deduplicateEcommerce(rows: RampaRow[]): RampaRow[] {
  const seenMlp = new Set<string>()
  const result: RampaRow[] = []
  for (const r of rows) {
    if (isEcommerce(r.siparisNo)) {
      if (seenMlp.has(r.mlp)) continue
      seenMlp.add(r.mlp)
    }
    result.push(r)
  }
  return result
}

function SortTh({ label, colKey, current, dir, onSort, style }: {
  label: string
  colKey: SortKey
  current: SortKey
  dir: SortDir
  onSort: (k: SortKey) => void
  style: React.CSSProperties
}) {
  const active = current === colKey
  return (
    <th
      style={{ ...style, textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
      onClick={() => onSort(colKey)}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', justifyContent: 'center' }}>
        {label}
        <span style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 1, fontSize: '7px', marginLeft: '2px' }}>
          <span style={{ opacity: active && dir === 'asc' ? 1 : 0.3 }}>{'\u25B2'}</span>
          <span style={{ opacity: active && dir === 'desc' ? 1 : 0.3, marginTop: '-2px' }}>{'\u25BC'}</span>
        </span>
      </span>
    </th>
  )
}

export function RampaKontrolPage() {
  const [rawRows, setRawRows] = useState<RampaRow[]>([])
  const [dragging, setDragging] = useState(false)
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [denetimFilter, setDenetimFilter] = useState<DenetimFilter>('all')
  const [lokasyonFilter, setLokasyonFilter] = useState('')
  const [bolgeFilter, setBolgeFilter] = useState('')
  const [showEcommerce, setShowEcommerce] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const fileRef = useRef<HTMLInputElement>(null)

  const toggleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === 'asc') {
        setSortDir('desc')
      } else {
        // 3rd click: reset
        setSortKey(null)
        setSortDir('asc')
      }
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }, [sortKey, sortDir])

  const rows = useMemo(() => deduplicateEcommerce(rawRows), [rawRows])

  const handleFile = useCallback(async (file: File) => {
    const buffer = await file.arrayBuffer()
    const parsed = parseRampaExcel(buffer)
    setRawRows(parsed)
    setDateFilter('')
    setDenetimFilter('all')
    setLokasyonFilter('')
    setBolgeFilter('')
    setSearch('')
    setSortKey(null)
    setSortDir('asc')
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const onFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const uniqueDates = useMemo(() => {
    const set = new Set<string>()
    for (const r of rows) {
      const d = extractDate(r.sonIslemTarihi)
      if (d) set.add(d)
    }
    return [...set].sort((a, b) => {
      const [da, ma, ya] = a.split('.').map(Number)
      const [db, mb, yb] = b.split('.').map(Number)
      return (ya - yb) || (ma - mb) || (da - db)
    })
  }, [rows])

  const uniqueLokasyonlar = useMemo(() => {
    const set = new Set<string>()
    for (const r of rows) if (r.lokasyon) set.add(r.lokasyon)
    return [...set].sort()
  }, [rows])

  const uniqueBolgeler = useMemo(() => {
    const set = new Set<string>()
    for (const r of rows) if (r.bolge) set.add(r.bolge)
    return [...set].sort((a, b) => a.localeCompare(b, 'tr'))
  }, [rows])

  const filtered = useMemo(() => {
    let result = rows
    if (!showEcommerce) {
      result = result.filter((r) => !isEcommerce(r.siparisNo))
    }
    if (dateFilter) {
      result = result.filter((r) => extractDate(r.sonIslemTarihi) === dateFilter)
    }
    if (denetimFilter === 'inspected') {
      result = result.filter((r) => r.denetleyen !== '')
    } else if (denetimFilter === 'not_inspected') {
      result = result.filter((r) => r.denetleyen === '')
    }
    if (lokasyonFilter) {
      result = result.filter((r) => r.lokasyon === lokasyonFilter)
    }
    if (bolgeFilter) {
      result = result.filter((r) => r.bolge === bolgeFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (r) =>
          r.magazaKodu.includes(q) ||
          r.magazaAdi.toLowerCase().includes(q) ||
          r.siparisNo.toLowerCase().includes(q) ||
          r.mlp.toLowerCase().includes(q) ||
          r.bolge.toLowerCase().includes(q) ||
          r.denetleyen.includes(q),
      )
    }
    if (sortKey) {
      result = [...result].sort((a, b) => compareRows(a, b, sortKey, sortDir))
    }
    return result
  }, [rows, showEcommerce, dateFilter, denetimFilter, lokasyonFilter, bolgeFilter, search, sortKey, sortDir])

  const stats = useMemo(() => {
    const totalKasa = filtered.reduce((s, r) => s + r.kasaSayisi, 0)
    const nonEcom = filtered.filter((r) => !isEcommerce(r.siparisNo))
    const ecomCount = filtered.length - nonEcom.length
    const denetlenen = nonEcom.filter((r) => r.denetleyen !== '').length
    const denetlenmeyen = nonEcom.length - denetlenen
    return { totalKasa, denetlenen, denetlenmeyen, ecomCount }
  }, [filtered])

  const border = '1px solid #e2e8f0'
  const thStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '6px 8px',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    borderRight: border,
    whiteSpace: 'nowrap',
  }
  const tdStyle: React.CSSProperties = {
    padding: '6px 8px',
    fontSize: '12px',
    borderBottom: border,
    borderRight: border,
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Rampa Yonetimi"
        title="Rampa Kontrol"
        description="Rampa lokasyonunda bekleyen palet ve kasalari goruntuleyip denetim durumuna gore filtreleyebilirsiniz."
      />

      {rows.length === 0 ? (
        <Card>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? '#3b82f6' : '#cbd5e1'}`,
              borderRadius: '12px',
              padding: '3rem 2rem',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragging ? '#eff6ff' : '#f8fafc',
              transition: 'all 0.2s',
            }}
          >
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
              Rampa Excel dosyasini surukleyip birakin
            </p>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>
              veya tiklayarak dosya secin (.xlsx)
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={onFileInput}
              style={{ display: 'none' }}
            />
          </div>
        </Card>
      ) : (
        <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
            {[
              { label: 'Toplam Kayit', value: filtered.length, color: '#3b82f6' },
              { label: 'Toplam Kasa', value: stats.totalKasa, color: '#8b5cf6' },
              { label: 'Denetlenen', value: stats.denetlenen, color: '#22c55e' },
              { label: 'Denetlenmeyen', value: stats.denetlenmeyen, color: '#ef4444' },
              { label: 'E-Ticaret', value: stats.ecomCount, color: '#d946ef' },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  background: '#fff',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  borderTop: `3px solid ${s.color}`,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                }}
              >
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  {s.label}
                </div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                  {s.value.toLocaleString('tr-TR')}
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Magaza, siparis no, MLP veya bolge ile ara..."
                style={{ flex: 1, minWidth: '200px', padding: '6px 12px', border, borderRadius: '6px', fontSize: '13px' }}
              />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                style={{ padding: '6px 10px', border, borderRadius: '6px', fontSize: '13px', background: '#fff' }}
              >
                <option value="">Tum tarihler</option>
                {uniqueDates.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <select
                value={lokasyonFilter}
                onChange={(e) => setLokasyonFilter(e.target.value)}
                style={{ padding: '6px 10px', border, borderRadius: '6px', fontSize: '13px', background: '#fff' }}
              >
                <option value="">Tum lokasyonlar</option>
                {uniqueLokasyonlar.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
              <select
                value={bolgeFilter}
                onChange={(e) => setBolgeFilter(e.target.value)}
                style={{ padding: '6px 10px', border, borderRadius: '6px', fontSize: '13px', background: '#fff' }}
              >
                <option value="">Tum bolgeler</option>
                {uniqueBolgeler.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              <select
                value={denetimFilter}
                onChange={(e) => setDenetimFilter(e.target.value as DenetimFilter)}
                style={{ padding: '6px 10px', border, borderRadius: '6px', fontSize: '13px', background: '#fff' }}
              >
                <option value="all">Tum denetim</option>
                <option value="inspected">Denetlenmis</option>
                <option value="not_inspected">Denetlenmemis</option>
              </select>
              <button
                type="button"
                onClick={() => setShowEcommerce((v) => !v)}
                style={{
                  padding: '6px 12px',
                  border: '1px solid',
                  borderColor: showEcommerce ? '#3b82f6' : '#e2e8f0',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: showEcommerce ? '#eff6ff' : '#fff',
                  color: showEcommerce ? '#1d4ed8' : '#64748b',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {showEcommerce ? 'E-Ticaret Gizle' : 'E-Ticaret Goster'}
              </button>
              <button
                type="button"
                onClick={() => { setRawRows([]); setSearch(''); setDateFilter(''); setDenetimFilter('all'); setLokasyonFilter(''); setBolgeFilter(''); setShowEcommerce(true); setSortKey(null); setSortDir('asc') }}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: '#fff',
                  color: '#64748b',
                  cursor: 'pointer',
                }}
              >
                Yeni Dosya Yukle
              </button>
              <span style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                {filtered.length} / {rows.length} kayit
              </span>
            </div>
          </Card>

          {/* Table */}
          <Card>
            <div style={{ maxHeight: '560px', overflowY: 'auto' }}>
              <table style={{ tableLayout: 'fixed', width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <colgroup>
                  <col style={{ width: '38px' }} />
                  <col style={{ width: '68px' }} />
                  <col />
                  <col style={{ width: '140px' }} />
                  <col style={{ width: '90px' }} />
                  <col style={{ width: '125px' }} />
                  <col style={{ width: '48px' }} />
                  <col style={{ width: '140px' }} />
                  <col style={{ width: '95px' }} />
                  <col style={{ width: '78px' }} />
                </colgroup>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr style={{ background: '#1e293b', color: '#fff' }}>
                    <th style={{ ...thStyle, textAlign: 'center' }}>#</th>
                    <SortTh label="M.KODU" colKey="magazaKodu" current={sortKey} dir={sortDir} onSort={toggleSort} style={thStyle} />
                    <th style={{ ...thStyle, textAlign: 'center' }}>MAGAZA ADI</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>SIPARIS NO</th>
                    <SortTh label="LOKASYON" colKey="lokasyon" current={sortKey} dir={sortDir} onSort={toggleSort} style={thStyle} />
                    <th style={{ ...thStyle, textAlign: 'center' }}>MLP</th>
                    <SortTh label="KASA" colKey="kasaSayisi" current={sortKey} dir={sortDir} onSort={toggleSort} style={thStyle} />
                    <SortTh label="SON ISLEM" colKey="sonIslemTarihi" current={sortKey} dir={sortDir} onSort={toggleSort} style={thStyle} />
                    <SortTh label="BOLGE" colKey="bolge" current={sortKey} dir={sortDir} onSort={toggleSort} style={thStyle} />
                    <SortTh label="DENETIM" colKey="denetleyen" current={sortKey} dir={sortDir} onSort={toggleSort} style={{ ...thStyle, borderRight: 'none' }} />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, idx) => (
                    <tr key={`${r.sira}-${idx}`} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                      <td style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8', fontSize: '11px' }}>{r.sira}</td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, fontFamily: 'monospace' }}>{r.magazaKodu}</td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 500 }}>{r.magazaAdi}</td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontFamily: 'monospace', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', justifyContent: 'center' }}>
                          {r.siparisNo}
                          {isEcommerce(r.siparisNo) && (
                            <span style={{ fontSize: '8px', padding: '1px 3px', borderRadius: '3px', background: '#f0abfc', color: '#701a75', fontWeight: 700, lineHeight: 1.2, flexShrink: 0 }}>
                              E-TIC
                            </span>
                          )}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <span style={{
                          fontSize: '10px', padding: '2px 5px', borderRadius: '4px', fontWeight: 600, whiteSpace: 'nowrap',
                          background: r.lokasyon === 'RAMP01' ? '#dbeafe' : r.lokasyon === 'RAMPDAP' ? '#fef3c7' : '#f1f5f9',
                          color: r.lokasyon === 'RAMP01' ? '#1e40af' : r.lokasyon === 'RAMPDAP' ? '#92400e' : '#475569',
                        }}>
                          {r.lokasyon}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontFamily: 'monospace', fontSize: '11px' }}>{r.mlp}</td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>{r.kasaSayisi}</td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontSize: '11px', whiteSpace: 'nowrap' }}>{r.sonIslemTarihi}</td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontSize: '11px' }}>{r.bolge}</td>
                      <td style={{ ...tdStyle, textAlign: 'center', borderRight: 'none' }}>
                        {isEcommerce(r.siparisNo) ? (
                          <span style={{ fontSize: '10px', color: '#94a3b8' }}>—</span>
                        ) : r.denetleyen ? (
                          <span style={{
                            fontSize: '10px', padding: '2px 5px', borderRadius: '4px', fontWeight: 600,
                            background: '#dcfce7', color: '#166534',
                          }}>
                            {r.denetleyen}
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '10px', padding: '2px 5px', borderRadius: '4px', fontWeight: 600,
                            background: '#fee2e2', color: '#991b1b',
                          }}>
                            YOK
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={10} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                        Filtrelere uygun kayit bulunamadi
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
