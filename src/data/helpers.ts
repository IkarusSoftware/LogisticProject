import { addDays, set, startOfDay, subDays, format } from 'date-fns'

import { ROLE_DEFINITIONS } from '../domain/constants'
import type {
  AuditLog,
  Company,
  GateOperation,
  LoadingOperation,
  NotificationItem,
  Ramp,
  RampAssignment,
  Role,
  ShipmentRequest,
  ShipmentStatus,
  StatusHistory,
  SystemSettings,
  User,
  VehicleAssignment,
} from '../domain/models'

export const DEMO_PASSWORD = 'demo123'

export type ScenarioStep = {
  status: ShipmentStatus
  by: string
  at: Date
  note?: string
}

export type Scenario = {
  id: string
  requestNo: string
  requesterCompanyId: string
  targetLocationId: string
  vehicleType: ShipmentRequest['vehicleType']
  loadDate: Date
  loadTime: string
  quantityInfo: string
  productInfo: string
  notes: string
  assignedSupplierCompanyId: string
  createdBy: string
  steps: ScenarioStep[]
  vehicleAssignment?: Omit<VehicleAssignment, 'id' | 'shipmentRequestId'> & { id?: string }
  rampAssignment?: Omit<RampAssignment, 'id' | 'shipmentRequestId'> & { id?: string }
  gateOperation?: Omit<GateOperation, 'id' | 'shipmentRequestId'> & { id?: string }
  loadingOperation?: Omit<LoadingOperation, 'id' | 'shipmentRequestId'> & { id?: string }
  notifications?: Omit<NotificationItem, 'id' | 'createdAt' | 'isReadBy'>[]
}

export function iso(date: Date) {
  return date.toISOString()
}

export function dayAndTime(base: Date, dayOffset: number, hours: number, minutes: number) {
  return set(addDays(startOfDay(base), dayOffset), { hours, minutes, seconds: 0, milliseconds: 0 })
}

export function buildRoles(): Role[] {
  return ROLE_DEFINITIONS.map((role) => ({
    id: role.id,
    key: role.key,
    name: role.name,
    permissions: role.permissions,
  }))
}

export function buildCompanies(now: Date): Company[] {
  return [
    {
      id: 'company-gratis',
      name: 'Gratis',
      type: 'MAIN',
      status: 'ACTIVE',
      createdAt: iso(subDays(now, 240)),
      updatedAt: iso(subDays(now, 2)),
    },
    {
      id: 'company-anadolu',
      name: 'Mars Lojistik',
      type: 'SUPPLIER',
      status: 'ACTIVE',
      createdAt: iso(subDays(now, 180)),
      updatedAt: iso(subDays(now, 3)),
    },
    {
      id: 'company-kuzey',
      name: 'Mevlana Lojistik',
      type: 'LOGISTICS',
      status: 'ACTIVE',
      createdAt: iso(subDays(now, 220)),
      updatedAt: iso(subDays(now, 5)),
    },
    {
      id: 'company-trakya',
      name: 'Horoz Lojistik',
      type: 'SUPPLIER',
      status: 'ACTIVE',
      createdAt: iso(subDays(now, 110)),
      updatedAt: iso(subDays(now, 1)),
    },
  ]
}

