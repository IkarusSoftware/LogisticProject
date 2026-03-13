import { addHours, addMinutes, startOfDay } from 'date-fns'

import type { DemoData, NotificationItem } from '../domain/models'
import { buildReferenceData } from './referenceData'
import { buildScenarioData, DEMO_PASSWORD, iso } from './helpers'
import { buildScenariosA } from './scenarios-a'
import { buildScenariosB } from './scenarios-b'
import { buildScenariosC } from './scenarios-c'

export function getDemoPassword() {
  return DEMO_PASSWORD
}

export function buildInitialData(): DemoData {
  const now = new Date()
  const reference = buildReferenceData(now)
  const scenarios = [...buildScenariosA(now), ...buildScenariosB(now), ...buildScenariosC(now)]
  const compiled = scenarios.map(buildScenarioData)

  const notifications: NotificationItem[] = [
    {
      id: 'notif-role-001',
      title: 'Kontrol ekibinde yogunluk',
      message: 'Bugun 3 kayit arac dogrulama bekliyor.',
      level: 'warning',
      createdAt: iso(addHours(startOfDay(now), 9)),
      targetRoleKeys: ['control', 'admin'],
      targetCompanyIds: ['company-gratis'],
      isReadBy: [],
    },
    {
      id: 'notif-role-002',
      title: 'Muhur bekleyen arac',
      message: 'SR-260313-009 icin muhurlu cikis tamamlanmadi.',
      level: 'info',
      createdAt: iso(addMinutes(addHours(startOfDay(now), 9), 35)),
      targetRoleKeys: ['loading', 'admin'],
      targetCompanyIds: ['company-gratis'],
      shipmentRequestId: 'req-009',
      isReadBy: [],
    },
    ...compiled.flatMap((item) => item.notifications),
  ]

  return {
    companies: reference.companies,
    users: reference.users,
    roles: reference.roles,
    locations: reference.locations,
    ramps: reference.ramps,
    shipmentRequests: compiled.map((item) => item.request),
    vehicleAssignments: compiled.flatMap((item) => item.vehicleAssignments),
    rampAssignments: compiled.flatMap((item) => item.rampAssignments),
    gateOperations: compiled.flatMap((item) => item.gateOperations),
    loadingOperations: compiled.flatMap((item) => item.loadingOperations),
    auditLogs: compiled.flatMap((item) => item.auditLogs),
    statusHistory: compiled.flatMap((item) => item.statusHistory),
    notifications,
  }
}
