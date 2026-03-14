import { differenceInMinutes } from 'date-fns'

import { DASHBOARD_CARD_DEFINITIONS, TERMINAL_STATUSES } from './constants'
import type {
  AuditLog,
  DemoData,
  NotificationItem,
  ShipmentDetail,
  ShipmentRequest,
  ShipmentStatus,
  User,
  UserRoleKey,
} from './models'
import { formatFullName, getRoleKeyByRoleId, isDelayed } from './workflow'

export function getCurrentUser(data: DemoData, currentUserId: string | null) {
  return data.users.find((user) => user.id === currentUserId)
}

export function getCurrentRoleKey(user?: User): UserRoleKey | undefined {
  if (!user) {
    return undefined
  }

  return getRoleKeyByRoleId(user.roleId)
}

export function getVisibleRequests(data: DemoData, user?: User) {
  if (!user) {
    return [] as ShipmentRequest[]
  }

  const roleKey = getCurrentRoleKey(user)

  if (roleKey === 'admin') {
    return sortRequestsByLoadWindow(data.shipmentRequests)
  }

  if (roleKey === 'requester') {
    return sortRequestsByLoadWindow(
      data.shipmentRequests.filter((request) => request.createdBy === user.id && !isSeedRequest(request)),
    )
  }

  if (roleKey === 'supplier') {
    return sortRequestsByLoadWindow(data.shipmentRequests.filter((request) => request.assignedSupplierCompanyId === user.companyId))
  }

  return sortRequestsByLoadWindow(data.shipmentRequests.filter((request) => request.requesterCompanyId === user.companyId))
}

export function getShipmentDetail(data: DemoData, shipmentRequestId: string): ShipmentDetail | undefined {
  const request = data.shipmentRequests.find((item) => item.id === shipmentRequestId)
  if (!request) {
    return undefined
  }

  const rampAssignment = data.rampAssignments.find((item) => item.shipmentRequestId === shipmentRequestId)

  return {
    request,
    requesterCompany: data.companies.find((company) => company.id === request.requesterCompanyId),
    supplierCompany: data.companies.find((company) => company.id === request.assignedSupplierCompanyId),
    location: data.locations.find((location) => location.id === request.targetLocationId),
    vehicleAssignment: data.vehicleAssignments.find((item) => item.shipmentRequestId === shipmentRequestId),
    rampAssignment,
    ramp: data.ramps.find((item) => item.id === rampAssignment?.rampId),
    gateOperation: data.gateOperations.find((item) => item.shipmentRequestId === shipmentRequestId),
    loadingOperation: data.loadingOperations.find((item) => item.shipmentRequestId === shipmentRequestId),
    createdBy: data.users.find((user) => user.id === request.createdBy),
  }
}

export function getNotificationsForUser(data: DemoData, user?: User) {
  if (!user) {
    return [] as NotificationItem[]
  }

  const roleKey = getCurrentRoleKey(user)
  if (!roleKey) {
    return []
  }

  return [...data.notifications]
    .filter(
      (notification) =>
        notification.targetRoleKeys.includes(roleKey) &&
        (notification.targetCompanyIds.length === 0 || notification.targetCompanyIds.includes(user.companyId)),
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function getUnreadNotificationCount(data: DemoData, user?: User) {
  if (!user) {
    return 0
  }

  return getNotificationsForUser(data, user).filter((notification) => !notification.isReadBy.includes(user.id)).length
}

export function getRecentAuditLogs(data: DemoData, user?: User) {
  const visibleRequests = new Set(getVisibleRequests(data, user).map((request) => request.id))
  return [...data.auditLogs]
    .filter((log) => visibleRequests.has(log.entityId))
    .sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime())
    .slice(0, 8)
}

export function getStatusHistory(data: DemoData, shipmentRequestId: string) {
  return [...data.statusHistory]
    .filter((item) => item.shipmentRequestId === shipmentRequestId)
    .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
}

export function getAuditLogs(data: DemoData, shipmentRequestId: string) {
  return [...data.auditLogs]
    .filter((item) => item.entityId === shipmentRequestId)
    .sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime())
}