export function buildUsers(now: Date): User[] {
  return [
    {
      id: 'user-requester-ayse',
      firstName: 'Ayse',
      lastName: 'Yildirim',
      email: 'ayse.yildirim@gratis.demo',
      phone: '+905327770011',
      roleId: 'role-requester',
      companyId: 'company-gratis',
      isActive: true,
      createdAt: iso(subDays(now, 210)),
      updatedAt: iso(subDays(now, 1)),
      password: DEMO_PASSWORD,
      mustChangePassword: false,
    },
    {
      id: 'user-requester-melis',
      firstName: 'Melis',
      lastName: 'Karaca',
      email: 'melis.karaca@gratis.demo',
      phone: '+905307770022',
      roleId: 'role-requester',
      companyId: 'company-gratis',
      isActive: true,
      createdAt: iso(subDays(now, 200)),
      updatedAt: iso(subDays(now, 2)),
      password: DEMO_PASSWORD,
      mustChangePassword: false,
    },
    {
      id: 'user-supplier-mert',
      firstName: 'Mert',
      lastName: 'Demir',
      email: 'mert.demir@mars.demo',
      phone: '+905551112233',
      roleId: 'role-supplier',
      companyId: 'company-anadolu',
      isActive: true,
      createdAt: iso(subDays(now, 180)),
      updatedAt: iso(subDays(now, 1)),
      password: DEMO_PASSWORD,
      mustChangePassword: false,
    },
    {
      id: 'user-supplier-elif',
      firstName: 'Elif',
      lastName: 'Tas',
      email: 'elif.tas@mevlana.demo',
      phone: '+905441112233',
      roleId: 'role-supplier',
      companyId: 'company-kuzey',
      isActive: true,
      createdAt: iso(subDays(now, 165)),
      updatedAt: iso(subDays(now, 1)),
      password: DEMO_PASSWORD,
      mustChangePassword: false,
    },
    {
      id: 'user-supplier-bora',
      firstName: 'Bora',
      lastName: 'Yilmaz',
      email: 'bora.yilmaz@horoz.demo',
      phone: '+905331112244',
      roleId: 'role-supplier',
      companyId: 'company-trakya',
      isActive: true,
      createdAt: iso(subDays(now, 150)),
      updatedAt: iso(subDays(now, 1)),
      password: DEMO_PASSWORD,
      mustChangePassword: false,
    },
    {
      id: 'user-control-selin',
      firstName: 'Fevzi',
      lastName: 'Uzun',
      email: 'fevzi.uzun@gratis.demo',
      phone: '+905354440011',
      roleId: 'role-control',
      companyId: 'company-gratis',
      isActive: true,
      createdAt: iso(subDays(now, 190)),
      updatedAt: iso(subDays(now, 1)),
      password: DEMO_PASSWORD,
      mustChangePassword: false,
    },
    {
      id: 'user-ramp-emre',
      firstName: 'Emre',
      lastName: 'Kilic',
      email: 'emre.kilic@gratis.demo',
      phone: '+905367770044',
      roleId: 'role-ramp',
      companyId: 'company-gratis',
      isActive: true,
      createdAt: iso(subDays(now, 170)),
      updatedAt: iso(subDays(now, 2)),
      password: DEMO_PASSWORD,
      mustChangePassword: false,
    },
    {
      id: 'user-gate-cem',
      firstName: 'Cem',
      lastName: 'Sari',
      email: 'cem.sari@gratis.demo',
      phone: '+905398880055',
      roleId: 'role-gate',
      companyId: 'company-gratis',
      isActive: true,
      createdAt: iso(subDays(now, 140)),
      updatedAt: iso(subDays(now, 1)),
      password: DEMO_PASSWORD,
      mustChangePassword: false,
    },
    {
      id: 'user-loading-deniz',
      firstName: 'Deniz',
      lastName: 'Arslan',
      email: 'deniz.arslan@gratis.demo',
      phone: '+905376660066',
      roleId: 'role-loading',
      companyId: 'company-gratis',
      isActive: true,
      createdAt: iso(subDays(now, 125)),
      updatedAt: iso(subDays(now, 1)),
      password: DEMO_PASSWORD,
      mustChangePassword: false,
    },
    {
      id: 'user-admin-eda',
      firstName: 'Özgür',
      lastName: 'Çağlayan',
      email: 'ozgur.caglayan@gratis.demo',
      phone: '+905399991122',
      roleId: 'role-admin',
      companyId: 'company-gratis',
      isActive: true,
      createdAt: iso(subDays(now, 250)),
      updatedAt: iso(subDays(now, 1)),
      password: DEMO_PASSWORD,
      mustChangePassword: false,
    },
    {
      id: 'user-superadmin-kerem',
      firstName: 'Kerem',
      lastName: 'Başaran',
      email: 'kerem.basaran@gratis.demo',
      phone: '+905301234567',
      roleId: 'role-superadmin',
      companyId: 'company-gratis',
      isActive: true,
      createdAt: iso(subDays(now, 300)),
      updatedAt: iso(subDays(now, 1)),
      password: DEMO_PASSWORD,
      mustChangePassword: false,
    },
  ]
}

export function buildDefaultSystemSettings(): SystemSettings {
  return {
    companyName: 'Gratis Lojistik',
    workStartHour: '08:00',
    workEndHour: '18:00',
    maxDailyShipments: 50,
    defaultVehicleType: 'TIR',
    notificationsEnabled: true,
    autoAssignRamp: false,
    maintenanceMode: false,
  }
}

