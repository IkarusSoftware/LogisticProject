import type {
  AuditLogDto, AuditLogFilterParams, AuditLogStatsDto,
  BootstrapApiDto, CompanyAdminDto, NotificationApiDto, RampAdminDto,
  CancelShipmentApiInput, CompanyPerformanceApiDto,
  CreateShipmentApiRequest, CreateShipmentBatchApiRequest,
  CreateUserApiRequest, DashboardMetricApiDto,
  GateActionApiInput, LoadingCompletionApiInput, LocationIntensityApiDto,
  LoginResponse, LookupCompany, LookupLocationApiDto, LookupRampApiDto, LookupRole, LookupSettingsApiDto, LookupUserApiDto,
  OperationResultDto, PagedResult, PipelineCountApiDto,
  RampPlanningApiInput, RampUsageApiDto, ReportDurationsApiDto,
  ReviewDecisionApiInput, ReviseShipmentApiInput,
  ShipmentDetailDto, ShipmentFilterParams, ShipmentListDto,
  StatusHistoryApiDto, SystemSettingsDto,
  UpdateSystemSettingsApiRequest, UpdateUserApiRequest, UserDto,
  UserListFilterParams, UserProfile, VehicleAssignmentApiInput,
} from './types'

const TOKEN_KEY = 'flowdock_access_token'
const REFRESH_KEY = 'flowdock_refresh_token'

let accessToken: string | null = localStorage.getItem(TOKEN_KEY)
let refreshToken: string | null = localStorage.getItem(REFRESH_KEY)
let isRefreshing = false
let refreshPromise: Promise<boolean> | null = null

export function getAccessToken() {
  return accessToken
}

export function setTokens(access: string, refresh: string) {
  accessToken = access
  refreshToken = refresh
  localStorage.setItem(TOKEN_KEY, access)
  localStorage.setItem(REFRESH_KEY, refresh)
}

export function clearTokens() {
  accessToken = null
  refreshToken = null
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

export function hasTokens() {
  return !!accessToken
}

function buildQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value))
    }
  }
  return search.toString()
}

async function tryRefresh(): Promise<boolean> {
  if (!refreshToken) return false

  if (isRefreshing && refreshPromise) {
    return refreshPromise
  }

  isRefreshing = true
  refreshPromise = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })

      if (!res.ok) {
        clearTokens()
        return false
      }

      const data: LoginResponse = await res.json()
      setTokens(data.accessToken, data.refreshToken)
      return true
    } catch {
      clearTokens()
      return false
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  })()

  return refreshPromise
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> ?? {}),
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  let res = await fetch(url, { ...options, headers })

  if (res.status === 401 && refreshToken) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      headers.Authorization = `Bearer ${accessToken}`
      res = await fetch(url, { ...options, headers })
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Bilinmeyen hata' }))
    throw new ApiError(res.status, body.message ?? 'Istek basarisiz')
  }

  return res.json()
}

