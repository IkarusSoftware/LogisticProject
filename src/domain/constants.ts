import type { NavigationItem, RampStatus, RoleDefinition, ShipmentStatus, StatusMeta, VehicleType } from './models'

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    id: 'role-requester',
    key: 'requester',
    name: 'Talep Oluşturan Firma',
    homePath: '/talep-olustur',
    description: 'Talep açar, süreci izler, kendi kayıtlarını yönetir.',
    permissions: ['request:create', 'request:view:own', 'request:cancel'],
  },
  {
    id: 'role-supplier',
    key: 'supplier',
    name: 'Tedarik / Lojistik',
    homePath: '/tedarik-atama',
    description: 'Talebi karşılar, araç ve şoför atar, gerekirse reddeder.',
    permissions: ['assignment:view', 'assignment:create', 'assignment:reject'],
  },
  {
    id: 'role-control',
    key: 'control',
    name: 'Ana Firma Kontrol Yetkilisi',
    homePath: '/arac-kontrol',
    description: 'Tedarikçi girişlerini doğrular ve karar verir.',
    permissions: ['control:view', 'control:approve', 'control:reject'],
  },
  {
    id: 'role-ramp',
    key: 'ramp',
    name: 'Rampa Planlama',
    homePath: '/rampa-planlama',
    description: 'Rampa ataması yapar ve doluluk kontrolü yürütür.',
    permissions: ['ramp:view', 'ramp:assign'],
  },
  {
    id: 'role-gate',
    key: 'gate',
    name: 'Kapı / Saha Operasyonu',
    homePath: '/kapi-operasyonu',
    description: 'Araç geliş, saha giriş ve rampaya alma işlemlerini yönetir.',
    permissions: ['gate:view', 'gate:arrive', 'gate:admit', 'gate:take-ramp', 'gate:start-loading'],
  },
  {
    id: 'role-loading',
    key: 'loading',
    name: 'Yükleme Sonlandırma',
    homePath: '/yukleme-tamamlama',
    description: 'Yüklemeyi, mühürlemeyi ve çıkışı kapatır.',
    permissions: ['loading:view', 'loading:complete'],
  },
  {
    id: 'role-admin',
    key: 'admin',
    name: 'Yönetici / Admin',
    homePath: '/dashboard',
    description: 'Tüm süreçleri, tanımları ve raporları yönetir.',
    permissions: ['*'],
  },
]

export const STATUS_META: Record<ShipmentStatus, StatusMeta> = {
  REQUEST_CREATED: {
    label: 'Talep Oluşturuldu',
    tone: 'neutral',
    description: 'Talep yeni açıldı, henüz tedarikçiye gönderilmedi.',
  },
  SENT_TO_SUPPLIER: {
    label: 'Tedarikçiye İletildi',
    tone: 'info',
    description: 'Talep tedarikçi kuyruğunda bekliyor.',
  },
  SUPPLIER_REVIEWING: {
    label: 'Tedarikçi İnceliyor',
    tone: 'info',
    description: 'Tedarikçi araç planlaması yapıyor.',
  },
  VEHICLE_ASSIGNED: {
    label: 'Araç Atandı',
    tone: 'info',
    description: 'Araç ve şoför bilgileri girildi.',
  },
  IN_CONTROL: {
    label: 'Ana Firma Kontrolünde',
    tone: 'warning',
    description: 'Kontrol yetkilisi kaydı doğruluyor.',
  },
  APPROVED: {
    label: 'Onaylandı',
    tone: 'success',
    description: 'Araç bilgileri onaylandı, rampa planlamaya hazır.',
  },
  RAMP_PLANNED: {
    label: 'Rampa Planlandı',
    tone: 'success',
    description: 'Araç için rampa atandı.',
  },
  ARRIVED: {
    label: 'Tesise Geldi',
    tone: 'warning',
    description: 'Araç tesise ulaştı.',
  },
  ADMITTED: {
    label: 'Sahaya Giriş Yaptı',
    tone: 'warning',
    description: 'Araç saha giriş kontrolünden geçti.',
  },
  AT_RAMP: {
    label: 'Rampaya Alındı',
    tone: 'warning',
    description: 'Araç yükleme rampasında.',
  },
  LOADING: {
    label: 'Yükleniyor',
    tone: 'info',
    description: 'Yükleme devam ediyor.',
  },
  LOADED: {
    label: 'Yüklendi',
    tone: 'success',
    description: 'Yükleme tamamlandı.',
  },
  SEALED: {
    label: 'Mühürlendi',
    tone: 'success',
    description: 'Mühür numarası sisteme işlendi.',
  },
  EXITED: {
    label: 'Çıkış Yaptı',
    tone: 'success',
    description: 'Araç sahadan çıkış yaptı.',
  },
  COMPLETED: {
    label: 'Tamamlandı',
    tone: 'success',
    description: 'Operasyon başarıyla kapandı.',
  },
  REJECTED: {
    label: 'Reddedildi',
    tone: 'danger',
    description: 'Talep ya da araç bilgisi reddedildi.',
  },
  CANCELLED: {
    label: 'İptal Edildi',
    tone: 'danger',
    description: 'Talep iptal edildi.',
  },
}

