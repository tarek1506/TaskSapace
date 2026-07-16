import { useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import {
  LayoutDashboard, CheckSquare, Users, Settings, LogOut,
  ChevronLeft, ChevronRight, Plus, Zap, Bell, CheckCheck, User
} from 'lucide-react'
import { cn, timeAgo } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { Avatar } from '@/components/ui/Avatar'
import { useNotifications } from '@/contexts/NotificationContext'
import type { AppNotification } from '@/types'

interface SidebarProps {
  workspaceId: string
  workspaceName: string
  isOwner: boolean
}

interface NavItem {
  icon: React.ReactNode
  label: string
  to: string
  id: string
}

export function Sidebar({ workspaceId, workspaceName, isOwner }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const { user, signOut, profile } = useAuth()
  const navigate = useNavigate()

  const navItems: NavItem[] = [
    {
      icon: <LayoutDashboard size={18} />,
      label: 'Dashboard',
      to: `/workspace/${workspaceId}/dashboard`,
      id: 'nav-dashboard',
    },
    {
      icon: <CheckSquare size={18} />,
      label: 'Tasks',
      to: `/workspace/${workspaceId}/tasks`,
      id: 'nav-tasks',
    },
    ...(isOwner
      ? [
          {
            icon: <Users size={18} />,
            label: 'Members',
            to: `/workspace/${workspaceId}/members`,
            id: 'nav-members',
          },
        ]
      : []),
    {
      icon: <Settings size={18} />,
      label: 'Settings',
      to: `/workspace/${workspaceId}/settings`,
      id: 'nav-settings',
    },
  ]

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const handleProfileClick = () => {
    navigate(`/workspace/${workspaceId}/profile`)
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-white border-r border-gray-100 transition-all duration-300 relative',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 z-50 w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-lg hover:bg-gray-50 transition-colors"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        id="sidebar-toggle"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Logo */}
      <div className={cn('flex items-center gap-3 px-4 py-5 border-b border-gray-100', collapsed && 'px-3 justify-center')}>
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-violet-200">
          <Zap size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div className="slide-in">
            <span className="font-bold text-gray-900 text-base">TaskSpace</span>
            <p className="text-xs text-gray-400 truncate max-w-[120px]">{workspaceName}</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.to}
            id={item.id}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'sidebar-active text-violet-700'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
                collapsed && 'justify-center px-2'
              )
            }
          >
            {item.icon}
            {!collapsed && <span className="slide-in">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Switch workspace */}
      {!collapsed && (
        <div className="px-3 py-2 border-t border-gray-100">
          <button
            onClick={() => navigate('/workspaces')}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-gray-500 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-colors"
            id="btn-switch-workspace"
          >
            <Plus size={14} />
            Switch / New Workspace
          </button>
        </div>
      )}

      {/* User profile footer */}
      <div className={cn(
        'flex items-center gap-3 px-3 py-4 border-t border-gray-100',
        collapsed && 'justify-center'
      )}>
        <button
          onClick={handleProfileClick}
          className={cn(
            'flex items-center gap-3 hover:bg-gray-50 rounded-xl p-1 -m-1 transition-colors flex-1 min-w-0',
            collapsed && 'justify-center p-1'
          )}
          title="View profile"
          id="btn-user-profile"
        >
          <Avatar
            email={user?.email || ''}
            name={profile?.full_name || user?.email || ''}
            src={profile?.avatar_url}
            size="sm"
          />
          {!collapsed && (
            <div className="flex-1 min-w-0 slide-in text-left">
              <p className="text-sm font-medium text-gray-900 truncate">
                {profile?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0]}
              </p>
              <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                <User size={10} /> Profile
              </p>
            </div>
          )}
        </button>
        {!collapsed && (
          <button
            onClick={handleSignOut}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Sign out"
            id="btn-signout"
          >
            <LogOut size={15} />
          </button>
        )}
      </div>
    </aside>
  )
}

