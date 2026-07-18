import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  ChevronDown, ChevronRight, Settings, Star, Plus,
  CheckSquare, Users, Grid3X3, Calendar,
  Search, Zap, MoreHorizontal
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { Avatar } from '@/components/ui/Avatar'

interface ThreePanelLayoutProps {
  children?: React.ReactNode
  workspaceId: string
  workspaceName: string
  isOwner: boolean
}

// ─── Far-Left Icon Rail ────────────────────────────────────────────────────────
function IconRail({ workspaceId, isOwner }: ThreePanelLayoutProps) {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const currentPath = window.location.pathname

  const navItems = [
    { icon: <Grid3X3 size={18} />, to: `/workspace/${workspaceId}/dashboard`, label: 'Dashboard' },
    { icon: <CheckSquare size={18} />, to: `/workspace/${workspaceId}/tasks`, label: 'Tasks' },
    { icon: <Calendar size={18} />, to: `/workspace/${workspaceId}/timeline`, label: 'Timeline' },
    { icon: <Users size={18} />, to: `/workspace/${workspaceId}/members`, label: 'Members', ownerOnly: true },
  ]

  return (
    <div className="w-[78px] h-full bg-white border-r border-gray-200 flex flex-col items-center py-4 shrink-0">
      {/* Colorful circular gradient logo mark */}
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 flex items-center justify-center mb-8 shadow-sm">
        <div className="flex gap-[2px]">
          <div className="w-1.5 h-1.5 rounded-full bg-white" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/70" />
        </div>
      </div>

      {/* Nav Items */}
      <div className="flex-1 flex flex-col items-center gap-3">
        {navItems.map((item) => {
          if (item.ownerOnly && !isOwner) return null
          const isActive = currentPath.startsWith(item.to)
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'w-11 h-11 rounded-xl flex items-center justify-center transition-all',
                isActive
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
              )}
              title={item.label}
            >
              {item.icon}
            </NavLink>
          )
        })}
      </div>

      {/* Bottom */}
      <div className="flex flex-col items-center gap-3">
        <NavLink
          to={`/workspace/${workspaceId}/settings`}
          className={cn(
            'w-11 h-11 rounded-xl flex items-center justify-center transition-all',
            currentPath.includes('/settings')
              ? 'bg-blue-500 text-white shadow-sm'
              : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
          )}
          title="Settings"
        >
          <Settings size={18} />
        </NavLink>
        <button
          onClick={() => navigate(`/workspace/${workspaceId}/profile`)}
          className="w-10 h-10 rounded-full ring-2 ring-blue-500 overflow-hidden shadow-sm"
          title="Profile"
        >
          <Avatar
            email={user?.email || ''}
            name={profile?.full_name || user?.email || ''}
            src={profile?.avatar_url}
            size="md"
          />
        </button>
      </div>
    </div>
  )
}

// ─── File Tree Sidebar ────────────────────────────────────────────────────────
interface TreeSection {
  id: string
  label: string
  items: TreeItem[]
  defaultOpen?: boolean
}

interface TreeItem {
  id: string
  name: string
}

const TREE_SECTIONS: TreeSection[] = [
  {
    id: 'favorites',
    label: 'Favourites Files',
    defaultOpen: true,
    items: [
      { id: 'f1', name: 'Mobile App Project' },
      { id: 'f2', name: 'Q4 Roadmap' },
    ],
  },
  {
    id: 'projects',
    label: 'Projects',
    defaultOpen: true,
    items: [
      { id: 'p1', name: 'Mobile App' },
      { id: 'p2', name: 'Backend API' },
      { id: 'p3', name: 'Marketing Website' },
      { id: 'p4', name: 'Design System' },
    ],
  },
  {
    id: 'recent',
    label: 'Recent Files',
    defaultOpen: false,
    items: [
      { id: 'r1', name: 'User Research Doc' },
      { id: 'r2', name: 'API Spec v2' },
      { id: 'r3', name: 'Sprint Planning' },
    ],
  },
  {
    id: 'archive',
    label: 'Archive Files',
    defaultOpen: false,
    items: [
      { id: 'a1', name: 'Old Website Redesign' },
    ],
  },
  {
    id: 'deleted',
    label: 'Deleted Files',
    defaultOpen: false,
    items: [
      { id: 'd1', name: 'Draft Proposal' },
    ],
  },
]

