export interface OrderRow {
  siparisTarihi: string
  siparisNo: string
  magazaKodu: string
  depo: string
  dalgaKimligi: string
  lp: string
  lokasyon: string
  mlp: string
  kapsayiciKimligi: string
  siparisNumarasi: string
  dagitimBolgesi: string
  magazaAdi: string
  waveNumarasi: string
  kasaTipi: string
}

export interface RegionSummary {
  bolge: string
  toplama: number
  kasalama: number
  sevkiyatKasa: number
  dabToplama: number
  dabRamp: number
  toplam: number
  paletSayisi: number
  buyukKasa: number
  kucukKasa: number
  muhtelifKoli: number
}

export interface StoreInfo {
  kod: number
  ad: string
  bolge: string
  acilisTarihi?: string
  magazaTipi?: string
  sinif?: string
  bolgeMuduru?: string
  satisMuduru?: string
}

export interface ProcessedData {
  regionSummaries: RegionSummary[]
  totalOrders: number
  totalBoxes: number
  totalPallets: number
  orderDetails: OrderRow[]
}
