import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, CheckSquare, Users, Settings, LogOut,
  ChevronLeft, ChevronRight, Plus, Zap, Bell
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { Avatar } from '@/components/ui/Avatar'

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
  const { user, signOut } = useAuth()
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
        className="absolute -right-3 top-20 z-10 w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
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
        <Avatar
          email={user?.email || ''}
          name={user?.user_metadata?.name || user?.email || ''}
          size="sm"
        />
        {!collapsed && (
          <div className="flex-1 min-w-0 slide-in">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.user_metadata?.name || user?.email?.split('@')[0]}
            </p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
        )}
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
  const { user } = useAuth()

  return (
    <header className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-white/70 backdrop-blur-sm">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {actions}
        <button
          className="relative w-9 h-9 rounded-xl bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
          id="btn-notifications"
          aria-label="Notifications"
        >
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-violet-500 pulse-dot" />
        </button>
        <Avatar
          email={user?.email || ''}
          name={user?.user_metadata?.name || user?.email || ''}
          size="sm"
        />
      </div>
    </header>
  )
}
