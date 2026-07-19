import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  LayoutDashboard, Inbox, ChevronDown, Plus, Settings, HelpCircle, Star,
  User, GraduationCap, Briefcase, Box, Search, Bell
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { Avatar } from '@/components/ui/Avatar'
import { useNotifications } from '@/contexts/NotificationContext'
import type { AppNotification } from '@/types'

interface SidebarProps {
  workspaceId: string
  workspaceName: string
}

interface NavItem {
  icon: React.ReactNode
  label: string
  id: string
  badge?: number
}

interface GroupItem {
  icon: React.ReactNode
  iconBg: string
  label: string
  id: string
  badge?: number
}

const PERSONAL_ITEMS: GroupItem[] = [
  { icon: <User size={14} />, iconBg: 'bg-blue-100 text-blue-600', label: 'My Tasks', id: 'my-tasks' },
  { icon: <GraduationCap size={14} />, iconBg: 'bg-amber-100 text-amber-600', label: 'Learning', id: 'learning' },
]

const WORKSPACE_ITEMS: GroupItem[] = [
  { icon: <Briefcase size={14} />, iconBg: 'bg-violet-100 text-violet-600', label: 'Design', id: 'ws-design' },
  { icon: <Box size={14} />, iconBg: 'bg-emerald-100 text-emerald-600', label: 'Backend API', id: 'ws-backend' },
  { icon: <GraduationCap size={14} />, iconBg: 'bg-rose-100 text-rose-600', label: 'Marketing', id: 'ws-marketing' },
  { icon: <Box size={14} />, iconBg: 'bg-orange-100 text-orange-600', label: 'Mobile App', id: 'ws-mobile', badge: 3 },
  { icon: <Search size={14} />, iconBg: 'bg-cyan-100 text-cyan-600', label: 'Research', id: 'ws-research' },
  { icon: <User size={14} />, iconBg: 'bg-indigo-100 text-indigo-600', label: 'HR', id: 'ws-hr' },
]

