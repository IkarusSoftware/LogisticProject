import type { PropsWithChildren } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from '../components/layout'
import { ROLE_DEFINITIONS } from '../domain/constants'
import { getCurrentRoleKey, getCurrentUser } from '../domain/selectors'
import type { UserRoleKey } from '../domain/models'
import { ActivityLogPage } from '../pages/ActivityLogPage'
import { ChangePasswordPage } from '../pages/ChangePasswordPage'
import { ProfilePage } from '../pages/ProfilePage'
import { AdminPage } from '../pages/AdminPage'
import { CreateRequestPage } from '../pages/CreateRequestPage'
import { DashboardPage } from '../pages/DashboardPage'
import { GateOperationsPage } from '../pages/GateOperationsPage'
import { HistoryPage } from '../pages/HistoryPage'
import { LoadingCompletionPage } from '../pages/LoadingCompletionPage'
import { LoadingZonesPage } from '../pages/LoadingZonesPage'
import { RoleManagementPage } from '../pages/RoleManagementPage'
import { SupplierCompaniesPage } from '../pages/SupplierCompaniesPage'
import { UserRoleAssignmentPage } from '../pages/UserRoleAssignmentPage'
import { LoginPage } from '../pages/LoginPage'
import { RampPlanningPage } from '../pages/RampPlanningPage'
import { ReportsPage } from '../pages/ReportsPage'
import { SettingsPage } from '../pages/SettingsPage'
import { ShipmentListPage } from '../pages/ShipmentListPage'
import { SupplierAssignmentsPage } from '../pages/SupplierAssignmentsPage'
import { UserManagementPage } from '../pages/UserManagementPage'
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
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/sifre-degistir" element={<ChangePasswordPage />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedPage allowedRoles={['requester', 'supplier', 'control', 'ramp', 'gate', 'loading', 'admin', 'superadmin']}>
              <DashboardPage />
            </ProtectedPage>
          }
        />
        <Route
          path="/talep-olustur"
          element={
            <ProtectedPage allowedRoles={['requester', 'admin', 'superadmin']}>
              <CreateRequestPage />
            </ProtectedPage>
          }
        />
        <Route
          path="/talepler"
          element={
            <ProtectedPage allowedRoles={['requester', 'supplier', 'control', 'admin', 'superadmin']}>
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
            <ProtectedPage allowedRoles={['requester', 'control', 'ramp', 'gate', 'loading', 'admin', 'superadmin']}>
              <HistoryPage />
            </ProtectedPage>
          }
        />
        <Route
          path="/raporlar"
          element={
            <ProtectedPage allowedRoles={['admin', 'superadmin']}>
              <ReportsPage />
            </ProtectedPage>
          }
        />
        <Route
          path="/yonetim"
          element={
            <ProtectedPage allowedRoles={['admin', 'superadmin']}>
              <AdminPage />
            </ProtectedPage>
          }
        />
        <Route
          path="/yukleme-bolgeleri"
          element={
            <ProtectedPage allowedRoles={['admin', 'superadmin']}>
              <LoadingZonesPage />
            </ProtectedPage>
          }
        />
        <Route
          path="/tedarikci-firmalar"
          element={
            <ProtectedPage allowedRoles={['superadmin']}>
              <SupplierCompaniesPage />
            </ProtectedPage>
          }
        />
        <Route
          path="/rol-yonetimi"
          element={
            <ProtectedPage allowedRoles={['superadmin']}>
              <RoleManagementPage />
            </ProtectedPage>
          }
        />
        <Route
          path="/kullanici-rol-esleme"
          element={
            <ProtectedPage allowedRoles={['superadmin']}>
              <UserRoleAssignmentPage />
            </ProtectedPage>
          }
        />
        <Route
          path="/kullanici-yonetim"
          element={
            <ProtectedPage allowedRoles={['superadmin']}>
              <UserManagementPage />
            </ProtectedPage>
          }
        />
        <Route
          path="/aktivite-log"
          element={
            <ProtectedPage allowedRoles={['superadmin']}>
              <ActivityLogPage />
            </ProtectedPage>
          }
        />
        <Route
          path="/ayarlar"
          element={
            <ProtectedPage allowedRoles={['superadmin']}>
              <SettingsPage />
            </ProtectedPage>
          }
        />

        <Route
          path="/profil"
          element={
            <ProtectedPage allowedRoles={['requester', 'supplier', 'control', 'ramp', 'gate', 'loading', 'admin', 'superadmin']}>
              <ProfilePage />
            </ProtectedPage>
          }
        />

        <Route path="*" element={<Navigate to={currentUser ? defaultPath : '/login'} replace />} />
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

  if (session.mustChangePassword) {
    return <Navigate to="/sifre-degistir" replace />
  }

  if (roleKey && !allowedRoles.includes(roleKey)) {
    return <Navigate to={roleHomeMap[roleKey]} replace />
  }

  return <AppShell>{children}</AppShell>
}
