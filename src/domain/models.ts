export type CompanyType = 'MAIN' | 'SUPPLIER' | 'LOGISTICS'

export type RecordStatus = 'ACTIVE' | 'PASSIVE'

export type UserRoleKey =
  | 'requester'
  | 'supplier'
  | 'control'
  | 'ramp'
  | 'gate'
  | 'loading'
  | 'admin'
  | 'superadmin'

export type ShipmentStatus =
  | 'REQUEST_CREATED'
  | 'SENT_TO_SUPPLIER'
  | 'SUPPLIER_REVIEWING'
  | 'VEHICLE_ASSIGNED'
  | 'CORRECTION_REQUESTED'
  | 'VEHICLE_CANCELLED'
  | 'IN_CONTROL'
  | 'APPROVED'
  | 'RAMP_PLANNED'
  | 'ARRIVED'
  | 'ADMITTED'
  | 'AT_RAMP'
  | 'LOADING'
  | 'LOADED'
  | 'SEALED'
  | 'EXITED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED'

export type VehicleType = 'TIR' | 'KAMYON' | 'KAMYONET'

export type RampStatus = 'AVAILABLE' | 'BUSY' | 'MAINTENANCE'

export type AssignmentStatus = 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'

export type NotificationLevel = 'info' | 'success' | 'warning' | 'error'

export interface Company {
  id: string
  name: string
  type: CompanyType
  status: RecordStatus
  createdAt: string
  updatedAt: string
}

export interface Role {
  id: string
  key: UserRoleKey
  name: string
  permissions: string[]
}

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  roleId: string
  roleKey?: UserRoleKey
  companyId: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  password?: string
  mustChangePassword?: boolean
}

export interface Location {
  id: string
  name: string
  address: string
  companyId: string
  isActive: boolean
}

export interface Ramp {
  id: string
  locationId: string
  code: string
  name: string
  status: RampStatus
  isActive: boolean
}

export interface ShipmentRequest {
  id: string
  requestNo: string
  requesterCompanyId: string
  targetLocationId: string
  requestDate: string
  vehicleType: VehicleType
  loadDate: string
  loadTime: string
  quantityInfo: string
  productInfo: string
  notes: string
  currentStatus: ShipmentStatus
  assignedSupplierCompanyId: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface VehicleAssignment {
  id: string
  shipmentRequestId: string
  supplierCompanyId: string
  tractorPlate: string
  trailerPlate: string
  driverFirstName: string
  driverLastName: string
  driverPhone: string
  assignmentStatus: AssignmentStatus
  assignedBy: string
  assignedAt: string
  approvedBy?: string
  approvedAt?: string
  rejectionReason?: string
}

export interface RampAssignment {
  id: string
  shipmentRequestId: string
  rampId: string
  assignedBy: string
  assignedAt: string
  status: 'ASSIGNED' | 'RELEASED'
}

export interface GateOperation {
  id: string
  shipmentRequestId: string
  arrivedAt?: string
  checkedBy?: string
  admittedAt?: string
  rampTakenAt?: string
  notes?: string
}

export interface LoadingOperation {
  id: string
  shipmentRequestId: string
  startedAt?: string
  completedAt?: string
  sealNumber?: string
  sealedAt?: string
  finalizedBy?: string
  exitAt?: string
  notes?: string
  sealRejected?: boolean
  sealRejectionNote?: string
  sealApprovedBy?: string
  sealApprovedAt?: string
}

export interface AuditLog {
  id: string
  entityType: string
  entityId: string
  actionType: string
  oldValue: string
  newValue: string
  description: string
  performedByUserId: string
  performedAt: string
}

export interface StatusHistory {
  id: string
  shipmentRequestId: string
  oldStatus: ShipmentStatus | 'NONE'
  newStatus: ShipmentStatus
  changedBy: string
  changedAt: string
  note?: string
}

export interface NotificationItem {
  id: string
  title: string
  message: string
  level: NotificationLevel
  createdAt: string
  targetRoleKeys: UserRoleKey[]
  targetCompanyIds: string[]
  shipmentRequestId?: string
  isReadBy: string[]
}

export interface SystemSettings {
  companyName: string
  workStartHour: string
  workEndHour: string
  maxDailyShipments: number
  defaultVehicleType: VehicleType
  notificationsEnabled: boolean
  autoAssignRamp: boolean
  maintenanceMode: boolean
}

export interface DemoData {
  companies: Company[]
  users: User[]
  roles: Role[]
  locations: Location[]
  ramps: Ramp[]
  shipmentRequests: ShipmentRequest[]
  vehicleAssignments: VehicleAssignment[]
  rampAssignments: RampAssignment[]
  gateOperations: GateOperation[]
  loadingOperations: LoadingOperation[]
  auditLogs: AuditLog[]
  statusHistory: StatusHistory[]
  notifications: NotificationItem[]
  systemSettings: SystemSettings
}

export interface ShipmentDetail {
  request: ShipmentRequest
  requesterCompany?: Company
  supplierCompany?: Company
  location?: Location
  vehicleAssignment?: VehicleAssignment
  rampAssignment?: RampAssignment
  ramp?: Ramp
  gateOperation?: GateOperation
  loadingOperation?: LoadingOperation
  createdBy?: User
}

export interface NavigationItem {
  label: string
  path: string
  icon: string
  roleKeys: UserRoleKey[]
}

export interface StatusMeta {
  label: string
  tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger'
  description: string
}

export interface RoleDefinition {
  id: string
  key: UserRoleKey
  name: string
  homePath: string
  description: string
  permissions: string[]
}

export interface SessionState {
  currentUserId: string | null
  mustChangePassword?: boolean
}

export interface CreateRequestInput {
  targetLocationId: string
  vehicleType: VehicleType
  requestDate: string
  loadDate: string
  loadTime: string
  quantityInfo: string
  productInfo: string
  notes: string
  assignedSupplierCompanyId: string
}

export interface RequestRevisionInput {
  vehicleType: VehicleType
  requestDate: string
  loadDate: string
  loadTime: string
}

export interface VehicleAssignmentInput {
  tractorPlate: string
  trailerPlate: string
  driverFirstName: string
  driverLastName: string
  driverPhone: string
}

export interface ReviewDecisionInput {
  decision: 'approve' | 'reject'
  note: string
}

export interface RampPlanningInput {
  rampId: string
  note: string
}

export interface LoadingCompletionInput {
  sealNumber: string
  note: string
}

export interface CreateUserInput {
  firstName: string
  lastName: string
  email: string
  phone: string
  roleId: string
  companyId: string
  password: string
}

export interface UpdateUserInput {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  roleId?: string
  companyId?: string
}

export interface OperationResult {
  ok: boolean
  message: string
}
