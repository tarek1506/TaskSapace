import { NavLink } from 'react-router-dom'
import {
  Home, CheckSquare, Calendar, Users,
  Settings, MessageCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useChatUnread } from '@/contexts/ChatContext'

interface DashboardSidebarProps {
  workspaceId: string
  workspaceName: string
  isOwner: boolean
  onNavClick?: () => void
}

export function DashboardSidebar({ workspaceId, workspaceName, isOwner, onNavClick }: DashboardSidebarProps) {
  const { user, profile } = useAuth()
  const { totalUnread } = useChatUnread()

  const userName = profile?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'
  const initials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  const navItems = [
    { icon: <Home size={18} />, label: 'Home', to: `/workspace/${workspaceId}/dashboard`, id: 'nav-home' },
    { icon: <CheckSquare size={18} />, label: 'Tasks', to: `/workspace/${workspaceId}/tasks`, id: 'nav-tasks' },
    { icon: <Calendar size={18} />, label: 'Calendar', to: `/workspace/${workspaceId}/calendar`, id: 'nav-calendar' },
    { icon: <MessageCircle size={18} />, label: 'Messages', to: `/workspace/${workspaceId}/chat`, id: 'nav-chat', badge: totalUnread },
    ...(isOwner ? [{ icon: <Users size={18} />, label: 'Members', to: `/workspace/${workspaceId}/members`, id: 'nav-members' }] : []),
  ]

  return (
    <aside className="w-[260px] h-full bg-white dark:bg-gray-900 flex flex-col shrink-0 border-r border-gray-100 dark:border-gray-800">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white">
            <path d="M9 6l6 6-6 6M15 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">{workspaceName}</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map(item => (
          <NavLink
            key={item.id}
            to={item.to}
            onClick={onNavClick}
            className={({ isActive }) => cn(
              'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
              isActive
                ? 'bg-[#EDE9FE] text-purple-700 dark:bg-violet-950 dark:text-violet-300'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
            )}
          >
            {({ isActive }) => (
              <>
                <span className={cn(isActive ? 'text-purple-600 dark:text-violet-400' : 'text-gray-400 dark:text-gray-500')}>
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {'badge' in item && item.badge! > 0 && (
                  <span className="min-w-[18px] h-[18px] flex items-center justify-center bg-violet-500 text-white text-[10px] font-bold rounded-full px-1">
                    {item.badge! > 9 ? '9+' : item.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom User Section */}
      <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{userName}</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{user?.email}</p>
          </div>
          <NavLink
            to={`/workspace/${workspaceId}/settings`}
            className={({ isActive }) => cn(
              'p-1.5 rounded-lg transition-colors',
              isActive ? 'text-purple-600 bg-purple-50 dark:text-violet-400 dark:bg-violet-950' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-800'
            )}
          >
            <Settings size={16} />
          </NavLink>
        </div>
      </div>
    </aside>
  )
}
