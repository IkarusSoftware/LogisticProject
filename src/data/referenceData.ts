import { buildCompanies, buildDefaultSystemSettings, buildLocations, buildRamps, buildRoles, buildUsers } from './helpers'

export function buildReferenceData(now: Date) {
  return {
    companies: buildCompanies(now),
    roles: buildRoles(),
    users: buildUsers(now),
    locations: buildLocations(),
    ramps: buildRamps(),
    systemSettings: buildDefaultSystemSettings(),
  }
}
