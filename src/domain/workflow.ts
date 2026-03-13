import { format } from 'date-fns'

import { ROLE_DEFINITIONS, STATUS_META, TERMINAL_STATUSES } from './constants'
import type { ShipmentRequest, ShipmentStatus, User, UserRoleKey, VehicleAssignment } from './models'

export function getRoleDefinition(roleKey: UserRoleKey) {
  return ROLE_DEFINITIONS.find((role) => role.key === roleKey)
}

export function getRoleKeyByRoleId(roleId: string) {
  return ROLE_DEFINITIONS.find((role) => role.id === roleId)?.key
}

export function getStatusMeta(status: ShipmentStatus) {
  return STATUS_META[status]
}

export function formatDateLabel(value?: string) {
  if (!value) {
    return '-'
  }

  return format(new Date(value), 'dd.MM.yyyy')
}

export function formatTimeLabel(value?: string) {
  if (!value) {
    return '-'
  }

  if (value.length === 5) {
    return value
  }

  return format(new Date(value), 'HH:mm')
}

export function formatDateTimeLabel(value?: string) {
  if (!value) {
    return '-'
  }

  return format(new Date(value), 'dd.MM.yyyy HH:mm')
}

export function formatFullName(user?: Pick<User, 'firstName' | 'lastName'>) {
  if (!user) {
    return '-'
  }

  return `${user.firstName} ${user.lastName}`
}

export function getUserInitials(user?: Pick<User, 'firstName' | 'lastName'>) {
  if (!user) {
    return 'NA'
  }

  return `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()
}

export function normalizePlate(value: string) {
  return value
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase()
}

export function isValidPlate(value: string) {
  const normalized = normalizePlate(value)
  return /^(\d{2})\s?[A-Z]{1,3}\s?(\d{2,4})$/.test(normalized)
}

export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '')
  if (digits.startsWith('90') && digits.length === 12) {
    return `+${digits}`
  }

  if (digits.length === 10) {
    return `+90${digits}`
  }

  return value
}

export function isValidPhone(value: string) {
  const digits = normalizePhone(value).replace(/\D/g, '')
  return digits.length === 12 && digits.startsWith('90')
}

export function formatPhoneLabel(value?: string) {
  if (!value) {
    return '-'
  }

  const digits = normalizePhone(value).replace(/\D/g, '')
  if (digits.length !== 12) {
    return value
  }

  return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`
}

export function isTerminalStatus(status: ShipmentStatus) {
  return TERMINAL_STATUSES.includes(status)
}

export function canCancelRequest(request: ShipmentRequest) {
  return !['COMPLETED', 'REJECTED', 'CANCELLED', 'AT_RAMP', 'LOADING', 'LOADED', 'SEALED', 'EXITED'].includes(
    request.currentStatus,
  )
}

export function getVehicleAssignmentCompleteness(assignment?: VehicleAssignment) {
  if (!assignment) {
    return 0
  }

  const values = [
    assignment.tractorPlate,
    assignment.trailerPlate,
    assignment.driverFirstName,
    assignment.driverLastName,
    assignment.driverPhone,
  ]

  const filledCount = values.filter(Boolean).length
  return Math.round((filledCount / values.length) * 100)
}

export function isDelayed(request: ShipmentRequest) {
  if (isTerminalStatus(request.currentStatus)) {
    return false
  }

  const planned = new Date(`${request.loadDate}T${request.loadTime}:00`)
  return planned.getTime() + 60 * 60 * 1000 < Date.now()
}

export function ensureStatusTransition(
  currentStatus: ShipmentStatus,
  expectedStatuses: ShipmentStatus[],
  errorMessage: string,
) {
  if (!expectedStatuses.includes(currentStatus)) {
    throw new Error(errorMessage)
  }
}