export function Sidebar(_props: SidebarProps) {
  const { user, profile } = useAuth()
  const [activeItem, setActiveItem] = useState('nav-dashboard')

  const primaryNav: NavItem[] = [
    { icon: <LayoutDashboard size={16} />, label: 'Dashboard', id: 'nav-dashboard' },
    { icon: <Inbox size={16} />, label: 'Inbox', id: 'nav-inbox', badge: 5 },
  ]

  const bottomLinks = [
    { icon: <Settings size={15} />, label: 'Settings', id: 'settings' },
    { icon: <Star size={15} />, label: 'Preferences', id: 'preferences' },
    { icon: <HelpCircle size={15} />, label: 'Helps', id: 'helps' },
  ]

  const userName = profile?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'
  const userEmail = user?.email || ''
  const initials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <aside className="flex flex-col w-[220px] h-full bg-white border-r border-gray-200 shrink-0">
      {/* User Profile Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100">
        <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {initials || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{userName}</p>
          <p className="text-[11px] text-gray-400 truncate leading-tight">{userEmail}</p>
        </div>
        <ChevronDown size={14} className="text-gray-400 shrink-0" />
      </div>

      {/* Primary Nav */}
      <nav className="px-2 pt-3 pb-2 space-y-0.5">
        {primaryNav.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveItem(item.id)}
            className={cn(
              'flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-sm transition-colors',
              activeItem === item.id
                ? 'bg-gray-100 text-gray-900 font-semibold'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <span className="text-gray-500">{item.icon}</span>
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge && (
              <span className="text-[11px] font-semibold bg-red-500 text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Personal Section */}
      <div className="px-3 pt-3 pb-1">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Personal</span>
          <button className="p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 opacity-0 group-hover:opacity-100">
            <Plus size={12} />
          </button>
        </div>
        <div className="space-y-0.5">
          {PERSONAL_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveItem(item.id)}
              className={cn(
                'flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-sm transition-colors',
                activeItem === item.id
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              <div className={cn('w-6 h-6 rounded-md flex items-center justify-center shrink-0', item.iconBg)}>
                {item.icon}
              </div>
              <span className="flex-1 text-left">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Workspaces Section */}
      <div className="px-3 pt-3 pb-1 flex-1 overflow-y-auto scrollbar-thin">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Workspaces</span>
          <button className="p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <Plus size={12} />
          </button>
        </div>
        <div className="space-y-0.5">
          {WORKSPACE_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveItem(item.id)}
              className={cn(
                'flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-sm transition-colors',
                activeItem === item.id
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              <div className={cn('w-6 h-6 rounded-md flex items-center justify-center shrink-0', item.iconBg)}>
                {item.icon}
              </div>
              <span className="flex-1 text-left truncate">{item.label}</span>
              {item.badge && (
                <span className="text-[11px] font-semibold bg-red-500 text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Utility Links */}
      <div className="border-t border-gray-100 px-2 py-2 space-y-0.5">
        {bottomLinks.map(item => (
          <button
            key={item.id}
            className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </aside>
  )
}

// ─── Legacy exports (for backward compatibility) ──────────────────────────────

interface Tab {
  id: string
  label: string
  icon: React.ReactNode
}

interface TabBarProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  actions?: React.ReactNode
}

export function TabBar({ tabs, activeTab, onTabChange, actions }: TabBarProps) {
  return (
    <div className="flex items-center justify-between px-6 border-b border-gray-100">
      <div className="flex items-center gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition-colors',
              activeTab === tab.id
                ? 'border-gray-900 text-gray-900 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      {actions}
    </div>
  )
}

interface PageHeaderProps {
  title: string
  actions?: React.ReactNode
}

export function PageHeader({ title, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      {actions}
    </div>
  )
}

interface TopUtilityBarProps {
  workspaceName: string
}

export function TopUtilityBar({ workspaceName }: TopUtilityBarProps) {
  const { user, profile, signOut } = useAuth()
  const { unreadCount, markAllAsRead, notifications } = useNotifications()
  const [showDropdown, setShowDropdown] = useState(false)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const navigate = useNavigate()
  const { id: workspaceId } = useParams<{ id: string }>()

  const getNotificationMessage = (notif: AppNotification) => {
    const actor = notif.user_name || notif.user_email?.split('@')[0] || 'Someone'
    const taskTitle = notif.details.task_title || 'a task'
    switch (notif.action_type) {
      case 'task_created':
        return <span><strong className="text-gray-900">{actor}</strong> created &ldquo;{taskTitle}&rdquo;</span>
      case 'task_updated':
        if (notif.details.status_changed) {
          const statusMap: Record<string, string> = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' }
          return <span><strong className="text-gray-900">{actor}</strong> moved &ldquo;{taskTitle}&rdquo; to <span className="text-violet-600">{statusMap[notif.details.new_status || 'todo']}</span></span>
        }
        return <span><strong className="text-gray-900">{actor}</strong> updated &ldquo;{taskTitle}&rdquo;</span>
      case 'comment_added':
        return <span><strong className="text-gray-900">{actor}</strong> commented on &ldquo;{taskTitle}&rdquo;</span>
      default:
        return <span>New activity</span>
    }
  }

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-100">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-500">{workspaceName}</span>
        <span className="text-gray-300">/</span>
        <span className="font-medium text-gray-900">Tasks</span>
      </div>
      <div className="flex items-center gap-1">
        <button className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition-colors" title="Favorite">
          <Star size={16} />
        </button>
        <button className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" title="Share">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>
          </svg>
        </button>
        <div className="relative">
          <button
            onClick={() => { setShowDropdown(!showDropdown); if (!showDropdown && unreadCount > 0) markAllAsRead() }}
            className={cn(
              'relative w-9 h-9 rounded-full flex items-center justify-center transition-colors',
              showDropdown ? 'bg-violet-50 text-violet-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            )}
            title="Notifications"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>
          {showDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
              <div className="absolute right-0 mt-2 w-80 max-h-[400px] overflow-hidden bg-white rounded-xl border border-gray-200 shadow-lg z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <span className="text-sm font-semibold text-gray-900">Notifications</span>
                </div>
                <div className="overflow-y-auto max-h-[340px]">
                  {notifications.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <Bell size={20} className="mx-auto mb-2 opacity-30" />
                      <p className="text-xs">No notifications yet</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {notifications.map((notif) => (
                        <div key={notif.id} className="px-4 py-3 hover:bg-gray-50 text-xs">
                          <p className="text-gray-600">{getNotificationMessage(notif)}</p>
                          <p className="text-gray-400 mt-0.5">{new Date(notif.created_at).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
        <div className="relative ml-1">
          <button
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <div className="relative">
              <Avatar
                email={user?.email || ''}
                name={profile?.full_name || user?.email || ''}
                src={profile?.avatar_url}
                size="sm"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white" />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0]}
            </span>
            <ChevronDown size={12} className="text-gray-400" />
          </button>
          {showProfileDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowProfileDropdown(false)} />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
                <button
                  onClick={() => { navigate(`/workspace/${workspaceId}/profile`); setShowProfileDropdown(false) }}
                  className="w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Profile
                </button>
                <button
                  onClick={() => { setShowProfileDropdown(false); signOut() }}
                  className="w-full px-4 py-2.5 text-sm text-left text-red-600 hover:bg-red-50 transition-colors"
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

interface TopHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function TopHeader({ title, subtitle, actions }: TopHeaderProps) {
  const { user, profile, signOut } = useAuth()
  const { unreadCount, markAllAsRead, notifications } = useNotifications()
  const [showDropdown, setShowDropdown] = useState(false)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const navigate = useNavigate()
  const { id: workspaceId } = useParams<{ id: string }>()

  const handleProfileClick = () => {
    setShowProfileDropdown(false)
    if (workspaceId) {
      navigate(`/workspace/${workspaceId}/profile`)
    } else {
      navigate('/profile')
    }
  }

  const handleToggleDropdown = () => {
    const next = !showDropdown
    setShowDropdown(next)
    if (next && unreadCount > 0) {
      markAllAsRead()
    }
  }

  const getNotificationMessage = (notif: AppNotification) => {
    const actor = notif.user_name || notif.user_email?.split('@')[0] || 'Someone'
    const taskTitle = notif.details.task_title || 'a task'
    switch (notif.action_type) {
      case 'task_created':
        return <span><strong className="text-gray-900">{actor}</strong> created &ldquo;{taskTitle}&rdquo;</span>
      case 'task_updated':
        if (notif.details.status_changed) {
          const statusMap: Record<string, string> = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' }
          return <span><strong className="text-gray-900">{actor}</strong> moved &ldquo;{taskTitle}&rdquo; to <span className="text-violet-600">{statusMap[notif.details.new_status || 'todo']}</span></span>
        }
        return <span><strong className="text-gray-900">{actor}</strong> updated &ldquo;{taskTitle}&rdquo;</span>
      case 'comment_added':
        return <span><strong className="text-gray-900">{actor}</strong> commented on &ldquo;{taskTitle}&rdquo;</span>
      default:
        return <span>New activity</span>
    }
  }

  return (
    <header className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5 border-b border-gray-100 bg-white/70 backdrop-blur-sm relative z-30">
      <div className="min-w-0 flex-1 mr-4">
        <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{title}</h1>
        {subtitle && <p className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {actions}

        {/* Notification Bell with Dropdown */}
        <div className="relative">
          <button
            onClick={handleToggleDropdown}
            className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
              showDropdown ? 'bg-violet-50 text-violet-600' : 'bg-gray-50 hover:bg-gray-100 text-gray-500'
            }`}
            aria-label="Notifications"
            id="btn-notifications"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </button>

          {showDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
              <div className="absolute right-0 top-full mt-2 w-80 max-h-[400px] overflow-hidden bg-white rounded-xl border border-gray-200 shadow-xl z-50">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">Notifications</span>
                  {notifications.length > 0 && (
                    <span className="text-xs text-gray-400">{notifications.length} total</span>
                  )}
                </div>
                <div className="overflow-y-auto max-h-[340px] scrollbar-thin">
                  {notifications.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      <Bell size={22} className="mx-auto mb-2 opacity-30" />
                      <p className="text-xs font-medium">No notifications yet</p>
                      <p className="text-[11px] mt-1 text-gray-300">Activity will appear here</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => {
                            if (notif.task_id && workspaceId) {
                              navigate(`/workspace/${workspaceId}/tasks/${notif.task_id}`)
                              setShowDropdown(false)
                            }
                          }}
                        >
                          <p className="text-xs text-gray-600 leading-relaxed">{getNotificationMessage(notif)}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {new Date(notif.created_at).toLocaleString('en-US', {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Profile button with dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="hover:opacity-80 transition-opacity rounded-full"
          >
            <Avatar
              email={user?.email || ''}
              name={profile?.full_name || user?.email || ''}
              src={profile?.avatar_url}
              size="sm"
            />
          </button>
          {showProfileDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowProfileDropdown(false)} />
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {profile?.full_name || user?.email?.split('@')[0]}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={handleProfileClick}
                  className="w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Profile
                </button>
                <button
                  onClick={() => { setShowProfileDropdown(false); signOut() }}
                  className="w-full px-4 py-2.5 text-sm text-left text-red-600 hover:bg-red-50 transition-colors"
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
