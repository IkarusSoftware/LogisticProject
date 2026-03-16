import type { PropsWithChildren } from 'react'
import { useState } from 'react'
import { Bell, Building2, LogOut, RefreshCw, UserRound } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'

import { NAVIGATION_ITEMS } from '../domain/constants'
import { getCurrentRoleKey, getCurrentUser, getNotificationsForUser, getUnreadNotificationCount } from '../domain/selectors'
import { formatDateTimeLabel, formatFullName, getRoleDefinition, getUserInitials } from '../domain/workflow'
import { useAppStore } from '../store/app-store'
import { AppIcon } from './icon-map'
import { Badge, Button } from './ui'

export function AppShell({ children }: PropsWithChildren) {
  const navigate = useNavigate()
  const [showNotifications, setShowNotifications] = useState(false)
  const data = useAppStore((state) => state.data)
  const session = useAppStore((state) => state.session)
  const resetDemo = useAppStore((state) => state.resetDemo)
  const logout = useAppStore((state) => state.logout)
  const markAllNotificationsRead = useAppStore((state) => state.markAllNotificationsRead)

  const currentUser = getCurrentUser(data, session.currentUserId)
  const roleKey = getCurrentRoleKey(currentUser)
  const roleDefinition = roleKey ? getRoleDefinition(roleKey) : undefined
  const unreadCount = getUnreadNotificationCount(data, currentUser)
  const notifications = getNotificationsForUser(data, currentUser).slice(0, 8)

  const navigationItems = NAVIGATION_ITEMS.filter((item) => item.roleKeys.includes(roleKey ?? 'requester')).filter((item) =>
    roleKey === 'admin'
      ? ['/dashboard', '/talep-olustur', '/talepler', '/gecmis', '/raporlar'].includes(item.path)
      : roleKey === 'supplier'
        ? ['/dashboard', '/talepler'].includes(item.path)
        : roleKey === 'control'
          ? ['/dashboard', '/talepler'].includes(item.path)
          : roleKey === 'gate'
            ? ['/dashboard', '/kapi-operasyonu'].includes(item.path)
        : true,
  )

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="logo-block">
          <div className="logo-block__mark">FD</div>
          <div>
            <strong>Gratis Lojistik</strong>
            <p>Sevkiyat operasyon paneli</p>
          </div>
        </div>

        <nav className="nav">
          {navigationItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => (isActive ? 'nav__link nav__link--active' : 'nav__link')}
            >
              <AppIcon name={item.icon} size={16} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="profile-card">
            <div className="profile-card__avatar">{getUserInitials(currentUser)}</div>
            <div>
              <strong>{formatFullName(currentUser)}</strong>
              <p>{roleDefinition?.name ?? '-'}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            style={{ color: '#475569', fontSize: '0.8rem', justifyContent: 'flex-start', padding: '0.375rem 0.5rem' }}
            onClick={() => { resetDemo(); navigate('/dashboard') }}
          >
            <RefreshCw size={14} />
            Demo veriyi sıfırla
          </Button>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="topbar__title">
            <Badge tone="neutral" style={{ borderRadius: '6px' }}>
              {roleDefinition?.name ?? 'Rol seçilmedi'}
            </Badge>
            <span>Son oturum: {formatDateTimeLabel(new Date().toISOString())}</span>
          </div>

          <div className="topbar__actions">
            <button
              type="button"
              className="notification-button"
              onClick={() => {
                setShowNotifications((current) => !current)
                markAllNotificationsRead()
              }}
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="notification-button__count">{unreadCount}</span>
              )}
            </button>

            <div className="topbar__user">
              <div className="topbar__pill">
                <Building2 size={13} />
                <span>{data.companies.find((company) => company.id === currentUser?.companyId)?.name ?? '-'}</span>
              </div>
              <div className="topbar__pill">
                <UserRound size={13} />
                <span>{currentUser?.email}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { logout(); navigate('/login') }}>
                <LogOut size={15} />
                Çıkış
              </Button>
            </div>
          </div>

          {showNotifications && (
            <div className="notification-panel">
              <div className="notification-panel__header">
                <strong>Bildirim merkezi</strong>
                <span>{unreadCount} okunmamış</span>
              </div>
              {notifications.length === 0 ? (
                <p className="notification-panel__empty">Bu rol için yeni bildirim yok.</p>
              ) : (
                notifications.map((notification) => (
                  <article
                    key={notification.id}
                    className={`notification-panel__item notification-panel__item--${notification.level}`}
                  >
                    <strong>{notification.title}</strong>
                    <p>{notification.message}</p>
                    <span>{formatDateTimeLabel(notification.createdAt)}</span>
                  </article>
                ))
              )}
            </div>
          )}
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  )
}