function FileTreeSidebar() {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    favorites: true,
    projects: true,
  })
  const [selectedItem, setSelectedItem] = useState<string | null>('p1')
  const [search, setSearch] = useState('')

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }))
  }

  return (
    <div className="w-[215px] h-full bg-white border-r border-gray-100 flex flex-col shrink-0">
      {/* Search */}
      <div className="px-3 py-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search files…"
          className="w-full px-3 py-2 text-xs rounded-lg bg-gray-100 border-0 focus:outline-none focus:ring-2 focus:ring-gray-200 placeholder-gray-400"
        />
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto px-2 py-1 scrollbar-thin">
        {TREE_SECTIONS.map((section) => (
          <div key={section.id} className="mb-2">
            <button
              onClick={() => toggleSection(section.id)}
              className="flex items-center justify-between w-full px-2 py-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
            >
              <span>{section.label}</span>
              {expandedSections[section.id] ? (
                <ChevronDown size={12} className="text-gray-400" />
              ) : (
                <ChevronRight size={12} className="text-gray-400" />
              )}
            </button>

            {expandedSections[section.id] && (
              <div className="mt-0.5 space-y-[2px]">
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItem(item.id)}
                    className={cn(
                      'w-full px-2 py-1 rounded text-xs transition-colors text-left',
                      selectedItem === item.id
                        ? 'font-bold text-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    )}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Project CTA */}
      <div className="p-3 border-t border-gray-100">
        <button className="w-full py-2.5 text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm">
          <Plus size={14} />
          Add New Project
        </button>
      </div>
    </div>
  )
}

// ─── Main Header ───────────────────────────────────────────────────────────────
interface BreadcrumbItem {
  label: string
  href?: string
}

interface MainHeaderProps {
  breadcrumb?: BreadcrumbItem[]
  title: string
  subtitle?: string
}

export function MainHeader({ breadcrumb, title, subtitle }: MainHeaderProps) {
  const navigate = useNavigate()

  return (
    <div className="bg-white px-6 pt-4 pb-3">
      {/* Breadcrumb */}
      {breadcrumb && breadcrumb.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          {breadcrumb.map((crumb, index) => (
            <span key={index} className="flex items-center gap-1.5">
              {index > 0 && <span className="text-gray-300">/</span>}
              {crumb.href ? (
                <button
                  onClick={() => crumb.href && navigate(crumb.href)}
                  className="hover:text-gray-600 transition-colors"
                >
                  {crumb.label}
                </button>
              ) : (
                <span className={cn('font-medium', index === breadcrumb.length - 1 && 'text-gray-700')}>
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Title Row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-gray-900 leading-tight">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1">
          { /* Ghost circular icon buttons */ }
          <button className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <Search size={16} />
          </button>
          <button className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition-colors">
            <Zap size={16} />
          </button>
          <button className="w-9 h-9 rounded-full flex items-center justify-center text-amber-500 hover:bg-amber-50 transition-colors">
            <Star size={16} className="fill-amber-500" />
          </button>
          <button className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* Avatar stack + add collaborator */}
      <div className="flex items-center justify-end mt-3 -mb-1">
        <div className="flex items-center">
          {['AT', 'SK', 'ML'].map((initials, i) => (
            <div
              key={i}
              className={cn(
                'w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white',
                ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500'][i]
              )}
              style={{ marginLeft: i > 0 ? '-8px' : '0', zIndex: 10 - i }}
            >
              {initials}
            </div>
          ))}
          <div
            className="w-7 h-7 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[9px] font-semibold text-gray-500"
            style={{ marginLeft: '-8px' }}
          >
            +2
          </div>
          <button className="w-7 h-7 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center text-white ml-2 transition-colors shadow-sm">
            <Plus size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Timeline Tab Bar ─────────────────────────────────────────────────────────
interface TimelineTab {
  id: string
  label: string
}

interface TimelineTabBarProps {
  tabs: TimelineTab[]
  activeTab: string
  onTabChange: (tabId: string) => void
}

export function TimelineTabBar({ tabs, activeTab, onTabChange }: TimelineTabBarProps) {
  return (
    <div className="border-b border-gray-200 px-6 bg-white">
      <div className="flex items-center gap-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'py-3 text-sm font-medium border-b-2 transition-colors -mb-[1px]',
              activeTab === tab.id
                ? 'border-blue-500 text-gray-900 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Main Layout ──────────────────────────────────────────────────────────────
export function ThreePanelLayout({ children, workspaceId, workspaceName, isOwner }: ThreePanelLayoutProps) {
  return (
    <div className="flex h-screen bg-[#F7F7F8]">
      <IconRail workspaceId={workspaceId} workspaceName={workspaceName} isOwner={isOwner} />
      <FileTreeSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}