export function getDashboardMetrics(data: DemoData, user?: User) {
  const requests = getVisibleRequests(data, user)

  const metrics = {
    requested: requests.filter((request) =>
      ['SENT_TO_SUPPLIER', 'SUPPLIER_REVIEWING', 'VEHICLE_ASSIGNED'].includes(request.currentStatus),
    ).length,
    readyForLoading: requests.filter((request) => ['APPROVED', 'RAMP_PLANNED'].includes(request.currentStatus)).length,
    loading: requests.filter((request) => request.currentStatus === 'LOADING').length,
    loaded: requests.filter((request) => ['LOADED', 'SEALED', 'EXITED', 'COMPLETED'].includes(request.currentStatus)).length,
    correctionQueue: requests.filter((request) => request.currentStatus === 'CORRECTION_REQUESTED').length,
    cancelled: requests.filter((request) => ['REJECTED', 'CANCELLED', 'VEHICLE_CANCELLED'].includes(request.currentStatus)).length,
  }

  return DASHBOARD_CARD_DEFINITIONS.map((card) => ({
    ...card,
    value: metrics[card.key],
  }))
}

export function getPipelineCounts(data: DemoData, user?: User) {
  const requests = getVisibleRequests(data, user)

  return [
    { status: 'SENT_TO_SUPPLIER', count: requests.filter((request) => request.currentStatus === 'SENT_TO_SUPPLIER').length },
    { status: 'CORRECTION_REQUESTED', count: requests.filter((request) => request.currentStatus === 'CORRECTION_REQUESTED').length },
    { status: 'APPROVED', count: requests.filter((request) => request.currentStatus === 'APPROVED').length },
    { status: 'RAMP_PLANNED', count: requests.filter((request) => request.currentStatus === 'RAMP_PLANNED').length },
    { status: 'LOADING', count: requests.filter((request) => request.currentStatus === 'LOADING').length },
    { status: 'LOADED', count: requests.filter((request) => request.currentStatus === 'LOADED').length },
    { status: 'COMPLETED', count: requests.filter((request) => request.currentStatus === 'COMPLETED').length },
  ] as Array<{ status: ShipmentStatus; count: number }>
}

export function getDelayedRequests(data: DemoData, user?: User) {
  return getVisibleRequests(data, user).filter((request) => isDelayed(request))
}

export function getRampsForLocation(data: DemoData, locationId: string) {
  return data.ramps.filter((ramp) => ramp.locationId === locationId)
}

export function getRampOccupancy(data: DemoData) {
  return data.ramps.map((ramp) => {
    const activeAssignment = data.rampAssignments.find((assignment) => {
      const request = data.shipmentRequests.find((item) => item.id === assignment.shipmentRequestId)
      return assignment.rampId === ramp.id && request && !TERMINAL_STATUSES.includes(request.currentStatus)
    })

    const shipment = activeAssignment ? data.shipmentRequests.find((item) => item.id === activeAssignment.shipmentRequestId) : undefined

    return {
      ramp,
      shipment,
    }
  })
}

export function getAverageDurations(data: DemoData) {
  const completedRequests = data.shipmentRequests.filter((request) => request.currentStatus === 'COMPLETED')

  const approvalDurations = completedRequests
    .map((request) => {
      const statuses = data.statusHistory.filter((history) => history.shipmentRequestId === request.id)
      const created = statuses.find((item) => item.newStatus === 'REQUEST_CREATED')
      const approved = statuses.find((item) => item.newStatus === 'APPROVED')
      if (!created || !approved) {
        return undefined
      }

      return differenceInMinutes(new Date(approved.changedAt), new Date(created.changedAt))
    })
    .filter((value): value is number => typeof value === 'number')

  const gateDurations = completedRequests
    .map((request) => {
      const gateOperation = data.gateOperations.find((item) => item.shipmentRequestId === request.id)
      const rampAssignment = data.rampAssignments.find((item) => item.shipmentRequestId === request.id)
      if (!gateOperation?.arrivedAt || !rampAssignment?.assignedAt) {
        return undefined
      }

      return differenceInMinutes(new Date(gateOperation.arrivedAt), new Date(rampAssignment.assignedAt))
    })
    .filter((value): value is number => typeof value === 'number')

  const loadingDurations = completedRequests
    .map((request) => {
      const loadingOperation = data.loadingOperations.find((item) => item.shipmentRequestId === request.id)
      if (!loadingOperation?.startedAt || !loadingOperation.completedAt) {
        return undefined
      }

      return differenceInMinutes(new Date(loadingOperation.completedAt), new Date(loadingOperation.startedAt))
    })
    .filter((value): value is number => typeof value === 'number')

  return {
    averageApprovalMinutes: average(approvalDurations),
    averageGateMinutes: average(gateDurations),
    averageLoadingMinutes: average(loadingDurations),
  }
}

