import type { OrderRow, RegionSummary, ProcessedData, StoreInfo } from './shift-types'
import { REGIONS, PALLET_DIVISOR, classifyLocation } from './shift-constants'
import storesData from '../data/stores.json'

const stores = storesData as StoreInfo[]
const storeMap = new Map<number, StoreInfo>()
stores.forEach((s) => storeMap.set(s.kod, s))

function resolveRegion(row: OrderRow): string {
  if (row.dagitimBolgesi && row.dagitimBolgesi.trim()) {
    return row.dagitimBolgesi.trim()
  }
  const kod = parseInt(row.magazaKodu, 10)
  if (!isNaN(kod)) {
    const store = storeMap.get(kod)
    if (store) return store.bolge
  }
  return 'Bilinmiyor'
}

export function processOrders(orders: OrderRow[]): ProcessedData {
  const regionMap = new Map<string, RegionSummary>()

  for (const bolge of REGIONS) {
    regionMap.set(bolge, {
      bolge,
      toplama: 0,
      kasalama: 0,
      sevkiyatKasa: 0,
      dabToplama: 0,
      dabRamp: 0,
      toplam: 0,
      paletSayisi: 0,
      buyukKasa: 0,
      kucukKasa: 0,
      muhtelifKoli: 0,
    })
  }

  for (const order of orders) {
    const bolge = resolveRegion(order)

    if (!regionMap.has(bolge)) {
      regionMap.set(bolge, {
        bolge,
        toplama: 0,
        kasalama: 0,
        sevkiyatKasa: 0,
        dabToplama: 0,
        dabRamp: 0,
        toplam: 0,
        paletSayisi: 0,
        buyukKasa: 0,
        kucukKasa: 0,
        muhtelifKoli: 0,
      })
    }

    const summary = regionMap.get(bolge)!

    const stage = classifyLocation(order.lokasyon, order.depo)
    switch (stage) {
      case 'toplama':
        summary.toplama++
        break
      case 'kasalama':
        summary.kasalama++
        break
      case 'sevkiyat':
        summary.sevkiyatKasa++
        break
      case 'dabToplama':
        summary.dabToplama++
        break
      case 'dabRamp':
        summary.dabRamp++
        break
    }

    const kasa = order.kasaTipi.toUpperCase().trim()
    if (kasa.includes('BÜYÜK') || kasa.includes('BUYUK')) {
      summary.buyukKasa++
    } else if (kasa.includes('KÜÇÜK') || kasa.includes('KUCUK')) {
      summary.kucukKasa++
    } else if (kasa.includes('MUHTELİF') || kasa.includes('MUHTELIF')) {
      summary.muhtelifKoli++
    }
  }

  let totalBoxes = 0
  let totalPallets = 0

  for (const summary of regionMap.values()) {
    summary.toplam = summary.toplama + summary.kasalama + summary.sevkiyatKasa + summary.dabToplama + summary.dabRamp
    summary.paletSayisi = Math.ceil(summary.toplam / PALLET_DIVISOR)
    totalBoxes += summary.toplam
    totalPallets += summary.paletSayisi
  }

  const summaries = Array.from(regionMap.values())
    .filter((s) => s.toplam > 0)
    .sort((a, b) => {
      const idxA = REGIONS.indexOf(a.bolge)
      const idxB = REGIONS.indexOf(b.bolge)
      if (idxA >= 0 && idxB >= 0) return idxA - idxB
      if (idxA >= 0) return -1
      if (idxB >= 0) return 1
      return a.bolge.localeCompare(b.bolge, 'tr')
    })

  return {
    regionSummaries: summaries,
    totalOrders: new Set(orders.map((o) => o.siparisNumarasi)).size,
    totalBoxes,
    totalPallets,
    orderDetails: orders,
  }
}

export function getRegionDetails(orders: OrderRow[], bolge: string): OrderRow[] {
  return orders.filter((o) => resolveRegion(o) === bolge)
}

/* ─── Dynamic store management ─── */

const CUSTOM_STORES_KEY = 'flowdock-custom-stores'

function loadCustomStores(): void {
  try {
    const raw = localStorage.getItem(CUSTOM_STORES_KEY)
    if (raw) {
      const customs = JSON.parse(raw) as StoreInfo[]
      for (const s of customs) storeMap.set(s.kod, s)
    }
  } catch { /* ignore */ }
}

function saveCustomStores(): void {
  const baseKods = new Set((storesData as StoreInfo[]).map(s => s.kod))
  const customs: StoreInfo[] = []
  for (const [kod, info] of storeMap) {
    if (!baseKods.has(kod)) customs.push(info)
  }
  localStorage.setItem(CUSTOM_STORES_KEY, JSON.stringify(customs))
}

export function addStore(store: StoreInfo): void {
  storeMap.set(store.kod, store)
  saveCustomStores()
}

export function removeStore(kod: number): void {
  storeMap.delete(kod)
  saveCustomStores()
}

export function updateStore(store: StoreInfo): void {
  storeMap.set(store.kod, store)
  saveCustomStores()
}

export function getAllStores(): StoreInfo[] {
  return Array.from(storeMap.values()).sort((a, b) => a.kod - b.kod)
}

export function isCustomStore(kod: number): boolean {
  const baseKods = new Set((storesData as StoreInfo[]).map(s => s.kod))
  return !baseKods.has(kod)
}

// Load custom stores on module init
loadCustomStores()

export { storeMap }
