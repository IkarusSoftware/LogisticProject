import { addMinutes, format } from 'date-fns'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { buildInitialData } from '../data/seed'
import { TERMINAL_STATUSES } from '../domain/constants'
import { getCurrentUser, getNotificationsForUser } from '../domain/selectors'
import type {
  CreateRequestInput,
  DemoData,
  LoadingCompletionInput,
  NotificationItem,
  OperationResult,
  RampPlanningInput,
  ReviewDecisionInput,
  SessionState,
  ShipmentRequest,
  ShipmentStatus,
  User,
  VehicleAssignmentInput,
} from '../domain/models'
import {
  canCancelRequest,
  ensureStatusTransition,
  isValidPhone,
  isValidPlate,
  normalizePhone,
  normalizePlate,
} from '../domain/workflow'

type GateAction = 'arrive' | 'admit' | 'takeToRamp' | 'startLoading'

type AppStore = {
  data: DemoData
  session: SessionState
  loginWithEmail: (email: string, password: string) => OperationResult
  loginAs: (userId: string) => OperationResult
  logout: () => void
  resetDemo: () => void
  markAllNotificationsRead: () => void
  createShipmentRequest: (input: CreateRequestInput) => OperationResult
  cancelRequest: (shipmentRequestId: string, note: string) => OperationResult
  beginSupplierReview: (shipmentRequestId: string) => OperationResult
  submitVehicleAssignment: (shipmentRequestId: string, input: VehicleAssignmentInput) => OperationResult
  rejectBySupplier: (shipmentRequestId: string, reason: string) => OperationResult
  reviewVehicleAssignment: (shipmentRequestId: string, input: ReviewDecisionInput) => OperationResult
  assignRamp: (shipmentRequestId: string, input: RampPlanningInput) => OperationResult
  recordGateAction: (shipmentRequestId: string, action: GateAction, note: string) => OperationResult
  finalizeLoading: (shipmentRequestId: string, input: LoadingCompletionInput) => OperationResult
  toggleCompanyStatus: (companyId: string) => void
  toggleUserActive: (userId: string) => void
  toggleRampActive: (rampId: string) => void
}

