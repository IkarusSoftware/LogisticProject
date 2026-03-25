import type { OrderRow } from './shift-types'

export const REGIONS = [
  'Adana', 'Ankara', 'Antalya', 'Balıkesir', 'Bursa',
  'Diyarbakır', 'Düzce', 'Erzurum', 'Eskişehir', 'Gaziantep',
  'İSTANBUL - AND', 'İSTANBUL - AVR', 'İzmir', 'Kayseri', 'Konya',
  'Muğla', 'Parsiyel', 'Samsun', 'Trabzon',
]

export const PALLET_DIVISOR = 24

export function classifyLocation(lokasyon: string, depo: string): 'toplama' | 'kasalama' | 'sevkiyat' | 'dabToplama' | 'dabRamp' {
  const is190 = depo === '190'

  if (!lokasyon) return is190 ? 'dabToplama' : 'toplama'
  const loc = lokasyon.toUpperCase().trim()

  if (is190) {
    if (loc.startsWith('RAMP')) return 'dabRamp'
    return 'dabToplama'
  }

  if (loc.startsWith('RAMP')) return 'sevkiyat'
  if (loc.startsWith('PACK')) return 'kasalama'
  return 'toplama'
}

export const COLUMN_MAP: Record<string, keyof OrderRow> = {
  'sipariş tarihi': 'siparisTarihi',
  'sipariş tarihi.': 'siparisTarihi',
  'sipariş no': 'siparisNo',
  'siparis no': 'siparisNo',
  'mağaza kodu': 'magazaKodu',
  'mağaza kodu1': 'magazaKodu',
  'mağaza kodudab': 'magazaKodu',
  'depo': 'depo',
  'dalga kimliği': 'dalgaKimligi',
  'dalga kimligi': 'dalgaKimligi',
  'lp': 'lp',
  'lokasyon': 'lokasyon',
  'mlp': 'mlp',
  'kapsayıcı kimliği': 'kapsayiciKimligi',
  'kapsayici kimligi': 'kapsayiciKimligi',
  'sipariş numarası': 'siparisNumarasi',
  'siparis numarasi': 'siparisNumarasi',
  'sipariş numarası ': 'siparisNumarasi',
  'siparis numarası': 'siparisNumarasi',
  'dağıtım bölgesi': 'dagitimBolgesi',
  'dagitim bolgesi': 'dagitimBolgesi',
  'dağitim bölgesi': 'dagitimBolgesi',
  'mağaza adı': 'magazaAdi',
  'magaza adi': 'magazaAdi',
  'wave numarası': 'waveNumarasi',
  'wave numarasi': 'waveNumarasi',
  'kasa': 'kasaTipi',
  'ship to code': 'magazaKodu',
  'kargo': 'siparisNo',
}