// ─── Top Header ───────────────────────────────────────────────────────────────
interface TopHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function TopHeader({ title, subtitle, actions }: TopHeaderProps) {
  const { user, profile } = useAuth()
  const { notifications, unreadCount, markAllAsRead, loading } = useNotifications()
  const [showDropdown, setShowDropdown] = useState(false)
  const { id: workspaceId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const handleProfileClick = () => {
    if (workspaceId) {
      navigate(`/workspace/${workspaceId}/profile`)
    } else {
      navigate('/profile')
    }
  }

  const handleToggleDropdown = () => {
    setShowDropdown(!showDropdown)
    if (!showDropdown && unreadCount > 0) {
      markAllAsRead()
    }
  }

  const getNotificationMessage = (notif: AppNotification) => {
    const actor = notif.user_name || notif.user_email?.split('@')[0] || 'Someone'
    const taskTitle = notif.details.task_title || 'a task'

    switch (notif.action_type) {
      case 'task_created':
        return (
          <span>
            <strong className="text-gray-900 font-semibold">{actor}</strong> created task{' '}
            <span className="text-violet-600 font-medium">"{taskTitle}"</span>
          </span>
        )
      case 'task_updated':
        if (notif.details.status_changed) {
          const newStatus = notif.details.new_status || 'todo'
          const statusMap: Record<string, string> = {
            todo: 'To Do',
            in_progress: 'In Progress',
            done: 'Done',
          }
          const statusLabel = statusMap[newStatus] || newStatus
          return (
            <span>
              <strong className="text-gray-900 font-semibold">{actor}</strong> moved{' '}
              <span className="text-gray-700 font-medium">"{taskTitle}"</span> to{' '}
              <span className="font-semibold text-violet-600">{statusLabel}</span>
            </span>
          )
        }
        return (
          <span>
            <strong className="text-gray-900 font-semibold">{actor}</strong> updated task{' '}
            <span className="text-gray-700 font-medium">"{taskTitle}"</span>
          </span>
        )
      case 'task_deleted':
        return (
          <span>
            <strong className="text-gray-900 font-semibold">{actor}</strong> deleted task{' '}
            <span className="text-red-500 font-medium">"{taskTitle}"</span>
          </span>
        )
      case 'comment_added':
        return (
          <span>
            <strong className="text-gray-900 font-semibold">{actor}</strong> commented on{' '}
            <span className="text-violet-600 font-medium">"{taskTitle}"</span>
            {notif.details.comment_preview && (
              <p className="text-xs text-gray-400 mt-1 italic line-clamp-1">
                "{notif.details.comment_preview}"
              </p>
            )}
          </span>
        )
      default:
        return <span>Activity in workspace</span>
    }
  }

  return (
    <header className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-white/70 backdrop-blur-sm relative z-30">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {actions}
        
        {/* Notification Bell with Popover */}
        <div className="relative">
          <button
            onClick={handleToggleDropdown}
            className={`relative w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 transition-colors ${
              showDropdown ? 'bg-violet-50 text-violet-600' : 'bg-gray-50 hover:bg-gray-100'
            }`}
            id="btn-notifications"
            aria-label="Notifications"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-violet-600 ring-2 ring-white animate-pulse" />
            )}
          </button>

          {showDropdown && (
            <>
              {/* Overlay to close the dropdown on click outside */}
              <div 
                className="fixed inset-0 z-45" 
                onClick={() => setShowDropdown(false)} 
              />
              
              {/* Dropdown Card */}
              <div className="absolute right-0 mt-2.5 w-80 max-h-[420px] overflow-hidden bg-white/95 backdrop-blur-md rounded-2xl border border-gray-100 shadow-2xl z-50 flex flex-col fade-in">
                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <span className="text-sm font-bold text-gray-800">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1"
                    >
                      <CheckCheck size={12} /> Mark all read
                    </button>
                  )}
                </div>

                {/* Notifications List */}
                <div className="flex-1 overflow-y-auto scrollbar-thin max-h-[350px]">
                  {loading && notifications.length === 0 ? (
                    <div className="flex justify-center py-10">
                      <div className="w-5 h-5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="text-center py-12 px-4 text-gray-400">
                      <Bell size={24} className="mx-auto mb-2 opacity-30" />
                      <p className="text-xs">No activity yet in this workspace</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className="px-4 py-3 hover:bg-violet-50/30 transition-colors flex gap-3 text-left"
                        >
                          <Avatar
                            email={notif.user_email || ''}
                            name={notif.user_name || notif.user_email || ''}
                            size="sm"
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-600 leading-normal">
                              {getNotificationMessage(notif)}
                            </p>
                            <span className="text-[10px] text-gray-400 mt-1 block">
                              {timeAgo(notif.created_at)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <button
          onClick={handleProfileClick}
          className="hover:opacity-80 transition-opacity rounded-full"
          title="View profile"
          id="btn-header-profile"
        >
          <Avatar
            email={user?.email || ''}
            name={profile?.full_name || user?.email || ''}
            src={profile?.avatar_url}
            size="sm"
          />
        </button>
      </div>
    </header>
  )
}
