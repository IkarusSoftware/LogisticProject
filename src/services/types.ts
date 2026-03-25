export interface UserProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  roleKey: string
  roleName: string
  companyId: string
  companyName: string
  mustChangePassword?: boolean
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  expiresAt: string
  user: UserProfile
}

export interface AuditLogDto {
  id: string
  entityType: string
  entityId: string
  actionType: string
  oldValue: string
  newValue: string
  description: string
  performedByUserId: string
  performedByName: string
  performedAt: string
}

export interface PagedResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

export interface AuditLogFilterParams {
  entityType?: string
  actionType?: string
  performedByUserId?: string
  search?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortDirection?: string
}

export interface AuditLogStatsDto {
  actionType: string
  count: number
}

// User Management
export interface UserDto {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  roleKey: string
  roleName: string
  companyId: string
  companyName: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateUserApiRequest {
  firstName: string
  lastName: string
  email: string
  phone: string
  roleKey: string
  companyId: string
  password?: string
}

export interface UpdateUserApiRequest {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  roleKey?: string
  companyId?: string
}

export interface UserListFilterParams {
  search?: string
  isActive?: boolean
  page?: number
  pageSize?: number
}

// System Settings
export interface SystemSettingsDto {
  id: string
  companyName: string
  workStartHour: string
  workEndHour: string
  maxDailyShipments: number
  defaultVehicleType: string
  notificationsEnabled: boolean
  autoAssignRamp: boolean
  maintenanceMode: boolean
}

export interface UpdateSystemSettingsApiRequest {
  companyName?: string
  workStartHour?: string
  workEndHour?: string
  maxDailyShipments?: number
  defaultVehicleType?: string
  notificationsEnabled?: boolean
  autoAssignRamp?: boolean
  maintenanceMode?: boolean
}

// Lookup
export interface LookupRole {
  id: string
  key: string
  name: string
}

export interface LookupCompany {
  id: string
  name: string
  type: string
}

// Lookup — Bootstrap
export interface LookupLocationApiDto {
  id: string
  name: string
  address: string
  companyId: string
  isActive: boolean
}

export interface LookupRampApiDto {
  id: string
  locationId: string
  code: string
  name: string
  status: string
  isActive: boolean
}

export interface LookupUserApiDto {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  roleId: string
  roleKey: string
  companyId: string
  isActive: boolean
}

export interface LookupSettingsApiDto {
  id: string
  companyName: string
  workStartHour: string
  workEndHour: string
  maxDailyShipments: number
  defaultVehicleType: string
  notificationsEnabled: boolean
  autoAssignRamp: boolean
  maintenanceMode: boolean
}

export interface LookupRoleApiDto {
  id: string
  key: string
  name: string
  permissions: string[]
}

export interface LookupCompanyApiDto {
  id: string
  name: string
  type: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface BootstrapApiDto {
  companies: LookupCompanyApiDto[]
  roles: LookupRoleApiDto[]
  users: LookupUserApiDto[]
  locations: LookupLocationApiDto[]
  ramps: LookupRampApiDto[]
  settings: LookupSettingsApiDto
}

// Notification
export interface NotificationApiDto {
  id: string
  title: string
  message: string
  level: 'info' | 'success' | 'warning' | 'error'
  createdAt: string
  targetRoleKeys: string[]
  targetCompanyIds: string[]
  shipmentRequestId: string | null
  isRead: boolean
}

// Admin
export interface CompanyAdminDto {
  id: string
  name: string
  type: string
  status: 'ACTIVE' | 'PASSIVE'
}

export interface RampAdminDto {
  id: string
  code: string
  name: string
  locationName: string
  isActive: boolean
}

// Common
export interface OperationResultDto {
  ok: boolean
  message: string
}

// ── Shipment ──

export interface ShipmentListDto {
  id: string
  requestNo: string
  currentStatus: string
  requesterCompanyName: string
  supplierCompanyName: string
  locationName: string
  vehicleType: string
  loadDate: string
  loadTime: string
  productInfo: string
  quantityInfo: string
  tractorPlate: string | null
  driverName: string | null
  rampCode: string | null
  createdAt: string
  updatedAt: string
}

export interface ShipmentDetailDto {
  id: string
  requestNo: string
  currentStatus: string
  requesterCompanyId: string
  requesterCompanyName: string
  assignedSupplierCompanyId: string
  supplierCompanyName: string
  targetLocationId: string
  locationName: string
  vehicleType: string
  requestDate: string
  loadDate: string
  loadTime: string
  quantityInfo: string
  productInfo: string
  notes: string
  createdByName: string
  createdBy: string
  createdAt: string
  updatedAt: string
  vehicleAssignment: VehicleAssignmentApiDto | null
  rampAssignment: RampAssignmentApiDto | null
  gateOperation: GateOperationApiDto | null
  loadingOperation: LoadingOperationApiDto | null
}

export interface VehicleAssignmentApiDto {
  id: string
  tractorPlate: string
  trailerPlate: string
  driverFirstName: string
  driverLastName: string
  driverPhone: string
  assignmentStatus: string
  assignedAt: string
  approvedAt: string | null
  rejectionReason: string | null
}

export interface RampAssignmentApiDto {
  id: string
  rampId: string
  rampCode: string
  rampName: string
  assignedAt: string
  status: string
}

export interface GateOperationApiDto {
  id: string
  arrivedAt: string | null
  admittedAt: string | null
  rampTakenAt: string | null
  notes: string | null
}

export interface LoadingOperationApiDto {
  id: string
  startedAt: string | null
  completedAt: string | null
  sealNumber: string | null
  sealedAt: string | null
  exitAt: string | null
  notes: string | null
}

export interface StatusHistoryApiDto {
  id: string
  oldStatus: string
  newStatus: string
  changedByName: string
  changedAt: string
  note: string | null
}

// Shipment Inputs
export interface CreateShipmentApiRequest {
  targetLocationId: string
  assignedSupplierCompanyId: string
  vehicleType: string
  requestDate: string
  loadDate: string
  loadTime: string
  quantityInfo: string
  productInfo: string
  notes: string
}

export interface CreateShipmentBatchApiRequest {
  items: CreateShipmentApiRequest[]
}

export interface ReviseShipmentApiInput {
  vehicleType: string
  requestDate: string
  loadDate: string
  loadTime: string
}

export interface CancelShipmentApiInput {
  note?: string
}

export interface VehicleAssignmentApiInput {
  tractorPlate: string
  trailerPlate: string
  driverFirstName: string
  driverLastName: string
  driverPhone: string
}

export interface ReviewDecisionApiInput {
  decision: string
  note: string
}

export interface RampPlanningApiInput {
  rampId: string
  note?: string
}

export interface GateActionApiInput {
  action: string
  note?: string
}

export interface LoadingCompletionApiInput {
  sealNumber: string
  note?: string
}

export interface ShipmentFilterParams {
  status?: string
  terminal?: boolean
  locationId?: string
  supplierId?: string
  vehicleType?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  page?: number
  pageSize?: number
}

// Dashboard
export interface DashboardMetricApiDto {
  key: string
  label: string
  value: number
  tone: string
}

export interface PipelineCountApiDto {
  status: string
  label: string
  count: number
}

// Reports
export interface ReportDurationsApiDto {
  averageApprovalMinutes: number
  averageGateMinutes: number
  averageLoadingMinutes: number
}

export interface CompanyPerformanceApiDto {
  companyId: string
  companyName: string
  total: number
  completed: number
  rejected: number
  completionRate: number
}

export interface LocationIntensityApiDto {
  locationId: string
  locationName: string
  total: number
  active: number
}

export interface RampUsageApiDto {
  rampId: string
  rampCode: string
  rampName: string
  locationName: string
  assignmentCount: number
  currentShipmentRequestNo: string | null
}
