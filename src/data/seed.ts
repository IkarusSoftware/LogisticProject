import type { DemoData, NotificationItem } from '../domain/models'
import { buildReferenceData } from './referenceData'
import { DEMO_PASSWORD } from './helpers'

function buildSeedNotifications(now: Date): NotificationItem[] {
  const t = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * 60 * 1000).toISOString()
  return [
    {
      id: 'notif-001',
      title: 'Yeni Sevkiyat Talebi',
      message: 'SR-260317-001 numaralı talep oluşturuldu. Araç ataması bekleniyor.',
      level: 'info',
      createdAt: t(5),
      targetRoleKeys: ['supplier'],
      targetCompanyIds: ['company-anadolu'],
      isReadBy: [],
    },
    {
      id: 'notif-002',
      title: 'Araç Atandı',
      message: 'SR-260317-002 için 34 ABC 001 plakalı araç atandı. Güvenlik kontrolü gerekiyor.',
      level: 'info',
      createdAt: t(18),
      targetRoleKeys: ['gate', 'admin'],
      targetCompanyIds: [],
      isReadBy: [],
    },
    {
      id: 'notif-003',
      title: 'Araç Onaylandı',
      message: 'SR-260317-003 araç ataması kontrol tarafından onaylandı. Rampa planlaması yapılabilir.',
      level: 'success',
      createdAt: t(32),
      targetRoleKeys: ['ramp', 'admin'],
      targetCompanyIds: [],
      isReadBy: [],
    },
    {
      id: 'notif-004',
      title: 'Düzeltme Talebi',
      message: 'SR-260317-004 için araç bilgileri eksik. Sürücü telefonu hatalı formatda.',
      level: 'warning',
      createdAt: t(45),
      targetRoleKeys: ['supplier'],
      targetCompanyIds: ['company-anadolu'],
      isReadBy: [],
    },
    {
      id: 'notif-005',
      title: 'Araç Reddedildi',
      message: 'SR-260317-005 araç ataması reddedildi. Gerekçe: Plaka bilgisi sistemde kayıtlı değil.',
      level: 'error',
      createdAt: t(60),
      targetRoleKeys: ['supplier', 'requester'],
      targetCompanyIds: ['company-anadolu', 'company-gratis'],
      isReadBy: [],
    },
    {
      id: 'notif-006',
      title: 'Rampa Atandı',
      message: 'SR-260317-006 için R-03 numaralı rampa planlandı. 09:00 girişi bekleniyor.',
      level: 'info',
      createdAt: t(75),
      targetRoleKeys: ['gate', 'admin'],
      targetCompanyIds: [],
      isReadBy: [],
    },
    {
      id: 'notif-007',
      title: 'Yükleme Tamamlandı',
      message: 'SR-260317-007 yükleme tamamlandı. Mühür no: FD-2026-0891.',
      level: 'success',
      createdAt: t(120),
      targetRoleKeys: [],
      targetCompanyIds: [],
      isReadBy: [],
    },
    {
      id: 'notif-008',
      title: 'Talep İptal Edildi',
      message: 'SR-260317-008 numaralı talep iptal edildi.',
      level: 'warning',
      createdAt: t(180),
      targetRoleKeys: [],
      targetCompanyIds: [],
      isReadBy: [],
    },
  ]
}

export function getDemoPassword() {
  return DEMO_PASSWORD
}

export function buildInitialData(): DemoData {
  const now = new Date()
  const reference = buildReferenceData(now)

  return {
    companies: reference.companies,
    users: reference.users,
    roles: reference.roles,
    locations: reference.locations,
    ramps: reference.ramps,
    shipmentRequests: [],
    vehicleAssignments: [],
    rampAssignments: [],
    gateOperations: [],
    loadingOperations: [],
    auditLogs: [],
    statusHistory: [],
    notifications: buildSeedNotifications(now),
    systemSettings: reference.systemSettings,
  }
}