export function buildLocations() {
  return [
    {
      id: 'loc-istanbul',
      name: 'Avrupa',
      address: 'Avrupa Bolgesi Dagitim Merkezi',
      companyId: 'company-gratis',
      isActive: true,
    },
    {
      id: 'loc-ankara',
      name: 'Ankara',
      address: 'Ankara Dagitim Bolgesi',
      companyId: 'company-gratis',
      isActive: true,
    },
    {
      id: 'loc-izmir',
      name: 'Izmir',
      address: 'Izmir Dagitim Bolgesi',
      companyId: 'company-gratis',
      isActive: true,
    },
    {
      id: 'loc-adana',
      name: 'Adana',
      address: 'Adana Dagitim Bolgesi',
      companyId: 'company-gratis',
      isActive: true,
    },
    {
      id: 'loc-bursa',
      name: 'Bursa',
      address: 'Bursa Dagitim Bolgesi',
      companyId: 'company-gratis',
      isActive: true,
    },
    {
      id: 'loc-diyarbakir',
      name: 'Diyarbakır',
      address: 'Diyarbakır Dagitim Bolgesi',
      companyId: 'company-gratis',
      isActive: true,
    },
  ]
}

export function buildRamps(): Ramp[] {
  return [
    { id: 'ramp-ist-01', locationId: 'loc-istanbul', code: 'AVR-01', name: 'Avrupa Rampa 01', status: 'AVAILABLE', isActive: true },
    { id: 'ramp-ist-02', locationId: 'loc-istanbul', code: 'AVR-02', name: 'Avrupa Rampa 02', status: 'BUSY', isActive: true },
    { id: 'ramp-ist-03', locationId: 'loc-istanbul', code: 'AVR-03', name: 'Avrupa Rampa 03', status: 'AVAILABLE', isActive: true },
    { id: 'ramp-ank-01', locationId: 'loc-ankara', code: 'ANK-01', name: 'Ankara Rampa 01', status: 'AVAILABLE', isActive: true },
    { id: 'ramp-ank-02', locationId: 'loc-ankara', code: 'ANK-02', name: 'Ankara Rampa 02', status: 'MAINTENANCE', isActive: true },
    { id: 'ramp-izm-01', locationId: 'loc-izmir', code: 'IZM-01', name: 'Izmir Rampa 01', status: 'AVAILABLE', isActive: true },
    { id: 'ramp-ada-01', locationId: 'loc-adana', code: 'ADA-01', name: 'Adana Rampa 01', status: 'AVAILABLE', isActive: true },
    { id: 'ramp-bur-01', locationId: 'loc-bursa', code: 'BUR-01', name: 'Bursa Rampa 01', status: 'AVAILABLE', isActive: true },
    ...Array.from({ length: 15 }, (_, index) => {
      const number = String(index + 1).padStart(2, '0')
      return {
        id: `ramp-generic-${number}`,
        locationId: 'loc-istanbul',
        code: String(index + 1),
        name: `Rampa ${index + 1}`,
        status: 'AVAILABLE' as const,
        isActive: true,
      }
    }),
  ]
}

function buildStatusArtifacts(scenario: Scenario) {
  const statusHistory: StatusHistory[] = []
  const auditLogs: AuditLog[] = []

  scenario.steps.forEach((step, index) => {
    const previous = scenario.steps[index - 1]
    statusHistory.push({
      id: `hist-${scenario.id}-${index + 1}`,
      shipmentRequestId: scenario.id,
      oldStatus: previous?.status ?? 'NONE',
      newStatus: step.status,
      changedBy: step.by,
      changedAt: iso(step.at),
      note: step.note,
    })

    auditLogs.push({
      id: `audit-status-${scenario.id}-${index + 1}`,
      entityType: 'ShipmentRequest',
      entityId: scenario.id,
      actionType: 'status_transition',
      oldValue: previous?.status ?? 'NONE',
      newValue: step.status,
      description: step.note ?? `Durum ${step.status} olarak guncellendi.`,
      performedByUserId: step.by,
      performedAt: iso(step.at),
    })
  })

  return { statusHistory, auditLogs }
}

