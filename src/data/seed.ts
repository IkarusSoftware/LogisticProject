import type { DemoData } from '../domain/models'
import { buildReferenceData } from './referenceData'
import { DEMO_PASSWORD } from './helpers'

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
    notifications: [],
  }
}
