import { addMinutes, format } from 'date-fns'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { buildInitialData } from '../data/seed'
import { TERMINAL_STATUSES } from '../domain/constants'
import { getCurrentUser, getNotificationsForUser, getVisibleRequests } from '../domain/selectors'
import type {
  CreateRequestInput,
  DemoData,
  LoadingCompletionInput,
  NotificationItem,
  OperationResult,
  RampPlanningInput,
  RequestRevisionInput,
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
  createShipmentRequests: (inputs: CreateRequestInput[]) => OperationResult
  clearActiveRequests: () => OperationResult
  reviseActiveRequest: (shipmentRequestId: string, input: RequestRevisionInput) => OperationResult
  cancelVehicleRequest: (shipmentRequestId: string) => OperationResult
  cancelRequest: (shipmentRequestId: string, note: string) => OperationResult
  beginSupplierReview: (shipmentRequestId: string) => OperationResult
  submitVehicleAssignment: (shipmentRequestId: string, input: VehicleAssignmentInput) => OperationResult
  acceptSecurityCorrection: (shipmentRequestId: string) => OperationResult
  requestSecurityCorrection: (shipmentRequestId: string, note: string) => OperationResult
  registerVehicleRecord: (shipmentRequestId: string, note: string) => OperationResult
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
        currentUserId: null,
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
          session: { currentUserId: null },
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

      createShipmentRequest: (input) => get().createShipmentRequests([input]),

      createShipmentRequests: (inputs) =>
        withMutation(set, (data, actor) => {
          const roleKey = actor.roleId === 'role-admin' ? 'admin' : actor.roleId === 'role-requester' ? 'requester' : undefined
          if (!['requester', 'admin'].includes(roleKey ?? '')) {
            throw new Error('Bu islem icin talep olusturma yetkiniz yok.')
          }

          if (inputs.length === 0) {
            throw new Error('Kaydedilecek talep bulunamadi.')
          }

          const createdRequests = inputs.map((input, index) =>
            createShipmentRequestRecord(data, actor, input, addMinutes(new Date(), index)),
          )

          return {
            ok: true,
            message:
              createdRequests.length === 1
                ? `${createdRequests[0].requestNo} talebi olusturuldu ve tedarikciye gonderildi.`
                : `${createdRequests.length} talep olusturuldu ve tedarikcilere gonderildi.`,
          }
        }),

      clearActiveRequests: () =>
        withMutation(set, (data, actor) => {
          const activeRequestIds = new Set(
            getVisibleRequests(data, actor)
              .filter((request) => !['COMPLETED', 'REJECTED', 'CANCELLED'].includes(request.currentStatus))
              .map((request) => request.id),
          )

          if (activeRequestIds.size === 0) {
            throw new Error('Temizlenecek aktif talep bulunamadi.')
          }

          data.shipmentRequests = data.shipmentRequests.filter((request) => !activeRequestIds.has(request.id))
          data.vehicleAssignments = data.vehicleAssignments.filter((item) => !activeRequestIds.has(item.shipmentRequestId))
          data.rampAssignments = data.rampAssignments.filter((item) => !activeRequestIds.has(item.shipmentRequestId))
          data.gateOperations = data.gateOperations.filter((item) => !activeRequestIds.has(item.shipmentRequestId))
          data.loadingOperations = data.loadingOperations.filter((item) => !activeRequestIds.has(item.shipmentRequestId))
          data.statusHistory = data.statusHistory.filter((item) => !activeRequestIds.has(item.shipmentRequestId))
          data.auditLogs = data.auditLogs.filter((item) => !activeRequestIds.has(item.entityId))
          data.notifications = data.notifications.filter(
            (item) => !item.shipmentRequestId || !activeRequestIds.has(item.shipmentRequestId),
          )

          return {
            ok: true,
            message:
              activeRequestIds.size === 1
                ? '1 aktif talep temizlendi.'
                : `${activeRequestIds.size} aktif talep temizlendi.`,
          }
        }),

      reviseActiveRequest: (shipmentRequestId, input) =>
        withMutation(set, (data, actor) => {
          const request = requireRequest(data, shipmentRequestId)

          if (TERMINAL_STATUSES.includes(request.currentStatus)) {
            throw new Error('Tamamlanan, reddedilen veya iptal edilen kayitlar revize edilemez.')
          }

          if (['ARRIVED', 'ADMITTED', 'AT_RAMP', 'LOADING', 'LOADED', 'SEALED', 'EXITED'].includes(request.currentStatus)) {
            throw new Error('Arac sahaya indikten sonra bu kayit bu ekrandan revize edilemez.')
          }

          const normalizedLoadTime = input.loadTime.trim()
          if (!normalizedLoadTime) {
            throw new Error('Yukleme saati zorunludur.')
          }

          const rampAssignment = data.rampAssignments.find((item) => item.shipmentRequestId === shipmentRequestId)
          if (rampAssignment) {
            const conflicting = data.rampAssignments.find((assignment) => {
              if (assignment.rampId !== rampAssignment.rampId || assignment.shipmentRequestId === shipmentRequestId) {
                return false
              }

              const existingRequest = data.shipmentRequests.find((item) => item.id === assignment.shipmentRequestId)
              return (
                existingRequest &&
                !TERMINAL_STATUSES.includes(existingRequest.currentStatus) &&
                existingRequest.loadDate === request.loadDate &&
                existingRequest.loadTime === normalizedLoadTime
              )
            })

            if (conflicting) {
              throw new Error('Yeni yukleme saati mevcut rampa planlamasi ile cakisiyor.')
            }
          }

          const oldValue = `Tur: ${request.vehicleType}, Saat: ${request.loadTime}`
          request.vehicleType = input.vehicleType
          request.loadTime = normalizedLoadTime
          request.updatedAt = new Date().toISOString()

          pushAudit(data, {
            entityType: 'ShipmentRequest',
            entityId: request.id,
            actionType: 'request_revised',
            oldValue,
            newValue: `Tur: ${request.vehicleType}, Saat: ${request.loadTime}`,
            description: 'Arac turu ve yukleme saati revize edildi.',
            performedByUserId: actor.id,
            performedAt: request.updatedAt,
          })

          pushNotification(data, {
            title: 'Talep revize edildi',
            message: `${request.requestNo} icin arac turu veya yukleme saati guncellendi.`,
            level: 'warning',
            shipmentRequestId,
            targetRoleKeys: ['supplier', 'admin'],
            targetCompanyIds: [request.assignedSupplierCompanyId, request.requesterCompanyId],
          })

          return { ok: true, message: `${request.requestNo} kaydi revize edildi.` }
        }),

      cancelVehicleRequest: (shipmentRequestId) =>
        withMutation(set, (data, actor) => {
          const request = requireRequest(data, shipmentRequestId)
          if (!canCancelRequest(request)) {
            throw new Error('Bu asamadan sonra arac iptal edilemez.')
          }

          pushStatusTransition(data, request, request.currentStatus, 'VEHICLE_CANCELLED', actor.id, 'Arac iptal edildi.')
          pushNotification(data, {
            title: 'Arac iptal edildi',
            message: `${request.requestNo} icin arac iptal edildi.`,
            level: 'warning',
            shipmentRequestId,
            targetRoleKeys: ['supplier', 'control', 'ramp', 'gate', 'admin'],
            targetCompanyIds: [request.assignedSupplierCompanyId, request.requesterCompanyId],
          })

          return { ok: true, message: `${request.requestNo} icin arac iptal edildi.` }
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
          const wasCorrectionRequest = request.currentStatus === 'CORRECTION_REQUESTED'
          const roleKey = actor.roleId === 'role-admin' ? 'admin' : actor.roleId === 'role-supplier' ? 'supplier' : undefined
          if (!['supplier', 'admin'].includes(roleKey ?? '')) {
            throw new Error('Bu islem icin tedarik yetkiniz yok.')
          }

          if (roleKey === 'supplier' && actor.companyId !== request.assignedSupplierCompanyId) {
            throw new Error('Bu talep sizin firmaniza atanmamis.')
          }

          ensureStatusTransition(
            request.currentStatus,
            ['SENT_TO_SUPPLIER', 'SUPPLIER_REVIEWING', 'CORRECTION_REQUESTED'],
            'Bu kayit icin tedarik bilgisi giris asamasi tamamlanmis.',
          )

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
            supplierCompanyId: request.assignedSupplierCompanyId,
            tractorPlate: normalizePlate(input.tractorPlate),
            trailerPlate: normalizePlate(input.trailerPlate),
            driverFirstName: input.driverFirstName.trim(),
            driverLastName: input.driverLastName.trim(),
            driverPhone: normalizePhone(input.driverPhone),
            assignmentStatus: 'SUBMITTED' as const,
            assignedBy: actor.id,
            assignedAt: now.toISOString(),
            rejectionReason: undefined,
            approvedBy: undefined,
            approvedAt: undefined,
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

          pushStatusTransition(
            data,
            request,
            request.currentStatus,
            'VEHICLE_ASSIGNED',
            actor.id,
            wasCorrectionRequest
              ? 'Tedarikci duzeltme talebine gore arac bilgilerini guncelledi.'
              : 'Arac ve sofor bilgileri kaydedildi.',
          )
          pushNotification(data, {
            title: 'Dis guvenlik kontrolu bekliyor',
            message: `${request.requestNo} icin arac dogrulamasi bekleniyor.`,
            level: 'info',
            shipmentRequestId,
            targetRoleKeys: ['gate', 'admin'],
            targetCompanyIds: [request.requesterCompanyId],
          })

          return {
            ok: true,
            message:
              wasCorrectionRequest
                ? 'Duzeltilen arac bilgileri tekrar gonderildi.'
                : 'Arac ve sofor bilgileri kaydedildi.',
          }
        }),

      acceptSecurityCorrection: (shipmentRequestId) =>
        withMutation(set, (data, actor) => {
          const roleKey = actor.roleId === 'role-admin' ? 'admin' : actor.roleId === 'role-supplier' ? 'supplier' : undefined
          if (!['supplier', 'admin'].includes(roleKey ?? '')) {
            throw new Error('Bu islem icin tedarik yetkiniz yok.')
          }

          const request = requireRequest(data, shipmentRequestId)
          if (roleKey === 'supplier' && actor.companyId !== request.assignedSupplierCompanyId) {
            throw new Error('Bu talep sizin firmaniza atanmamis.')
          }

          ensureStatusTransition(
            request.currentStatus,
            ['CORRECTION_REQUESTED'],
            'Kabul edilebilecek aktif bir duzeltme talebi bulunamadi.',
          )

          pushStatusTransition(
            data,
            request,
            request.currentStatus,
            'SUPPLIER_REVIEWING',
            actor.id,
            'Tedarikci duzeltme talebini kabul etti.',
          )
          pushNotification(data, {
            title: 'Duzeltme talebi kabul edildi',
            message: `${request.requestNo} icin tedarikci yeni bilgileri hazirliyor.`,
            level: 'info',
            shipmentRequestId,
            targetRoleKeys: ['gate', 'admin'],
            targetCompanyIds: [request.requesterCompanyId],
          })

          return { ok: true, message: 'Duzeltme talebi kabul edildi. Bilgileri guncelleyip gonderebilirsiniz.' }
        }),

      requestSecurityCorrection: (shipmentRequestId, note) =>
        withMutation(set, (data, actor) => {
          const roleKey = actor.roleId === 'role-admin' ? 'admin' : actor.roleId === 'role-gate' ? 'gate' : undefined
          if (!['gate', 'admin'].includes(roleKey ?? '')) {
            throw new Error('Bu islem icin dis guvenlik yetkisi gerekir.')
          }

          const request = requireRequest(data, shipmentRequestId)
          const assignment = data.vehicleAssignments.find((item) => item.shipmentRequestId === shipmentRequestId)
          if (!assignment) {
            throw new Error('Duzeltme istenecek arac bilgisi bulunamadi.')
          }

          ensureStatusTransition(
            request.currentStatus,
            ['VEHICLE_ASSIGNED', 'CORRECTION_REQUESTED'],
            'Bu kayit icin artik duzeltme talebi gonderilemez.',
          )

          if (!note.trim()) {
            throw new Error('Duzeltme talebi icin aciklama zorunludur.')
          }

          const now = new Date().toISOString()
          data.vehicleAssignments = data.vehicleAssignments.map((item) =>
            item.id === assignment.id
              ? {
                  ...item,
                  assignmentStatus: 'REJECTED',
                  rejectionReason: note.trim(),
                  approvedBy: actor.id,
                  approvedAt: now,
                }
              : item,
          )

          pushStatusTransition(data, request, request.currentStatus, 'CORRECTION_REQUESTED', actor.id, note.trim())
          pushNotification(data, {
            title: 'Duzeltme talebi var',
            message: `${request.requestNo} icin arac bilgileri duzeltilmeli.`,
            level: 'warning',
            shipmentRequestId,
            targetRoleKeys: ['supplier', 'admin'],
            targetCompanyIds: [request.assignedSupplierCompanyId, request.requesterCompanyId],
          })

          return { ok: true, message: 'Duzeltme talebi tedarikciye gonderildi.' }
        }),

      registerVehicleRecord: (shipmentRequestId, note) =>
        withMutation(set, (data, actor) => {
          const roleKey = actor.roleId === 'role-admin' ? 'admin' : actor.roleId === 'role-gate' ? 'gate' : undefined
          if (!['gate', 'admin'].includes(roleKey ?? '')) {
            throw new Error('Bu islem icin dis guvenlik yetkisi gerekir.')
          }

          const request = requireRequest(data, shipmentRequestId)
          const assignment = data.vehicleAssignments.find((item) => item.shipmentRequestId === shipmentRequestId)
          if (!assignment) {
            throw new Error('Arac kaydi icin tedarik bilgisi bulunamadi.')
          }

          ensureStatusTransition(
            request.currentStatus,
            ['VEHICLE_ASSIGNED', 'CORRECTION_REQUESTED'],
            'Bu kayit icin arac kaydi bu asamada yapilamaz.',
          )

          const now = new Date().toISOString()
          data.vehicleAssignments = data.vehicleAssignments.map((item) =>
            item.id === assignment.id
              ? {
                  ...item,
                  assignmentStatus: 'APPROVED',
                  rejectionReason: undefined,
                  approvedBy: actor.id,
                  approvedAt: now,
                }
              : item,
          )

          pushStatusTransition(data, request, request.currentStatus, 'APPROVED', actor.id, note.trim() || 'Arac kaydi yapildi.')
          pushNotification(data, {
            title: 'Rampa atamasi bekliyor',
            message: `${request.requestNo} icin sevkiyat operasyon tarafinda rampa secin.`,
            level: 'info',
            shipmentRequestId,
            targetRoleKeys: ['control', 'admin'],
            targetCompanyIds: [request.requesterCompanyId],
          })

          return { ok: true, message: 'Arac kaydi yapildi.' }
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
          const roleKey = actor.roleId === 'role-admin' ? 'admin' : actor.roleId === 'role-control' ? 'control' : undefined
          if (!['control', 'admin'].includes(roleKey ?? '')) {
            throw new Error('Bu islem icin sevkiyat operasyon yetkisi gerekir.')
          }

          const request = requireRequest(data, shipmentRequestId)
          ensureStatusTransition(
            request.currentStatus,
            ['APPROVED', 'RAMP_PLANNED'],
            'Rampa atamasi icin kaydin arac kaydi yapilmis olmasi gerekir.',
          )

          const ramp = findOrCreateRamp(data, request, input.rampId)

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

          if (request.currentStatus === 'APPROVED') {
            pushStatusTransition(data, request, request.currentStatus, 'RAMP_PLANNED', actor.id, input.note || `${ramp.code} rampasina atandi.`)
          } else {
            request.updatedAt = now
          }

          pushNotification(data, {
            title: 'Rampa cagrisi yapildi',
            message: `${request.requestNo} icin ${ramp.code}. rampa atandi.`,
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
          const roleKey = actor.roleId === 'role-admin' ? 'admin' : actor.roleId === 'role-control' ? 'control' : actor.roleId === 'role-loading' ? 'loading' : undefined
          if (!['control', 'loading', 'admin'].includes(roleKey ?? '')) {
            throw new Error('Bu islem icin sevkiyat operasyon yetkisi gerekir.')
          }

          ensureStatusTransition(
            request.currentStatus,
            ['RAMP_PLANNED', 'LOADING'],
            'Islemi tamamlamak icin kaydin rampada veya yukleniyor asamasinda olmasi gerekir.',
          )
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

          if (request.currentStatus === 'RAMP_PLANNED') {
            pushStatusTransition(data, request, request.currentStatus, 'LOADING', actor.id, 'Arac rampada yuklemeye alindi.', addMinutes(now, -1))
            pushStatusTransition(
              data,
              request,
              'LOADING',
              'LOADED',
              actor.id,
              input.note || `Muhur numarasi kaydedildi: ${current.sealNumber}. Arac cikisa hazir.`,
              now,
            )
          } else {
            pushStatusTransition(
              data,
              request,
              request.currentStatus,
              'LOADED',
              actor.id,
              input.note || `Muhur numarasi kaydedildi: ${current.sealNumber}. Arac cikisa hazir.`,
              now,
            )
          }

          pushNotification(data, {
            title: 'Yukleme tamamlandi',
            message: `${request.requestNo} icin muhur kaydi yapildi ve arac cikisa hazir.`,
            level: 'success',
            shipmentRequestId,
            targetRoleKeys: ['requester', 'admin', 'gate'],
            targetCompanyIds: [request.requesterCompanyId],
          })
          return { ok: true, message: 'Muhur kaydedildi ve arac yuklemesi tamamlandi.' }
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
      version: 4,
      migrate: (persistedState: unknown, version) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return persistedState as AppStore
        }

        const state = persistedState as AppStore
        if (version < 2) {
          if (state.data?.users) {
            state.data.users = state.data.users.map((user) => {
              if (user.id === 'user-admin-eda') {
                return {
                  ...user,
                  firstName: 'Özgür',
                  lastName: 'Çağlayan',
                  email: 'ozgur.caglayan@gratis.demo',
                }
              }

              if (user.id === 'user-control-selin') {
                return {
                  ...user,
                  firstName: 'Fevzi',
                  lastName: 'Uzun',
                  email: 'fevzi.uzun@gratis.demo',
                }
              }

              return user
            })
          }

          if (state.data?.roles) {
            state.data.roles = state.data.roles.map((role) =>
              role.id === 'role-admin' ? { ...role, name: 'Vardiya Amiri / Ekip Lideri' } : role,
            )
          }
        }

        if (version < 3) {
          state.session = { currentUserId: null }
        }

        if (version < 4 && state.data) {
          const seededRequestIds = new Set(
            (state.data.shipmentRequests ?? [])
              .filter((request) => /^req-\d{3}$/.test(request.id))
              .map((request) => request.id),
          )

          state.data.shipmentRequests = (state.data.shipmentRequests ?? []).filter((request) => !seededRequestIds.has(request.id))
          state.data.vehicleAssignments = (state.data.vehicleAssignments ?? []).filter((item) => !seededRequestIds.has(item.shipmentRequestId))
          state.data.rampAssignments = (state.data.rampAssignments ?? []).filter((item) => !seededRequestIds.has(item.shipmentRequestId))
          state.data.gateOperations = (state.data.gateOperations ?? []).filter((item) => !seededRequestIds.has(item.shipmentRequestId))
          state.data.loadingOperations = (state.data.loadingOperations ?? []).filter((item) => !seededRequestIds.has(item.shipmentRequestId))
          state.data.statusHistory = (state.data.statusHistory ?? []).filter((item) => !seededRequestIds.has(item.shipmentRequestId))
          state.data.auditLogs = (state.data.auditLogs ?? []).filter((item) => !seededRequestIds.has(item.entityId))
          state.data.notifications = (state.data.notifications ?? []).filter(
            (item) =>
              !item.id.startsWith('notif-role-') &&
              (!item.shipmentRequestId || !seededRequestIds.has(item.shipmentRequestId)),
          )
          state.session = { currentUserId: null }
        }

        return state
      },
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

function createShipmentRequestRecord(data: DemoData, actor: User, input: CreateRequestInput, createdAt: Date) {
  if (!input.targetLocationId) {
    throw new Error('Yukleme bolgesi secilmelidir.')
  }

  if (!input.assignedSupplierCompanyId) {
    throw new Error('Tedarikci firma secilmelidir.')
  }

  if (!input.requestDate || !input.loadDate || !input.loadTime) {
    throw new Error('Talep tarihi, yukleme tarihi ve saati zorunludur.')
  }

  const location = data.locations.find((item) => item.id === input.targetLocationId && item.isActive)
  if (!location) {
    throw new Error('Secilen yukleme bolgesi kullanima uygun degil.')
  }

  const supplier = data.companies.find(
    (item) => item.id === input.assignedSupplierCompanyId && item.status === 'ACTIVE' && item.type !== 'MAIN',
  )
  if (!supplier) {
    throw new Error('Secilen tedarikci firma aktif degil.')
  }

  const requestDateSource = new Date(`${input.requestDate}T08:00:00`)
  const numberDate = Number.isNaN(requestDateSource.getTime()) ? createdAt : requestDateSource
  const nextNumber = data.shipmentRequests.length + 1
  const requestNo = `SR-${format(numberDate, 'yyMMdd')}-${String(nextNumber).padStart(3, '0')}`

  const request: ShipmentRequest = {
    id: `req-${nextNumber.toString().padStart(3, '0')}-${createdAt.getTime()}-${Math.random().toString(36).slice(2, 6)}`,
    requestNo,
    requesterCompanyId: actor.companyId,
    targetLocationId: input.targetLocationId,
    requestDate: input.requestDate,
    vehicleType: input.vehicleType,
    loadDate: input.loadDate,
    loadTime: input.loadTime,
    quantityInfo: input.quantityInfo,
    productInfo: input.productInfo,
    notes: input.notes,
    currentStatus: 'SENT_TO_SUPPLIER',
    assignedSupplierCompanyId: input.assignedSupplierCompanyId,
    createdBy: actor.id,
    createdAt: createdAt.toISOString(),
    updatedAt: createdAt.toISOString(),
  }

  data.shipmentRequests.unshift(request)
  pushStatusTransition(data, request, 'NONE', 'REQUEST_CREATED', actor.id, 'Talep kaydi olusturuldu.', createdAt)
  pushStatusTransition(
    data,
    request,
    'REQUEST_CREATED',
    'SENT_TO_SUPPLIER',
    actor.id,
    `${supplier.name} icin talep olusturuldu.`,
    addMinutes(createdAt, 1),
  )
  pushNotification(data, {
    title: 'Yeni sevkiyat talebi',
    message: `${requestNo} talebi aksiyon bekliyor.`,
    level: 'info',
    shipmentRequestId: request.id,
    targetRoleKeys: ['supplier'],
    targetCompanyIds: [request.assignedSupplierCompanyId],
  })

  return request
}

function findOrCreateRamp(data: DemoData, request: ShipmentRequest, rampId: string) {
  const existingRamp = data.ramps.find((item) => item.id === rampId && item.isActive)
  if (existingRamp) {
    return existingRamp
  }

  const match = /^ramp-generic-(\d{2})$/.exec(rampId)
  if (!match) {
    throw new Error('Secilen rampa kullanima uygun degil.')
  }

  const rampNumber = Number(match[1])
  const ramp = {
    id: rampId,
    locationId: request.targetLocationId,
    code: String(rampNumber),
    name: `Rampa ${rampNumber}`,
    status: 'AVAILABLE' as const,
    isActive: true,
  }

  data.ramps.unshift(ramp)
  return ramp
}

const gateActionMessages: Record<GateAction, string> = {
  arrive: 'Arac tesise geldi olarak isaretlendi.',
  admit: 'Aracin saha girisi kaydedildi.',
  takeToRamp: 'Arac rampaya alindi.',
  startLoading: 'Yukleme baslatildi.',
}