export const STATUS_SEQUENCE: ShipmentStatus[] = [
  'REQUEST_CREATED',
  'SENT_TO_SUPPLIER',
  'SUPPLIER_REVIEWING',
  'VEHICLE_ASSIGNED',
  'IN_CONTROL',
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

export const TERMINAL_STATUSES: ShipmentStatus[] = ['COMPLETED', 'REJECTED', 'CANCELLED']

export const ACTIVE_STATUSES: ShipmentStatus[] = STATUS_SEQUENCE.filter((status) => !TERMINAL_STATUSES.includes(status))

export const VEHICLE_TYPE_OPTIONS: VehicleType[] = ['TIR', 'KAMYON', 'KAMYONET']

export const RAMP_STATUS_LABELS: Record<RampStatus, string> = {
  AVAILABLE: 'Uygun',
  BUSY: 'Dolu',
  MAINTENANCE: 'Bakımda',
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'layout-dashboard', roleKeys: ROLE_DEFINITIONS.map((role) => role.key) },
  { label: 'Talep Oluştur', path: '/talep-olustur', icon: 'clipboard-plus', roleKeys: ['requester', 'admin'] },
  { label: 'Talep Listesi', path: '/talepler', icon: 'clipboard-list', roleKeys: ROLE_DEFINITIONS.map((role) => role.key) },
  { label: 'Tedarik Atama', path: '/tedarik-atama', icon: 'truck', roleKeys: ['supplier', 'admin'] },
  { label: 'Araç Kontrol', path: '/arac-kontrol', icon: 'shield-check', roleKeys: ['control', 'admin'] },
  { label: 'Rampa Planlama', path: '/rampa-planlama', icon: 'warehouse', roleKeys: ['ramp', 'admin'] },
  { label: 'Kapı Operasyonu', path: '/kapi-operasyonu', icon: 'scan-line', roleKeys: ['gate', 'admin'] },
  { label: 'Yükleme Tamamlama', path: '/yukleme-tamamlama', icon: 'package-check', roleKeys: ['loading', 'admin'] },
  { label: 'Geçmiş', path: '/gecmis', icon: 'history', roleKeys: ROLE_DEFINITIONS.map((role) => role.key) },
  { label: 'Raporlar', path: '/raporlar', icon: 'chart-no-axes-column', roleKeys: ['admin'] },
  { label: 'Yönetim', path: '/yonetim', icon: 'settings-2', roleKeys: ['admin'] },
]

export const DASHBOARD_CARD_DEFINITIONS = [
  { key: 'pendingToday', title: 'Bugün bekleyen araçlar' },
  { key: 'awaitingApproval', title: 'Onay bekleyenler' },
  { key: 'awaitingRamp', title: 'Rampa atama bekleyenler' },
  { key: 'arrived', title: 'Tesise gelenler' },
  { key: 'loading', title: 'Yükleniyor' },
  { key: 'completed', title: 'Tamamlananlar' },
  { key: 'rejected', title: 'Reddedilenler' },
] as const
