import { Plus, MessageSquare, CheckSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProjectCard {
  id: string
  emoji: string
  emojiBg: string
  title: string
  description: string
  priority: { label: string; textColor: string; bg: string }
  assignees: { initials: string; color: string }[]
  comments: number
  done: number
  total: number
}

interface Column {
  id: string
  label: string
  count: number
  countColor: string
  countBg: string
  cards: ProjectCard[]
}

const COLUMNS: Column[] = [
  {
    id: 'backlog',
    label: 'Backlog',
    count: 4,
    countColor: 'text-gray-600',
    countBg: 'bg-gray-100',
    cards: [
      { id: 'p1', emoji: '🎨', emojiBg: 'bg-amber-100', title: 'Brand Guidelines Refresh', description: 'Update visual identity with new color palette and typography standards across all platforms.', priority: { label: 'Low', textColor: 'text-green-600', bg: 'bg-green-50' }, assignees: [{ initials: 'AL', color: 'bg-blue-500' }, { initials: 'SK', color: 'bg-emerald-500' }], comments: 3, done: 0, total: 6 },
      { id: 'p2', emoji: '🔧', emojiBg: 'bg-blue-100', title: 'Rate Limiter Refactor', description: 'Rewrite middleware to support sliding window algorithm and configurable thresholds per tier.', priority: { label: 'Medium', textColor: 'text-amber-600', bg: 'bg-amber-50' }, assignees: [{ initials: 'ML', color: 'bg-purple-500' }], comments: 8, done: 2, total: 8 },
      { id: 'p3', emoji: '📊', emojiBg: 'bg-rose-100', title: 'Q3 Analytics Dashboard', description: 'Build interactive dashboard showing key metrics, conversion funnels, and cohort analysis.', priority: { label: 'Medium', textColor: 'text-amber-600', bg: 'bg-amber-50' }, assignees: [{ initials: 'EW', color: 'bg-cyan-500' }, { initials: 'JP', color: 'bg-amber-500' }], comments: 12, done: 1, total: 4 },
    ],
  },
  {
    id: 'in-progress',
    label: 'In Progress',
    count: 3,
    countColor: 'text-blue-600',
    countBg: 'bg-blue-100',
    cards: [
      { id: 'p4', emoji: '🎯', emojiBg: 'bg-orange-100', title: 'User Onboarding Flow', description: 'Redesign onboarding experience with progressive disclosure and interactive tooltips.', priority: { label: 'High', textColor: 'text-red-600', bg: 'bg-red-50' }, assignees: [{ initials: 'AL', color: 'bg-blue-500' }, { initials: 'SK', color: 'bg-emerald-500' }, { initials: 'ML', color: 'bg-purple-500' }], comments: 15, done: 3, total: 12 },
      { id: 'p5', emoji: '🛡️', emojiBg: 'bg-indigo-100', title: 'RBAC Permission System', description: 'Implement role-based access control with granular permission flags and audit logging.', priority: { label: 'High', textColor: 'text-red-600', bg: 'bg-red-50' }, assignees: [{ initials: 'JP', color: 'bg-amber-500' }, { initials: 'LW', color: 'bg-rose-500' }], comments: 6, done: 5, total: 14 },
    ],
  },
  {
    id: 'review',
    label: 'Review',
    count: 2,
    countColor: 'text-amber-600',
    countBg: 'bg-amber-100',
    cards: [
      { id: 'p6', emoji: '📱', emojiBg: 'bg-teal-100', title: 'Mobile Navigation v2', description: 'Implement bottom tab navigation with animated transitions and gesture support.', priority: { label: 'Medium', textColor: 'text-amber-600', bg: 'bg-amber-50' }, assignees: [{ initials: 'EW', color: 'bg-cyan-500' }], comments: 4, done: 6, total: 7 },
    ],
  },
  {
    id: 'done',
    label: 'Done',
    count: 5,
    countColor: 'text-green-600',
    countBg: 'bg-green-100',
    cards: [
      { id: 'p7', emoji: '📐', emojiBg: 'bg-violet-100', title: 'Design System Migration', description: 'Migrate all components from legacy design tokens to the new design system spec.', priority: { label: 'Low', textColor: 'text-green-600', bg: 'bg-green-50' }, assignees: [{ initials: 'SK', color: 'bg-emerald-500' }, { initials: 'AL', color: 'bg-blue-500' }], comments: 9, done: 8, total: 8 },
      { id: 'p8', emoji: '⚡', emojiBg: 'bg-yellow-100', title: 'API Performance Audit', description: 'Profile and optimize critical API endpoints to reduce p95 latency under 200ms.', priority: { label: 'Medium', textColor: 'text-amber-600', bg: 'bg-amber-50' }, assignees: [{ initials: 'ML', color: 'bg-purple-500' }], comments: 2, done: 4, total: 4 },
    ],
  },
]

export function ProjectsBoard() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
      {COLUMNS.map(col => (
        <div key={col.id} className="flex-1 min-w-[260px] max-w-[300px]">
          {/* Column Header */}
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900">{col.label}</span>
              <span className={cn(
                'text-[11px] font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none',
                col.countBg,
                col.countColor
              )}>
                {col.count}
              </span>
            </div>
            <button className="p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <Plus size={14} />
            </button>
          </div>

          {/* Cards */}
          <div className="space-y-3">
            {col.cards.map(card => (
              <div
                key={card.id}
                className="bg-white rounded-xl border border-gray-200 p-3.5 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all"
              >
                {/* Top Row: Emoji tile + Priority pill */}
                <div className="flex items-start justify-between mb-2.5">
                  <div className={cn('w-7 h-7 rounded-md flex items-center justify-center text-xs shrink-0', card.emojiBg)}>
                    {card.emoji}
                  </div>
                  <span className={cn(
                    'text-[11px] font-medium px-2 py-0.5 rounded-full',
                    card.priority.bg,
                    card.priority.textColor
                  )}>
                    {card.priority.label}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold text-gray-900 mb-1 leading-snug">{card.title}</h3>

                {/* Description */}
                <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed">{card.description}</p>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  {/* Avatar stack */}
                  <div className="flex items-center">
                    {card.assignees.slice(0, 3).map((a, i) => (
                      <div
                        key={i}
                        className={cn(
                          'w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[7px] font-bold text-white',
                          a.color
                        )}
                        style={{ marginLeft: i > 0 ? '-6px' : '0', zIndex: 10 - i }}
                      >
                        {a.initials}
                      </div>
                    ))}
                    {card.assignees.length > 3 && (
                      <div
                        className="w-5 h-5 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[7px] font-medium text-gray-500"
                        style={{ marginLeft: '-6px' }}
                      >
                        +{card.assignees.length - 3}
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-2.5 text-gray-400">
                    <span className="flex items-center gap-1 text-[11px]">
                      <MessageSquare size={10} />
                      {card.comments}
                    </span>
                    <span className="flex items-center gap-1 text-[11px]">
                      <CheckSquare size={10} />
                      {card.done}/{card.total}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