export function getCompanyPerformance(data: DemoData) {
  return data.companies
    .filter((company) => company.type !== 'MAIN')
    .map((company) => {
      const requests = data.shipmentRequests.filter((request) => request.assignedSupplierCompanyId === company.id)
      const completed = requests.filter((request) => request.currentStatus === 'COMPLETED').length
      const rejected = requests.filter((request) => request.currentStatus === 'REJECTED').length

      return {
        company,
        total: requests.length,
        completed,
        rejected,
        completionRate: requests.length === 0 ? 0 : Math.round((completed / requests.length) * 100),
      }
    })
    .sort((a, b) => b.completionRate - a.completionRate)
}

export function getLocationIntensity(data: DemoData) {
  return data.locations
    .map((location) => {
      const requests = data.shipmentRequests.filter((request) => request.targetLocationId === location.id)
      return {
        location,
        total: requests.length,
        active: requests.filter((request) => !TERMINAL_STATUSES.includes(request.currentStatus)).length,
      }
    })
    .sort((a, b) => b.total - a.total)
}

export function getRampUsage(data: DemoData) {
  return data.ramps
    .map((ramp) => {
      const assignments = data.rampAssignments.filter((assignment) => assignment.rampId === ramp.id)
      return {
        ramp,
        count: assignments.length,
      }
    })
    .sort((a, b) => b.count - a.count)
}

export function getUserLabel(user?: User) {
  return user ? `${formatFullName(user)} • ${user.email}` : '-'
}

export function mapAuditLogActor(log: AuditLog, data: DemoData) {
  return data.users.find((user) => user.id === log.performedByUserId)
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0
  }

  return Math.round(values.reduce((total, current) => total + current, 0) / values.length)
}

export function getShipmentFiltersSource(data: DemoData, user?: User) {
  const requests = getVisibleRequests(data, user)

  return {
    statuses: Array.from(new Set(requests.map((request) => request.currentStatus))),
    suppliers: Array.from(new Set(requests.map((request) => request.assignedSupplierCompanyId))),
    vehicleTypes: Array.from(new Set(requests.map((request) => request.vehicleType))),
    locations: Array.from(new Set(requests.map((request) => request.targetLocationId))),
  }
}

export function searchShipments(requests: ShipmentRequest[], data: DemoData, term: string) {
  if (!term.trim()) {
    return requests
  }

  const lowerTerm = term.toLowerCase()
  return requests.filter((request) => {
    const assignment = data.vehicleAssignments.find((item) => item.shipmentRequestId === request.id)
    const location = data.locations.find((item) => item.id === request.targetLocationId)
    return [
      request.requestNo,
      request.productInfo,
      request.quantityInfo,
      location?.name,
      assignment?.tractorPlate,
      assignment?.trailerPlate,
      assignment ? `${assignment.driverFirstName} ${assignment.driverLastName}` : undefined,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(lowerTerm))
  })
}

export function getShipmentSummaryLines(detail: ShipmentDetail) {
  return [
    `Tedarikci: ${detail.supplierCompany?.name ?? '-'}`,
    `Lokasyon: ${detail.location?.name ?? '-'}`,
    `Sofor: ${detail.vehicleAssignment ? `${detail.vehicleAssignment.driverFirstName} ${detail.vehicleAssignment.driverLastName}` : '-'}`,
    `Rampa: ${detail.ramp?.code ?? '-'}`,
  ]
}

function sortRequestsByLoadWindow(requests: ShipmentRequest[]) {
  return [...requests].sort((left, right) => {
    const leftTime = new Date(`${left.loadDate}T${left.loadTime}:00`).getTime()
    const rightTime = new Date(`${right.loadDate}T${right.loadTime}:00`).getTime()

    if (leftTime !== rightTime) {
      return leftTime - rightTime
    }

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  })
}

function isSeedRequest(request: ShipmentRequest) {
  return /^req-\d{3}$/.test(request.id)
}
