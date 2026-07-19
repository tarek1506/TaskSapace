import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { GanttTimeline } from '@/components/timeline/GanttTimeline'
import { cn } from '@/lib/utils'
import type { Workspace, WorkspaceMember } from '@/types'

interface OutletCtx {
  workspace: Workspace
  member: WorkspaceMember
  isOwner: boolean
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'board', label: 'Board' },
  { id: 'kanban', label: 'Kanban' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'table', label: 'Table' },
]

export function TimelinePage() {
  const { workspace } = useOutletContext<OutletCtx>()
  const [activeTab, setActiveTab] = useState('timeline')

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white px-4 sm:px-8 pt-4 sm:pt-5 pb-0">
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
          <span>{workspace.name}</span>
          <span>/</span>
          <span className="text-gray-700 font-medium">Timeline</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Timeline</h1>
        <p className="text-sm text-gray-500 mt-0.5">Project roadmap and task scheduling</p>

        {/* Tab Bar */}
        <div className="flex items-center gap-4 sm:gap-6 mt-4 border-b border-gray-200 overflow-x-auto scrollbar-thin">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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

      <GanttTimeline />
    </div>
  )
}
