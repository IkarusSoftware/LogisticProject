import type { PropsWithChildren } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from '../components/layout'
import { ROLE_DEFINITIONS } from '../domain/constants'
import { getCurrentRoleKey, getCurrentUser } from '../domain/selectors'
import type { UserRoleKey } from '../domain/models'
import { AdminPage } from '../pages/AdminPage'
import { CreateRequestPage } from '../pages/CreateRequestPage'
import { DashboardPage } from '../pages/DashboardPage'
import { GateOperationsPage } from '../pages/GateOperationsPage'
import { HistoryPage } from '../pages/HistoryPage'
import { LoadingCompletionPage } from '../pages/LoadingCompletionPage'
import { LoginPage } from '../pages/LoginPage'
import { RampPlanningPage } from '../pages/RampPlanningPage'
import { ReportsPage } from '../pages/ReportsPage'
import { ShipmentListPage } from '../pages/ShipmentListPage'
import { SupplierAssignmentsPage } from '../pages/SupplierAssignmentsPage'
import { VehicleControlPage } from '../pages/VehicleControlPage'
import { useAppStore } from '../store/app-store'

const roleHomeMap = ROLE_DEFINITIONS.reduce<Record<UserRoleKey, string>>((accumulator, role) => {
  accumulator[role.key] = role.homePath
  return accumulator
}, {} as Record<UserRoleKey, string>)

export function App() {
  const data = useAppStore((state) => state.data)
  const session = useAppStore((state) => state.session)
  const currentUser = getCurrentUser(data, session.currentUserId)
  const roleKey = getCurrentRoleKey(currentUser)

  const defaultPath = currentUser ? roleHomeMap[roleKey ?? 'admin'] ?? '/dashboard' : '/login'

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={currentUser ? <Navigate to={defaultPath} replace /> : <LoginPage />} />
        <Route path="/" element={<Navigate to={defaultPath} replace />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedPage allowedRoles={['requester', 'supplier', 'control', 'ramp', 'gate', 'loading', 'admin']}>
              <DashboardPage />
            </ProtectedPage>
          }
        />
        <Route
          path="/talep-olustur"
          element={
            <ProtectedPage allowedRoles={['requester', 'admin']}>
              <CreateRequestPage />
            </ProtectedPage>
          }
        />
        <Route
          path="/talepler"
          element={
            <ProtectedPage allowedRoles={['requester', 'supplier', 'control', 'admin']}>
              <ShipmentListPage />
            </ProtectedPage>
          }
        />
        <Route
          path="/tedarik-atama"
          element={
            <ProtectedPage allowedRoles={[]}>
              <SupplierAssignmentsPage />
            </ProtectedPage>
          }
        />
        <Route
          path="/arac-kontrol"
          element={
            <ProtectedPage allowedRoles={[]}>
              <VehicleControlPage />
            </ProtectedPage>
          }
        />
        <Route
          path="/rampa-planlama"
          element={
            <ProtectedPage allowedRoles={[]}>
              <RampPlanningPage />
            </ProtectedPage>
          }
        />
        <Route
          path="/kapi-operasyonu"
          element={
            <ProtectedPage allowedRoles={['gate']}>
              <GateOperationsPage />
            </ProtectedPage>
          }
        />
        <Route
          path="/yukleme-tamamlama"
          element={
            <ProtectedPage allowedRoles={['loading']}>
              <LoadingCompletionPage />
            </ProtectedPage>
          }
        />
        <Route
          path="/gecmis"
          element={
            <ProtectedPage allowedRoles={['requester', 'control', 'ramp', 'gate', 'loading', 'admin']}>
              <HistoryPage />
            </ProtectedPage>
          }
        />
        <Route
          path="/raporlar"
          element={
            <ProtectedPage allowedRoles={['admin']}>
              <ReportsPage />
            </ProtectedPage>
          }
        />
        <Route
          path="/yonetim"
          element={
            <ProtectedPage allowedRoles={[]}>
              <AdminPage />
            </ProtectedPage>
          }
        />

        <Route path="*" element={<Navigate to={defaultPath} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function ProtectedPage({
  children,
  allowedRoles,
}: PropsWithChildren<{
  allowedRoles: UserRoleKey[]
}>) {
  const data = useAppStore((state) => state.data)
  const session = useAppStore((state) => state.session)
  const currentUser = getCurrentUser(data, session.currentUserId)
  const roleKey = getCurrentRoleKey(currentUser)

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  if (roleKey && !allowedRoles.includes(roleKey)) {
    return <Navigate to={roleHomeMap[roleKey]} replace />
  }

  return <AppShell>{children}</AppShell>
}