export function buildScenarioData(scenario: Scenario) {
  const createdAt = scenario.steps[0]?.at ?? new Date()
  const updatedAt = scenario.steps[scenario.steps.length - 1]?.at ?? createdAt
  // Her senaryo tek kaynaktan hem entity hem de izlenebilirlik kayıtlarını üretir.
  const request: ShipmentRequest = {
    id: scenario.id,
    requestNo: scenario.requestNo,
    requesterCompanyId: scenario.requesterCompanyId,
    targetLocationId: scenario.targetLocationId,
    requestDate: format(createdAt, 'yyyy-MM-dd'),
    vehicleType: scenario.vehicleType,
    loadDate: format(scenario.loadDate, 'yyyy-MM-dd'),
    loadTime: scenario.loadTime,
    quantityInfo: scenario.quantityInfo,
    productInfo: scenario.productInfo,
    notes: scenario.notes,
    currentStatus: scenario.steps[scenario.steps.length - 1]?.status ?? 'REQUEST_CREATED',
    assignedSupplierCompanyId: scenario.assignedSupplierCompanyId,
    createdBy: scenario.createdBy,
    createdAt: iso(createdAt),
    updatedAt: iso(updatedAt),
  }

  const artifacts = buildStatusArtifacts(scenario)
  const vehicleAssignments: VehicleAssignment[] = []
  const rampAssignments: RampAssignment[] = []
  const gateOperations: GateOperation[] = []
  const loadingOperations: LoadingOperation[] = []
  const auditLogs = [...artifacts.auditLogs]
  const notifications: NotificationItem[] = []

  if (scenario.vehicleAssignment) {
    vehicleAssignments.push({
      ...scenario.vehicleAssignment,
      id: scenario.vehicleAssignment.id ?? `va-${scenario.id}`,
      shipmentRequestId: scenario.id,
    })
  }

  if (scenario.rampAssignment) {
    rampAssignments.push({
      ...scenario.rampAssignment,
      id: scenario.rampAssignment.id ?? `ra-${scenario.id}`,
      shipmentRequestId: scenario.id,
    })
  }

  if (scenario.gateOperation) {
    gateOperations.push({
      ...scenario.gateOperation,
      id: scenario.gateOperation.id ?? `go-${scenario.id}`,
      shipmentRequestId: scenario.id,
    })
  }

  if (scenario.loadingOperation) {
    loadingOperations.push({
      ...scenario.loadingOperation,
      id: scenario.loadingOperation.id ?? `lo-${scenario.id}`,
      shipmentRequestId: scenario.id,
    })
  }

  if (scenario.vehicleAssignment) {
    auditLogs.push({
      id: `audit-assignment-${scenario.id}`,
      entityType: 'VehicleAssignment',
      entityId: scenario.id,
      actionType: 'vehicle_assignment_saved',
      oldValue: '-',
      newValue: `${scenario.vehicleAssignment.tractorPlate} / ${scenario.vehicleAssignment.driverFirstName} ${scenario.vehicleAssignment.driverLastName}`,
      description: 'Arac ve sofor bilgileri kaydedildi.',
      performedByUserId: scenario.vehicleAssignment.assignedBy,
      performedAt: scenario.vehicleAssignment.assignedAt,
    })
  }

  if (scenario.rampAssignment) {
    auditLogs.push({
      id: `audit-ramp-${scenario.id}`,
      entityType: 'RampAssignment',
      entityId: scenario.id,
      actionType: 'ramp_assigned',
      oldValue: '-',
      newValue: scenario.rampAssignment.rampId,
      description: 'Rampa atamasi yapildi.',
      performedByUserId: scenario.rampAssignment.assignedBy,
      performedAt: scenario.rampAssignment.assignedAt,
    })
  }

  if (scenario.loadingOperation?.sealNumber && scenario.loadingOperation.sealedAt && scenario.loadingOperation.finalizedBy) {
    auditLogs.push({
      id: `audit-loading-seal-${scenario.id}`,
      entityType: 'LoadingOperation',
      entityId: scenario.id,
      actionType: 'seal_saved',
      oldValue: '-',
      newValue: scenario.loadingOperation.sealNumber,
      description: 'Muhur numarasi sisteme kaydedildi.',
      performedByUserId: scenario.loadingOperation.finalizedBy,
      performedAt: scenario.loadingOperation.sealedAt,
    })
  }

  scenario.notifications?.forEach((notification, index) => {
    notifications.push({
      id: `notif-${scenario.id}-${index + 1}`,
      ...notification,
      createdAt: iso(updatedAt),
      isReadBy: [],
    })
  })

  return {
    request,
    vehicleAssignments,
    rampAssignments,
    gateOperations,
    loadingOperations,
    auditLogs,
    statusHistory: artifacts.statusHistory,
    notifications,
  }
}