async function apiFetchBlob(url: string): Promise<Blob> {
  const headers: Record<string, string> = {}
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  const res = await fetch(url, { headers })
  if (!res.ok) {
    throw new ApiError(res.status, 'Export basarisiz')
  }

  return res.blob()
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  demoLogin: (userId: string) =>
    apiFetch<LoginResponse>('/api/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  refresh: () =>
    apiFetch<LoginResponse>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  logout: () =>
    apiFetch<void>('/api/auth/logout', { method: 'POST' }),

  me: () =>
    apiFetch<UserProfile>('/api/auth/me'),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiFetch<OperationResultDto>('/api/auth/change-password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
}

// Audit Log API
export const auditLogApi = {
  list: (params: AuditLogFilterParams) =>
    apiFetch<PagedResult<AuditLogDto>>(`/api/audit-logs?${buildQuery(params as Record<string, unknown>)}`),

  getById: (id: string) =>
    apiFetch<AuditLogDto>(`/api/audit-logs/${id}`),

  exportCsv: async (params: AuditLogFilterParams) => {
    const blob = await apiFetchBlob(`/api/audit-logs/export/csv?${buildQuery(params as Record<string, unknown>)}`)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  },

  stats: () =>
    apiFetch<AuditLogStatsDto[]>('/api/audit-logs/stats'),
}

// User API
export const userApi = {
  list: (params: UserListFilterParams) =>
    apiFetch<PagedResult<UserDto>>(`/api/users?${buildQuery(params as Record<string, unknown>)}`),

  getById: (id: string) =>
    apiFetch<UserDto>(`/api/users/${id}`),

  create: (data: CreateUserApiRequest) =>
    apiFetch<OperationResultDto>('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateUserApiRequest) =>
    apiFetch<OperationResultDto>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  toggleStatus: (id: string) =>
    apiFetch<OperationResultDto>(`/api/users/${id}/status`, {
      method: 'PATCH',
    }),

  delete: (id: string) =>
    apiFetch<OperationResultDto>(`/api/users/${id}`, {
      method: 'DELETE',
    }),
}

// System Settings API
export const settingsApi = {
  get: () =>
    apiFetch<SystemSettingsDto>('/api/system-settings'),

  update: (data: UpdateSystemSettingsApiRequest) =>
    apiFetch<OperationResultDto>('/api/system-settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
}

// Lookup API
export const lookupApi = {
  roles: () =>
    apiFetch<LookupRole[]>('/api/lookup/roles'),

  companies: () =>
    apiFetch<LookupCompany[]>('/api/lookup/companies'),

  users: () =>
    apiFetch<LookupUserApiDto[]>('/api/lookup/users'),

  locations: () =>
    apiFetch<LookupLocationApiDto[]>('/api/lookup/locations'),

  ramps: () =>
    apiFetch<LookupRampApiDto[]>('/api/lookup/ramps'),

  settings: () =>
    apiFetch<LookupSettingsApiDto>('/api/lookup/settings'),

  bootstrap: () =>
    apiFetch<BootstrapApiDto>('/api/lookup/bootstrap'),
}

// Shipment API
export const shipmentApi = {
  list: (params: ShipmentFilterParams) =>
    apiFetch<PagedResult<ShipmentListDto>>(`/api/shipments?${buildQuery(params as Record<string, unknown>)}`),

  getById: (id: string) =>
    apiFetch<ShipmentDetailDto>(`/api/shipments/${id}`),

  create: (data: CreateShipmentApiRequest) =>
    apiFetch<OperationResultDto>('/api/shipments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  createBatch: (data: CreateShipmentBatchApiRequest) =>
    apiFetch<OperationResultDto>('/api/shipments/batch', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  revise: (id: string, data: ReviseShipmentApiInput) =>
    apiFetch<OperationResultDto>(`/api/shipments/${id}/revise`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  cancel: (id: string, data: CancelShipmentApiInput) =>
    apiFetch<OperationResultDto>(`/api/shipments/${id}/cancel`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  cancelVehicle: (id: string) =>
    apiFetch<OperationResultDto>(`/api/shipments/${id}/cancel-vehicle`, {
      method: 'PUT',
    }),

  beginReview: (id: string) =>
    apiFetch<OperationResultDto>(`/api/shipments/${id}/begin-review`, {
      method: 'PUT',
    }),

  submitVehicleAssignment: (id: string, data: VehicleAssignmentApiInput) =>
    apiFetch<OperationResultDto>(`/api/shipments/${id}/vehicle-assignment`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  acceptCorrection: (id: string) =>
    apiFetch<OperationResultDto>(`/api/shipments/${id}/accept-correction`, {
      method: 'PUT',
    }),

  requestCorrection: (id: string, note: string) =>
    apiFetch<OperationResultDto>(`/api/shipments/${id}/request-correction`, {
      method: 'PUT',
      body: JSON.stringify({ note }),
    }),

  registerVehicle: (id: string, note?: string) =>
    apiFetch<OperationResultDto>(`/api/shipments/${id}/register-vehicle`, {
      method: 'PUT',
      body: JSON.stringify({ note }),
    }),

  review: (id: string, data: ReviewDecisionApiInput) =>
    apiFetch<OperationResultDto>(`/api/shipments/${id}/review`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  assignRamp: (id: string, data: RampPlanningApiInput) =>
    apiFetch<OperationResultDto>(`/api/shipments/${id}/assign-ramp`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  gateAction: (id: string, data: GateActionApiInput) =>
    apiFetch<OperationResultDto>(`/api/shipments/${id}/gate-action`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  finalize: (id: string, data: LoadingCompletionApiInput) =>
    apiFetch<OperationResultDto>(`/api/shipments/${id}/finalize`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  clearActive: () =>
    apiFetch<OperationResultDto>('/api/shipments/active', { method: 'DELETE' }),

  getHistory: (id: string) =>
    apiFetch<StatusHistoryApiDto[]>(`/api/shipments/${id}/history`),

  getAudit: (id: string) =>
    apiFetch<AuditLogDto[]>(`/api/shipments/${id}/audit`),
}

// Dashboard API
export const dashboardApi = {
  metrics: () =>
    apiFetch<DashboardMetricApiDto[]>('/api/dashboard/metrics'),

  pipeline: () =>
    apiFetch<PipelineCountApiDto[]>('/api/dashboard/pipeline'),
}

// Report API
export const reportApi = {
  durations: () =>
    apiFetch<ReportDurationsApiDto>('/api/reports/durations'),

  companies: () =>
    apiFetch<CompanyPerformanceApiDto[]>('/api/reports/companies'),

  locations: () =>
    apiFetch<LocationIntensityApiDto[]>('/api/reports/locations'),

  ramps: () =>
    apiFetch<RampUsageApiDto[]>('/api/reports/ramps'),
}

// Notification API
export const notificationApi = {
  list: () =>
    apiFetch<NotificationApiDto[]>('/api/notifications'),

  unreadCount: () =>
    apiFetch<{ count: number }>('/api/notifications/unread-count'),

  markAllRead: () =>
    apiFetch<void>('/api/notifications/read-all', { method: 'PUT' }),

  markOneRead: (id: string) =>
    apiFetch<void>(`/api/notifications/${id}/read`, { method: 'PUT' }),
}

// Admin API
export const adminApi = {
  listCompanies: () =>
    apiFetch<CompanyAdminDto[]>('/api/admin/companies'),

  toggleCompanyStatus: (id: string) =>
    apiFetch<OperationResultDto>(`/api/admin/companies/${id}/status`, { method: 'PATCH' }),

  listRamps: () =>
    apiFetch<RampAdminDto[]>('/api/admin/ramps'),

  toggleRampStatus: (id: string) =>
    apiFetch<OperationResultDto>(`/api/admin/ramps/${id}/status`, { method: 'PATCH' }),
}

// Ramp API
export const rampApi = {
  byLocation: (locationId: string) =>
    apiFetch<Array<{ id: string; code: string; name: string; status: string; isActive: boolean }>>(`/api/ramps/by-location/${locationId}`),

  occupancy: () =>
    apiFetch<Array<{ rampId: string; rampCode: string; rampName: string; locationName: string; isOccupied: boolean; shipmentRequestNo: string | null }>>('/api/ramps/occupancy'),
}