const initialData = buildInitialData()

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      data: initialData,
      session: {
        currentUserId: 'user-admin-eda',
      },

      loginWithEmail: (email, password) => {
        let result: OperationResult = { ok: false, message: 'Giris yapilamadi.' }
        set((state) => {
          const user = state.data.users.find((item) => item.email.toLowerCase() === email.trim().toLowerCase())
          if (!user) {
            result = { ok: false, message: 'Bu e-posta ile kayitli demo kullanici bulunamadi.' }
            return {}
          }

          if (password !== 'demo123') {
            result = { ok: false, message: 'Demo sifresi demo123 olmali.' }
            return {}
          }

          result = { ok: true, message: `${user.firstName} ${user.lastName} olarak giris yapildi.` }
          return { session: { currentUserId: user.id } }
        })
        return result
      },

      loginAs: (userId) => {
        const user = get().data.users.find((item) => item.id === userId)
        if (!user) {
          return { ok: false, message: 'Kullanici bulunamadi.' }
        }

        set({ session: { currentUserId: user.id } })
        return { ok: true, message: `${user.firstName} ${user.lastName} olarak giris yapildi.` }
      },

      logout: () => set({ session: { currentUserId: null } }),

      resetDemo: () =>
        set({
          data: buildInitialData(),
          session: { currentUserId: 'user-admin-eda' },
        }),

      markAllNotificationsRead: () =>
        set((state) => {
          const data = structuredClone(state.data)
          const user = getCurrentUser(data, state.session.currentUserId)
          if (!user) {
            return {}
          }

          const visibleIds = new Set(getNotificationsForUser(data, user).map((item) => item.id))
          data.notifications = data.notifications.map((item) =>
            visibleIds.has(item.id) && !item.isReadBy.includes(user.id)
              ? { ...item, isReadBy: [...item.isReadBy, user.id] }
              : item,
          )
          return { data }
        }),

      createShipmentRequest: (input) => withMutation(set, (data, actor) => {
        const roleKey = actor.roleId === 'role-admin' ? 'admin' : actor.roleId === 'role-requester' ? 'requester' : undefined
        if (!['requester', 'admin'].includes(roleKey ?? '')) {
          throw new Error('Bu islem icin talep olusturma yetkiniz yok.')
        }

        const now = new Date()
        const nextNumber = data.shipmentRequests.length + 1
        const requestNo = `SR-${format(now, 'yyMMdd')}-${String(nextNumber).padStart(3, '0')}`

        const request: ShipmentRequest = {
          id: `req-${nextNumber.toString().padStart(3, '0')}-${now.getTime()}`,
          requestNo,
          requesterCompanyId: actor.companyId,
          targetLocationId: input.targetLocationId,
          requestDate: format(now, 'yyyy-MM-dd'),
          vehicleType: input.vehicleType,
          loadDate: input.loadDate,
          loadTime: input.loadTime,
          quantityInfo: input.quantityInfo,
          productInfo: input.productInfo,
          notes: input.notes,
          currentStatus: 'SENT_TO_SUPPLIER',
          assignedSupplierCompanyId: input.assignedSupplierCompanyId,
          createdBy: actor.id,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        }

        data.shipmentRequests.unshift(request)
        pushStatusTransition(data, request, 'NONE', 'REQUEST_CREATED', actor.id, 'Talep kaydi olusturuldu.', now)
        pushStatusTransition(data, request, 'REQUEST_CREATED', 'SENT_TO_SUPPLIER', actor.id, 'Talep tedarikciye gonderildi.', addMinutes(now, 1))
        pushNotification(data, {
          title: 'Yeni tir talebi',
          message: `${requestNo} talebi aksiyon bekliyor.`,
          level: 'info',
          shipmentRequestId: request.id,
          targetRoleKeys: ['supplier'],
          targetCompanyIds: [request.assignedSupplierCompanyId],
        })

        return { ok: true, message: `${requestNo} talebi olusturuldu ve tedarikciye gonderildi.` }
      }),

      cancelRequest: (shipmentRequestId, note) =>
        withMutation(set, (data, actor) => {
          const request = requireRequest(data, shipmentRequestId)
          if (!canCancelRequest(request)) {
            throw new Error('Bu asamadan sonra talep iptal edilemez.')
          }

          pushStatusTransition(data, request, request.currentStatus, 'CANCELLED', actor.id, note || 'Talep iptal edildi.')
          pushNotification(data, {
            title: 'Talep iptal edildi',
            message: `${request.requestNo} talebi iptal edildi.`,
            level: 'warning',
            shipmentRequestId,
            targetRoleKeys: ['supplier', 'admin'],
            targetCompanyIds: [request.assignedSupplierCompanyId, request.requesterCompanyId],
          })

          return { ok: true, message: 'Talep iptal edildi.' }
        }),

      beginSupplierReview: (shipmentRequestId) =>
        withMutation(set, (data, actor) => {
          const request = requireRequest(data, shipmentRequestId)
          ensureStatusTransition(request.currentStatus, ['SENT_TO_SUPPLIER'], 'Talep zaten incelemeye alinmis.')
          pushStatusTransition(data, request, request.currentStatus, 'SUPPLIER_REVIEWING', actor.id, 'Talep incelemeye alindi.')
          return { ok: true, message: 'Talep incelemeye alindi.' }
        }),

      submitVehicleAssignment: (shipmentRequestId, input) =>
        withMutation(set, (data, actor) => {
          const request = requireRequest(data, shipmentRequestId)
          if (!input.driverFirstName || !input.driverLastName) {
            throw new Error('Sofor adi ve soyadi zorunludur.')
          }

          if (!isValidPlate(input.tractorPlate) || !isValidPlate(input.trailerPlate)) {
            throw new Error('Plaka formatini 34 ABC 123 veya 34 AB 1234 seklinde girin.')
          }

          if (!isValidPhone(input.driverPhone)) {
            throw new Error('Telefon numarasini +90 ile veya 10 haneli olarak girin.')
          }

          if (request.currentStatus === 'SENT_TO_SUPPLIER') {
            pushStatusTransition(data, request, request.currentStatus, 'SUPPLIER_REVIEWING', actor.id, 'Talep incelemeye alindi.')
          }

          const now = new Date()
          const assignment = data.vehicleAssignments.find((item) => item.shipmentRequestId === shipmentRequestId)
          const normalizedAssignment = {
            id: assignment?.id ?? `va-${shipmentRequestId}`,
            shipmentRequestId,
            supplierCompanyId: actor.companyId,
            tractorPlate: normalizePlate(input.tractorPlate),
            trailerPlate: normalizePlate(input.trailerPlate),
            driverFirstName: input.driverFirstName.trim(),
            driverLastName: input.driverLastName.trim(),
            driverPhone: normalizePhone(input.driverPhone),
            assignmentStatus: 'SUBMITTED' as const,
            assignedBy: actor.id,
            assignedAt: now.toISOString(),
          }

          if (assignment) {
            data.vehicleAssignments = data.vehicleAssignments.map((item) =>
              item.id === assignment.id ? { ...assignment, ...normalizedAssignment } : item,
            )
          } else {
            data.vehicleAssignments.unshift(normalizedAssignment)
          }

          pushAudit(data, {
            entityType: 'VehicleAssignment',
            entityId: shipmentRequestId,
            actionType: 'vehicle_assignment_saved',
            oldValue: assignment ? `${assignment.tractorPlate} / ${assignment.driverFirstName}` : '-',
            newValue: `${normalizedAssignment.tractorPlate} / ${normalizedAssignment.driverFirstName}`,
            description: 'Arac ve sofor bilgileri kaydedildi.',
            performedByUserId: actor.id,
            performedAt: now.toISOString(),
          })

          pushStatusTransition(data, request, request.currentStatus, 'VEHICLE_ASSIGNED', actor.id, 'Arac ve sofor bilgileri onaya gonderildi.')
          pushNotification(data, {
            title: 'Onay bekleyen arac',
            message: `${request.requestNo} icin arac dogrulamasi bekleniyor.`,
            level: 'info',
            shipmentRequestId,
            targetRoleKeys: ['control', 'admin'],
            targetCompanyIds: [request.requesterCompanyId],
          })

          return { ok: true, message: 'Arac ve sofor bilgileri onaya gonderildi.' }
        }),

      rejectBySupplier: (shipmentRequestId, reason) =>
        withMutation(set, (data, actor) => {
          const request = requireRequest(data, shipmentRequestId)
          pushStatusTransition(data, request, request.currentStatus, 'REJECTED', actor.id, reason || 'Tedarikci kaydi reddetti.')
          pushNotification(data, {
            title: 'Talep reddedildi',
            message: `${request.requestNo} red nedeni: ${reason || 'Kayit reddedildi.'}`,
            level: 'error',
            shipmentRequestId,
            targetRoleKeys: ['requester', 'admin'],
            targetCompanyIds: [request.requesterCompanyId],
          })

          return { ok: true, message: 'Talep reddedildi.' }
        }),

      reviewVehicleAssignment: (shipmentRequestId, input) =>
        withMutation(set, (data, actor) => {
          const request = requireRequest(data, shipmentRequestId)
          const assignment = data.vehicleAssignments.find((item) => item.shipmentRequestId === shipmentRequestId)
          if (!assignment) {
            throw new Error('Onaylanacak arac kaydi bulunamadi.')
          }

          if (request.currentStatus === 'VEHICLE_ASSIGNED') {
            pushStatusTransition(data, request, request.currentStatus, 'IN_CONTROL', actor.id, 'Kayit kontrole alindi.')
          }

          ensureStatusTransition(request.currentStatus, ['IN_CONTROL'], 'Kayit kontrol asamasinda degil.')
          const now = new Date().toISOString()
          data.vehicleAssignments = data.vehicleAssignments.map((item) =>
            item.id === assignment.id
              ? {
                  ...item,
                  assignmentStatus: input.decision === 'approve' ? 'APPROVED' : 'REJECTED',
                  approvedBy: actor.id,
                  approvedAt: now,
                  rejectionReason: input.decision === 'reject' ? input.note : undefined,
                }
              : item,
          )

          if (input.decision === 'approve') {
            pushStatusTransition(data, request, request.currentStatus, 'APPROVED', actor.id, input.note || 'Arac bilgileri onaylandi.')
            pushNotification(data, {
              title: 'Rampa planlama bekliyor',
              message: `${request.requestNo} icin rampa atamasi yapin.`,
              level: 'info',
              shipmentRequestId,
              targetRoleKeys: ['ramp', 'admin'],
              targetCompanyIds: [request.requesterCompanyId],
            })
            return { ok: true, message: 'Arac bilgileri onaylandi.' }
          }

          pushStatusTransition(data, request, request.currentStatus, 'REJECTED', actor.id, input.note || 'Arac kaydi reddedildi.')
          pushNotification(data, {
            title: 'Arac kaydi reddedildi',
            message: `${request.requestNo} red nedeni: ${input.note || 'Kontrol tarafindan reddedildi.'}`,
            level: 'error',
            shipmentRequestId,
            targetRoleKeys: ['supplier', 'requester', 'admin'],
            targetCompanyIds: [request.assignedSupplierCompanyId, request.requesterCompanyId],
          })
          return { ok: true, message: 'Arac kaydi reddedildi.' }
        }),

      assignRamp: (shipmentRequestId, input) =>
        withMutation(set, (data, actor) => {
          const request = requireRequest(data, shipmentRequestId)
          ensureStatusTransition(request.currentStatus, ['APPROVED'], 'Rampa atamasi icin kaydin onaylanmis olmasi gerekir.')

          const ramp = data.ramps.find((item) => item.id === input.rampId && item.isActive)
          if (!ramp) {
            throw new Error('Secilen rampa kullanima uygun degil.')
          }

          const conflicting = data.rampAssignments.find((assignment) => {
            if (assignment.rampId !== input.rampId || assignment.shipmentRequestId === shipmentRequestId) {
              return false
            }
            const existingRequest = data.shipmentRequests.find((item) => item.id === assignment.shipmentRequestId)
            return (
              existingRequest &&
              !TERMINAL_STATUSES.includes(existingRequest.currentStatus) &&
              existingRequest.loadDate === request.loadDate &&
              existingRequest.loadTime === request.loadTime
            )
          })

          if (conflicting) {
            throw new Error('Ayni tarih ve saat icin bu rampa dolu gorunuyor.')
          }

          const now = new Date().toISOString()
          const existingAssignment = data.rampAssignments.find((item) => item.shipmentRequestId === shipmentRequestId)
          if (existingAssignment) {
            data.rampAssignments = data.rampAssignments.map((item) =>
              item.shipmentRequestId === shipmentRequestId
                ? { ...item, rampId: input.rampId, assignedAt: now, assignedBy: actor.id, status: 'ASSIGNED' }
                : item,
            )
          } else {
            data.rampAssignments.unshift({
              id: `ra-${shipmentRequestId}`,
              shipmentRequestId,
              rampId: input.rampId,
              assignedBy: actor.id,
              assignedAt: now,
              status: 'ASSIGNED',
            })
          }

          pushAudit(data, {
            entityType: 'RampAssignment',
            entityId: shipmentRequestId,
            actionType: 'ramp_assigned',
            oldValue: existingAssignment?.rampId ?? '-',
            newValue: input.rampId,
            description: input.note || 'Rampa atamasi yapildi.',
            performedByUserId: actor.id,
            performedAt: now,
          })
          pushStatusTransition(data, request, request.currentStatus, 'RAMP_PLANNED', actor.id, input.note || `${ramp.code} rampasina atandi.`)
          pushNotification(data, {
            title: 'Rampa atamasi yapildi',
            message: `${request.requestNo} icin ${ramp.code} atandi.`,
            level: 'success',
            shipmentRequestId,
            targetRoleKeys: ['gate', 'admin'],
            targetCompanyIds: [request.requesterCompanyId],
          })
          return { ok: true, message: `${ramp.code} rampasi atandi.` }
        }),

      recordGateAction: (shipmentRequestId, action, note) =>
        withMutation(set, (data, actor) => {
          const request = requireRequest(data, shipmentRequestId)
          const rampAssignment = data.rampAssignments.find((item) => item.shipmentRequestId === shipmentRequestId)
          const now = new Date()
          const gateOperation = data.gateOperations.find((item) => item.shipmentRequestId === shipmentRequestId)
          const currentGate = gateOperation ?? {
            id: `go-${shipmentRequestId}`,
            shipmentRequestId,
          }

          switch (action) {
            case 'arrive':
              ensureStatusTransition(request.currentStatus, ['RAMP_PLANNED'], 'Aracin once rampa planlanmis olmasi gerekir.')
              currentGate.arrivedAt = now.toISOString()
              currentGate.checkedBy = actor.id
              currentGate.notes = note
              pushStatusTransition(data, request, request.currentStatus, 'ARRIVED', actor.id, note || 'Arac tesise geldi olarak isaretlendi.', now)
              break
            case 'admit':
              ensureStatusTransition(request.currentStatus, ['ARRIVED'], 'Araci once tesise geldi olarak isaretleyin.')
              currentGate.admittedAt = now.toISOString()
              currentGate.checkedBy = actor.id
              currentGate.notes = note
              pushStatusTransition(data, request, request.currentStatus, 'ADMITTED', actor.id, note || 'Arac sahaya giris yapti.', now)
              break
            case 'takeToRamp':
              ensureStatusTransition(request.currentStatus, ['ADMITTED'], 'Araci once sahaya giris yaptirin.')
              if (!rampAssignment) {
                throw new Error('Rampaya alma icin once rampa atamasi yapilmis olmali.')
              }
              currentGate.rampTakenAt = now.toISOString()
              currentGate.checkedBy = actor.id
              currentGate.notes = note
              pushStatusTransition(data, request, request.currentStatus, 'AT_RAMP', actor.id, note || 'Arac rampaya alindi.', now)
              break
            case 'startLoading':
              ensureStatusTransition(request.currentStatus, ['AT_RAMP'], 'Araci once rampaya alin.')
              pushStatusTransition(data, request, request.currentStatus, 'LOADING', actor.id, note || 'Yukleme baslatildi.', now)
              const loading = data.loadingOperations.find((item) => item.shipmentRequestId === shipmentRequestId)
              if (loading) {
                loading.startedAt = now.toISOString()
                loading.notes = note
              } else {
                data.loadingOperations.unshift({
                  id: `lo-${shipmentRequestId}`,
                  shipmentRequestId,
                  startedAt: now.toISOString(),
                  notes: note,
                })
              }
              break
          }

          if (gateOperation) {
            data.gateOperations = data.gateOperations.map((item) => (item.shipmentRequestId === shipmentRequestId ? currentGate : item))
          } else {
            data.gateOperations.unshift(currentGate)
          }

          return { ok: true, message: gateActionMessages[action] }
        }),

      finalizeLoading: (shipmentRequestId, input) =>
        withMutation(set, (data, actor) => {
          const request = requireRequest(data, shipmentRequestId)
          ensureStatusTransition(request.currentStatus, ['LOADING'], 'Islemi tamamlamak icin kaydin yukleniyor statüsünde olmasi gerekir.')
          if (!input.sealNumber.trim()) {
            throw new Error('Sureci kapatmak icin muhur numarasi zorunludur.')
          }

          const now = new Date()
          const loadingOperation = data.loadingOperations.find((item) => item.shipmentRequestId === shipmentRequestId)
          const current = loadingOperation ?? {
            id: `lo-${shipmentRequestId}`,
            shipmentRequestId,
          }
          current.startedAt = current.startedAt ?? now.toISOString()
          current.completedAt = now.toISOString()
          current.sealNumber = input.sealNumber.trim().toUpperCase()
          current.sealedAt = addMinutes(now, 2).toISOString()
          current.finalizedBy = actor.id
          current.exitAt = addMinutes(now, 10).toISOString()
          current.notes = input.note

          if (loadingOperation) {
            data.loadingOperations = data.loadingOperations.map((item) => (item.shipmentRequestId === shipmentRequestId ? current : item))
          } else {
            data.loadingOperations.unshift(current)
          }

          // Demo akista kapanis tek aksiyonla birden fazla statuyu zincir halinde tamamlar.
          pushStatusTransition(data, request, request.currentStatus, 'LOADED', actor.id, 'Yukleme tamamlandi.', now)
          pushStatusTransition(data, request, 'LOADED', 'SEALED', actor.id, `Muhur numarasi kaydedildi: ${current.sealNumber}.`, addMinutes(now, 2))
          pushStatusTransition(data, request, 'SEALED', 'EXITED', actor.id, 'Arac cikis yapti.', addMinutes(now, 10))
          pushStatusTransition(data, request, 'EXITED', 'COMPLETED', actor.id, input.note || 'Operasyon tamamlandi.', addMinutes(now, 12))
          pushNotification(data, {
            title: 'Sevkiyat tamamlandi',
            message: `${request.requestNo} icin cikis tamamlandi.`,
            level: 'success',
            shipmentRequestId,
            targetRoleKeys: ['requester', 'admin'],
            targetCompanyIds: [request.requesterCompanyId],
          })
          return { ok: true, message: 'Muhur kaydedildi ve cikis tamamlandi.' }
        }),

      toggleCompanyStatus: (companyId) =>
        set((state) => {
          const data = structuredClone(state.data)
          data.companies = data.companies.map((company) =>
            company.id === companyId
              ? {
                  ...company,
                  status: company.status === 'ACTIVE' ? 'PASSIVE' : 'ACTIVE',
                  updatedAt: new Date().toISOString(),
                }
              : company,
          )
          return { data }
        }),

      toggleUserActive: (userId) =>
        set((state) => {
          const data = structuredClone(state.data)
          data.users = data.users.map((user) =>
            user.id === userId
              ? {
                  ...user,
                  isActive: !user.isActive,
                  updatedAt: new Date().toISOString(),
                }
              : user,
          )
          return { data }
        }),

      toggleRampActive: (rampId) =>
        set((state) => {
          const data = structuredClone(state.data)
          data.ramps = data.ramps.map((ramp) =>
            ramp.id === rampId
              ? {
                  ...ramp,
                  isActive: !ramp.isActive,
                }
              : ramp,
          )
          return { data }
        }),
    }),
    {
      name: 'flowdock-logistics-demo',
      version: 1,
    },
  ),
)

