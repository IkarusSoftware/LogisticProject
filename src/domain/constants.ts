import type { NavigationItem, RampStatus, RoleDefinition, ShipmentStatus, StatusMeta, VehicleType } from './models'

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    id: 'role-requester',
    key: 'requester',
    name: 'Talep Olusturan Firma',
    homePath: '/talep-olustur',
    description: 'Talep acar, sureci izler ve kendi kayitlarini yonetir.',
    permissions: ['request:create', 'request:view:own', 'request:cancel'],
  },
  {
    id: 'role-supplier',
    key: 'supplier',
    name: 'Tedarikci Firma',
    homePath: '/talepler',
    description: 'Kendisine atanan talepler icin arac ve sofor bilgilerini girer, duzeltme taleplerini yanitlar.',
    permissions: ['assignment:view', 'assignment:create', 'assignment:update'],
  },
  {
    id: 'role-control',
    key: 'control',
    name: 'Sevkiyat Operasyon',
    homePath: '/talepler',
    description: 'Arac kaydi tamamlanan sevkiyatlara rampa atar ve operasyon planini yonetir.',
    permissions: ['shipment:view', 'ramp:assign'],
  },
  {
    id: 'role-ramp',
    key: 'ramp',
    name: 'Rampa Planlama',
    homePath: '/rampa-planlama',
    description: 'Eski demo akisinda rampa planlama sayfasini kullanir.',
    permissions: ['ramp:view', 'ramp:assign'],
  },
  {
    id: 'role-gate',
    key: 'gate',
    name: 'Dis Guvenlik',
    homePath: '/kapi-operasyonu',
    description: 'Tedariği tamamlanan araclari sahada kontrol eder, duzeltme ister veya arac kaydini tamamlar.',
    permissions: ['gate:view', 'gate:review', 'gate:request-correction', 'gate:register'],
  },
  {
    id: 'role-loading',
    key: 'loading',
    name: 'Yukleme Sonlandirma',
    homePath: '/yukleme-tamamlama',
    description: 'Yuklemeyi, muhuru ve cikisi kapatir.',
    permissions: ['loading:view', 'loading:complete'],
  },
  {
    id: 'role-admin',
    key: 'admin',
    name: 'Vardiya Amiri / Ekip Lideri',
    homePath: '/dashboard',
    description: 'Tum surecleri, tanimlari ve raporlari yonetir.',
    permissions: ['*'],
  },
  {
    id: 'role-superadmin',
    key: 'superadmin',
    name: 'Sistem Yoneticisi',
    homePath: '/dashboard',
    description: 'Tum sistemi, kullanicilari, ayarlari ve loglari yonetir.',
    permissions: ['*', 'system:*', 'user:manage', 'settings:manage', 'audit:view'],
  },
]

export const STATUS_META: Record<ShipmentStatus, StatusMeta> = {
  REQUEST_CREATED: {
    label: 'Talep Olusturuldu',
    tone: 'neutral',
    description: 'Talep yeni acildi, henuz tedarikciye gonderilmedi.',
  },
  SENT_TO_SUPPLIER: {
    label: 'Tedarikciye Iletildi',
    tone: 'info',
    description: 'Talep tedarikci kuyruunda bekliyor.',
  },
  SUPPLIER_REVIEWING: {
    label: 'Tedarikci Inceliyor',
    tone: 'info',
    description: 'Tedarikci arac planlamasi yapiyor.',
  },
  VEHICLE_ASSIGNED: {
    label: 'Tedarik Edildi',
    tone: 'info',
    description: 'Arac ve sofor bilgileri dis guvenlik kontrolunu bekliyor.',
  },
  CORRECTION_REQUESTED: {
    label: 'Duzeltme Talebi Var',
    tone: 'warning',
    description: 'Dis guvenlik tedarik bilgileri icin duzeltme istedi.',
  },
  VEHICLE_CANCELLED: {
    label: 'Arac Iptal Edildi',
    tone: 'danger',
    description: 'Arac kaydi iptal edildi.',
  },
  IN_CONTROL: {
    label: 'Kontrol Ediliyor',
    tone: 'warning',
    description: 'Eski demo akisinda kontrol asamasinda bekliyor.',
  },
  APPROVED: {
    label: 'Arac Kaydi Yapildi',
    tone: 'success',
    description: 'Dis guvenlik arac kaydini tamamlandi olarak isaretledi.',
  },
  RAMP_PLANNED: {
    label: 'Rampaya Cagrildi',
    tone: 'success',
    description: 'Sevkiyat operasyon tarafindan rampasi atandi.',
  },
  ARRIVED: {
    label: 'Tesise Geldi',
    tone: 'warning',
    description: 'Arac tesise ulasti.',
  },
  ADMITTED: {
    label: 'Sahaya Giris Yapti',
    tone: 'warning',
    description: 'Arac saha giris kontrolunden gecti.',
  },
  AT_RAMP: {
    label: 'Rampaya Alindi',
    tone: 'warning',
    description: 'Arac yukleme rampasinda.',
  },
  LOADING: {
    label: 'Yukleniyor',
    tone: 'info',
    description: 'Yukleme devam ediyor.',
  },
  LOADED: {
    label: 'Yuklemesi Tamamlandi',
    tone: 'success',
    description: 'Yukleme tamamlandi ve arac cikisa hazir.',
  },
  SEALED: {
    label: 'Muhurlendi',
    tone: 'success',
    description: 'Muhur numarasi sisteme islendi.',
  },
  EXITED: {
    label: 'Cikis Yapti',
    tone: 'success',
    description: 'Arac sahadan cikis yapti.',
  },
  COMPLETED: {
    label: 'Tamamlandi',
    tone: 'success',
    description: 'Operasyon basariyla kapandi.',
  },
  REJECTED: {
    label: 'Reddedildi',
    tone: 'danger',
    description: 'Talep ya da arac bilgisi reddedildi.',
  },
  CANCELLED: {
    label: 'Iptal Edildi',
    tone: 'danger',
    description: 'Talep iptal edildi.',
  },
}

