import { useState } from 'react'
import { ChevronDown, Plus, Filter, SortAsc, Search, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SubTab {
  id: string
  label: string
  icon: string
}

interface SectionBlockProps {
  title: string
  icon: string
  iconBg: string
  subTabs: SubTab[]
  activeSubTab?: string
  onSubTabChange?: (tabId: string) => void
  children: React.ReactNode
  actions?: React.ReactNode
}

export function SectionBlock({
  title,
  icon,
  iconBg,
  subTabs,
  activeSubTab,
  onSubTabChange,
  children,
  actions,
}: SectionBlockProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [tab, setTab] = useState(activeSubTab || subTabs[0]?.id)

  const handleTabChange = (tabId: string) => {
    setTab(tabId)
    onSubTabChange?.(tabId)
  }

  return (
    <div className="bg-white dark:bg-gray-800">
      {/* Section Header */}
      <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2.5">
          <div className={cn('w-7 h-7 rounded-md flex items-center justify-center text-xs', iconBg)}>
            {icon}
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h2>
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronDown
            size={16}
            className={cn('transition-transform', collapsed && '-rotate-90')}
          />
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Sub-tab Row */}
          <div className="flex items-center justify-between mt-3 mb-3">
            <div className="flex items-center gap-0.5">
              {subTabs.map(st => (
                <button
                  key={st.id}
                  onClick={() => handleTabChange(st.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors',
                    tab === st.id
                      ? 'text-gray-900 dark:text-gray-100 font-semibold border-b-2 border-blue-500 rounded-none pb-[5px]'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  )}
                >
                  <span className="text-[13px]">{st.icon}</span>
                  <span>{st.label}</span>
                </button>
              ))}
              <button className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 ml-1">
                <Plus size={14} />
              </button>
            </div>

            {/* Utility Row */}
            <div className="flex items-center gap-1">
              <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <Filter size={13} />
                <span>Filter</span>
              </button>
              <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <SortAsc size={13} />
                <span>Sort</span>
              </button>
              <button className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <Search size={13} />
              </button>
              <button className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <MoreHorizontal size={13} />
              </button>
              {actions}
            </div>
          </div>

          {/* Content */}
          {children}
        </>
      )}
    </div>
  )
}