function withMutation(
  set: (updater: (state: AppStore) => Partial<AppStore>) => void,
  mutation: (data: DemoData, actor: User) => OperationResult,
) {
  let result: OperationResult = { ok: false, message: 'Islem tamamlanamadi.' }

  set((state) => {
    try {
      const data = structuredClone(state.data)
      const actor = getCurrentUser(data, state.session.currentUserId)
      if (!actor) {
        throw new Error('Islem icin once giris yapmalisiniz.')
      }

      result = mutation(data, actor)
      return { data }
    } catch (error) {
      result = {
        ok: false,
        message: error instanceof Error ? error.message : 'Beklenmeyen bir hata olustu.',
      }
      return {}
    }
  })

  return result
}

function requireRequest(data: DemoData, shipmentRequestId: string) {
  const request = data.shipmentRequests.find((item) => item.id === shipmentRequestId)
  if (!request) {
    throw new Error('Sevkiyat kaydi bulunamadi.')
  }

  return request
}

function pushStatusTransition(
  data: DemoData,
  request: ShipmentRequest,
  oldStatus: ShipmentStatus | 'NONE',
  newStatus: ShipmentStatus,
  actorId: string,
  note: string,
  at = new Date(),
) {
  // Shipment entity, status history ve audit log ayni anda guncellenir.
  request.currentStatus = newStatus
  request.updatedAt = at.toISOString()

  data.statusHistory.unshift({
    id: `hist-${request.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    shipmentRequestId: request.id,
    oldStatus,
    newStatus,
    changedBy: actorId,
    changedAt: at.toISOString(),
    note,
  })

  pushAudit(data, {
    entityType: 'ShipmentRequest',
    entityId: request.id,
    actionType: 'status_transition',
    oldValue: oldStatus,
    newValue: newStatus,
    description: note,
    performedByUserId: actorId,
    performedAt: at.toISOString(),
  })
}

function pushAudit(data: DemoData, audit: Omit<DemoData['auditLogs'][number], 'id'>) {
  data.auditLogs.unshift({
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...audit,
  })
}

function pushNotification(data: DemoData, notification: Omit<NotificationItem, 'id' | 'createdAt' | 'isReadBy'>) {
  data.notifications.unshift({
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    isReadBy: [],
    ...notification,
  })
}

const gateActionMessages: Record<GateAction, string> = {
  arrive: 'Arac tesise geldi olarak isaretlendi.',
  admit: 'Aracin saha girisi kaydedildi.',
  takeToRamp: 'Arac rampaya alindi.',
  startLoading: 'Yukleme baslatildi.',
}
