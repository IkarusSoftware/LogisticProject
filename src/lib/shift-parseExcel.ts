import * as XLSX from 'xlsx'
import type { OrderRow } from './shift-types'
import { COLUMN_MAP } from './shift-constants'

function normalizeHeader(header: string): string {
  return header.toLowerCase().trim().replace(/\s+/g, ' ')
}

function deriveKasaTipiFromLP(lp: string): string {
  if (!lp) return ''
  const prefix = lp.trim().charAt(0).toUpperCase()
  if (prefix === 'B') return 'BÜYÜK KASA'
  if (prefix === 'K') return 'KÜÇÜK KASA'
  return 'MUHTELİF KOLİ'
}

function cleanShipToCode(code: string): string {
  if (!code) return ''
  return String(parseInt(code, 10) || code)
}

function mapRow(row: Record<number, unknown>, headerMap: Record<number, string>, isKonveyor: boolean): OrderRow | null {
  const mapped: Partial<OrderRow> = {}

  for (const [colIdx, fieldName] of Object.entries(headerMap)) {
    const value = row[Number(colIdx)]
    if (value !== undefined && value !== null) {
      ;(mapped as Record<string, string>)[fieldName] = String(value).trim()
    }
  }

  if (isKonveyor) {
    if (!mapped.kasaTipi && mapped.lp) {
      mapped.kasaTipi = deriveKasaTipiFromLP(mapped.lp)
    }
    if (mapped.magazaKodu) {
      mapped.magazaKodu = cleanShipToCode(mapped.magazaKodu)
    }
  }

  if (!mapped.magazaKodu && !mapped.dagitimBolgesi) return null
  if (!isKonveyor && !mapped.kasaTipi) return null
  if (isKonveyor && !mapped.kasaTipi) mapped.kasaTipi = 'MUHTELİF KOLİ'

  return {
    siparisTarihi: mapped.siparisTarihi || '',
    siparisNo: mapped.siparisNo || '',
    magazaKodu: mapped.magazaKodu || '',
    depo: mapped.depo || '',
    dalgaKimligi: mapped.dalgaKimligi || '',
    lp: mapped.lp || '',
    lokasyon: mapped.lokasyon || '',
    mlp: mapped.mlp || '',
    kapsayiciKimligi: mapped.kapsayiciKimligi || '',
    siparisNumarasi: mapped.siparisNumarasi || '',
    dagitimBolgesi: mapped.dagitimBolgesi || '',
    magazaAdi: mapped.magazaAdi || '',
    waveNumarasi: mapped.waveNumarasi || '',
    kasaTipi: mapped.kasaTipi || '',
  }
}

function parseSheet(ws: XLSX.WorkSheet, depoTag: string): OrderRow[] {
  const data = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' })
  if (data.length < 2) return []

  let headerRowIdx = 0
  let headerMap: Record<number, string> = {}
  let isKonveyor = false

  for (let i = 0; i < Math.min(5, data.length); i++) {
    const row = data[i] as string[]
    const map: Record<number, string> = {}
    let matchCount = 0
    let hasShipToCode = false

    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] || '')
      const normalized = normalizeHeader(cell)
      const field = COLUMN_MAP[normalized]
      if (field) {
        map[j] = field
        matchCount++
        if (normalized === 'ship to code') hasShipToCode = true
      }
    }

    if (matchCount >= 3) {
      headerRowIdx = i
      headerMap = map
      isKonveyor = hasShipToCode
      break
    }
  }

  if (Object.keys(headerMap).length === 0) return []

  const orders: OrderRow[] = []
  for (let i = headerRowIdx + 1; i < data.length; i++) {
    const row = data[i] as unknown[]
    const rowObj: Record<number, unknown> = {}
    row.forEach((val, idx) => {
      rowObj[idx] = val
    })

    const order = mapRow(rowObj, headerMap, isKonveyor)
    if (order) {
      if (depoTag) order.depo = depoTag
      orders.push(order)
    }
  }

  return orders
}

export function parseExcelFile(buffer: ArrayBuffer, depoHint?: string): { orders: OrderRow[]; sheetNames: string[] } {
  const wb = XLSX.read(buffer, { type: 'array' })
  const allOrders: OrderRow[] = []
  const sheetNames: string[] = wb.SheetNames

  for (const name of wb.SheetNames) {
    const nameLower = name.toLowerCase().trim()

    let depoTag = depoHint || ''
    if (!depoTag) {
      if (nameLower.includes('130')) depoTag = '130'
      else if (nameLower.includes('190')) depoTag = '190'
    }

    const isDataSheet = nameLower.includes('data') || nameLower.includes('130') || nameLower.includes('190')
    const isGenericSheet = nameLower === 'sheet1' || nameLower === 'sayfa1'

    if (isDataSheet || isGenericSheet) {
      const ws = wb.Sheets[name]
      const orders = parseSheet(ws, depoTag)
      allOrders.push(...orders)
    }
  }

  return { orders: allOrders, sheetNames }
}