export const STATUS_SEQUENCE: ShipmentStatus[] = [
  'REQUEST_CREATED',
  'SENT_TO_SUPPLIER',
  'SUPPLIER_REVIEWING',
  'VEHICLE_ASSIGNED',
  'CORRECTION_REQUESTED',
  'APPROVED',
  'RAMP_PLANNED',
  'ARRIVED',
  'ADMITTED',
  'AT_RAMP',
  'LOADING',
  'LOADED',
  'SEALED',
  'EXITED',
  'COMPLETED',
]

export const TERMINAL_STATUSES: ShipmentStatus[] = ['COMPLETED', 'REJECTED', 'CANCELLED', 'VEHICLE_CANCELLED']

export const ACTIVE_STATUSES: ShipmentStatus[] = STATUS_SEQUENCE.filter((status) => !TERMINAL_STATUSES.includes(status))

export const VEHICLE_TYPE_OPTIONS: VehicleType[] = ['TIR', 'KAMYON', 'KAMYONET']

export const RAMP_STATUS_LABELS: Record<RampStatus, string> = {
  AVAILABLE: 'Uygun',
  BUSY: 'Dolu',
  MAINTENANCE: 'Bakimda',
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'layout-dashboard', roleKeys: ROLE_DEFINITIONS.map((role) => role.key) },
  { label: 'Talep Olustur', path: '/talep-olustur', icon: 'clipboard-plus', roleKeys: ['requester', 'admin', 'superadmin'] },
  { label: 'Talep Listesi', path: '/talepler', icon: 'clipboard-list', roleKeys: ROLE_DEFINITIONS.map((role) => role.key) },
  { label: 'Tedarik Atama', path: '/tedarik-atama', icon: 'truck', roleKeys: ['supplier', 'admin', 'superadmin'] },
  { label: 'Arac Kontrol', path: '/arac-kontrol', icon: 'shield-check', roleKeys: ['control', 'admin', 'superadmin'] },
  { label: 'Rampa Planlama', path: '/rampa-planlama', icon: 'warehouse', roleKeys: ['ramp', 'admin', 'superadmin'] },
  { label: 'Dis Guvenlik', path: '/kapi-operasyonu', icon: 'scan-line', roleKeys: ['gate', 'admin', 'superadmin'] },
  { label: 'Yukleme Tamamlama', path: '/yukleme-tamamlama', icon: 'package-check', roleKeys: ['loading', 'admin', 'superadmin'] },
  { label: 'Gecmis', path: '/gecmis', icon: 'history', roleKeys: ROLE_DEFINITIONS.map((role) => role.key) },
  { label: 'Raporlar', path: '/raporlar', icon: 'chart-no-axes-column', roleKeys: ['admin', 'superadmin'] },
  { label: 'Yukleme Bolgeleri', path: '/yukleme-bolgeleri', icon: 'map-pin', roleKeys: ['superadmin'] },
  { label: 'Tedarikci Firmalar', path: '/tedarikci-firmalar', icon: 'building-2', roleKeys: ['superadmin'] },
  { label: 'Rol Yonetimi', path: '/rol-yonetimi', icon: 'shield', roleKeys: ['superadmin'] },
  { label: 'Kullanici Rol Esleme', path: '/kullanici-rol-esleme', icon: 'user-check', roleKeys: ['superadmin'] },
  { label: 'Kullanici Yonetimi', path: '/kullanici-yonetim', icon: 'users', roleKeys: ['superadmin'] },
  { label: 'Aktivite Log', path: '/aktivite-log', icon: 'scroll-text', roleKeys: ['superadmin'] },
  { label: 'Sistem Ayarlari', path: '/ayarlar', icon: 'cog', roleKeys: ['superadmin'] },
]

export const DASHBOARD_CARD_DEFINITIONS = [
  { key: 'requested', title: 'Talep edilen araclar' },
  { key: 'readyForLoading', title: 'Yuklemeye hazir bekleyenler' },
  { key: 'loading', title: 'Aktif yuklenen araclar' },
  { key: 'loaded', title: 'Yuklemesi tamamlananlar' },
  { key: 'correctionQueue', title: 'Revize bekleyenler' },
  { key: 'cancelled', title: 'Iptal / reddedilenler' },
] as const
