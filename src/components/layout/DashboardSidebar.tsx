import { NavLink } from 'react-router-dom'
import {
  Home, CheckSquare, Calendar, Users,
  Settings, Folder, Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'

interface DashboardSidebarProps {
  workspaceId: string
  workspaceName: string
  isOwner: boolean
}

interface Team {
  id: string
  name: string
  avatars: { initials: string; color: string }[]
  count: number
}

interface Favorite {
  id: string
  title: string
  icon: React.ReactNode
  iconBg: string
  ongoing: number
}

const TEAMS: Team[] = [
  { id: 'design', name: 'Design Team', avatars: [{ initials: 'AL', color: 'bg-pink-400' }, { initials: 'SK', color: 'bg-purple-400' }, { initials: 'ML', color: 'bg-indigo-400' }], count: 4 },
  { id: 'eng', name: 'Engineering', avatars: [{ initials: 'JP', color: 'bg-blue-400' }, { initials: 'LW', color: 'bg-teal-400' }, { initials: 'EW', color: 'bg-amber-400' }], count: 2 },
]

const FAVORITES: Favorite[] = [
  { id: 'f1', title: 'Q4 Roadmap', icon: <Folder size={14} />, iconBg: 'bg-teal-100 text-teal-600', ongoing: 3 },
  { id: 'f2', title: 'Mobile App', icon: <Zap size={14} />, iconBg: 'bg-red-100 text-red-600', ongoing: 7 },
]

export function DashboardSidebar({ workspaceId, workspaceName, isOwner }: DashboardSidebarProps) {
  const { user, profile } = useAuth()

  const userName = profile?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'
  const initials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  const navItems = [
    { icon: <Home size={18} />, label: 'Home', to: `/workspace/${workspaceId}/dashboard`, id: 'nav-home' },
    { icon: <CheckSquare size={18} />, label: 'Tasks', to: `/workspace/${workspaceId}/tasks`, id: 'nav-tasks' },
    { icon: <Calendar size={18} />, label: 'Calendar', to: `/workspace/${workspaceId}/calendar`, id: 'nav-calendar' },
    ...(isOwner ? [{ icon: <Users size={18} />, label: 'Members', to: `/workspace/${workspaceId}/members`, id: 'nav-members' }] : []),
  ]

  return (
    <aside className="w-[260px] h-full bg-white flex flex-col shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white">
            <path d="M9 6l6 6-6 6M15 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="font-bold text-gray-900 text-sm">{workspaceName}</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map(item => (
          <NavLink
            key={item.id}
            to={item.to}
            className={({ isActive }) => cn(
              'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
              isActive
                ? 'bg-[#EDE9FE] text-purple-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            {({ isActive }) => (
              <>
                <span className={cn(isActive ? 'text-purple-600' : 'text-gray-400')}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Teams Section */}
        <div className="pt-5">
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Teams</span>
          </div>
          <div className="space-y-1">
            {TEAMS.map(team => (
              <button
                key={team.id}
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center -space-x-1.5">
                  {team.avatars.slice(0, 3).map((a, i) => (
                    <div
                      key={i}
                      className={cn('w-5 h-5 rounded-full border border-white flex items-center justify-center text-[7px] font-bold text-white', a.color)}
                      style={{ zIndex: 10 - i }}
                    >
                      {a.initials}
                    </div>
                  ))}
                  {team.count > 3 && (
                    <div className="w-5 h-5 rounded-full border border-white bg-gray-100 flex items-center justify-center text-[7px] font-medium text-gray-500">
                      +{team.count - 3}
                    </div>
                  )}
                </div>
                <span className="truncate">{team.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Favorites Section */}
        <div className="pt-4">
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Favorites</span>
          </div>
          <div className="space-y-1">
            {FAVORITES.map(fav => (
              <button
                key={fav.id}
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', fav.iconBg)}>
                  {fav.icon}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-gray-700 truncate">{fav.title}</p>
                  <p className="text-[11px] text-gray-400">{fav.ongoing} ongoing task</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Bottom User Section */}
      <div className="px-3 py-3 border-t border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{userName}</p>
            <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
          </div>
          <NavLink
            to={`/workspace/${workspaceId}/settings`}
            className={({ isActive }) => cn(
              'p-1.5 rounded-lg transition-colors',
              isActive ? 'text-purple-600 bg-purple-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            )}
          >
            <Settings size={16} />
          </NavLink>
        </div>
      </div>
    </aside>
  )
}
