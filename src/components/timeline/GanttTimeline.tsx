import { useState } from 'react'
import { ChevronLeft, ChevronRight, MessageSquare, Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GanttTask {
  id: string
  title: string
  description: string
  startDay: number
  duration: number
  accentColor: string
  accentBg: string
  assignees: { initials: string; color: string }[]
  comments: number
  attachments: number
  swimlane: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function formatDayName(year: number, month: number, day: number) {
  return new Date(year, month, day).toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)
}

function isToday(year: number, month: number, day: number) {
  const t = new Date()
  return t.getFullYear() === year && t.getMonth() === month && t.getDate() === day
}

const COLUMN_WIDTH = 44
const SWIMLANE_GAP = 4

// ─── Sample Data ──────────────────────────────────────────────────────────────

const SAMPLE_TASKS: GanttTask[] = [
  { id: 't1', title: 'Design System Audit', description: 'Review existing components and identify gaps', startDay: 1, duration: 4, accentColor: 'border-l-green-500', accentBg: 'bg-green-50', assignees: [{ initials: 'AL', color: 'bg-blue-500' }], comments: 5, attachments: 3, swimlane: 0 },
  { id: 't2', title: 'User Onboarding Flow', description: 'Redesign onboarding with progressive disclosure', startDay: 3, duration: 6, accentColor: 'border-l-teal-500', accentBg: 'bg-teal-50', assignees: [{ initials: 'SK', color: 'bg-emerald-500' }, { initials: 'ML', color: 'bg-purple-500' }], comments: 12, attachments: 7, swimlane: 1 },
  { id: 't3', title: 'API Rate Limiting', description: 'Sliding window algorithm for all tiers', startDay: 5, duration: 5, accentColor: 'border-l-orange-500', accentBg: 'bg-orange-50', assignees: [{ initials: 'JP', color: 'bg-amber-500' }], comments: 8, attachments: 2, swimlane: 2 },
  { id: 't4', title: 'Dashboard Analytics Widgets', description: 'Build interactive charts and data tables', startDay: 8, duration: 7, accentColor: 'border-l-blue-500', accentBg: 'bg-blue-50', assignees: [{ initials: 'EW', color: 'bg-cyan-500' }, { initials: 'AL', color: 'bg-blue-500' }, { initials: 'SK', color: 'bg-emerald-500' }], comments: 15, attachments: 4, swimlane: 0 },
  { id: 't5', title: 'Mobile Nav Gesture Support', description: 'Swipe and pull gestures for bottom tabs', startDay: 10, duration: 4, accentColor: 'border-l-green-500', accentBg: 'bg-green-50', assignees: [{ initials: 'LW', color: 'bg-rose-500' }], comments: 3, attachments: 1, swimlane: 1 },
  { id: 't6', title: 'RBAC Permission Matrix', description: 'Implement role-based access with audit trail', startDay: 12, duration: 8, accentColor: 'border-l-teal-500', accentBg: 'bg-teal-50', assignees: [{ initials: 'ML', color: 'bg-purple-500' }, { initials: 'JP', color: 'bg-amber-500' }], comments: 9, attachments: 6, swimlane: 2 },
  { id: 't7', title: 'Load Testing Pipeline', description: 'CI/CD integration for k6 performance tests', startDay: 14, duration: 3, accentColor: 'border-l-orange-500', accentBg: 'bg-orange-50', assignees: [{ initials: 'EW', color: 'bg-cyan-500' }], comments: 4, attachments: 2, swimlane: 0 },
  { id: 't8', title: 'Color Palette Migration', description: 'Migrate all components to new design tokens', startDay: 16, duration: 5, accentColor: 'border-l-blue-500', accentBg: 'bg-blue-50', assignees: [{ initials: 'SK', color: 'bg-emerald-500' }, { initials: 'AL', color: 'bg-blue-500' }], comments: 7, attachments: 5, swimlane: 1 },
  { id: 't9', title: 'Sprint Demo Preparation', description: 'Compile release notes and demo script', startDay: 18, duration: 2, accentColor: 'border-l-green-500', accentBg: 'bg-green-50', assignees: [{ initials: 'JP', color: 'bg-amber-500' }, { initials: 'LW', color: 'bg-rose-500' }], comments: 2, attachments: 0, swimlane: 2 },
  { id: 't10', title: 'API Documentation v2', description: 'OpenAPI spec with interactive examples', startDay: 20, duration: 6, accentColor: 'border-l-teal-500', accentBg: 'bg-teal-50', assignees: [{ initials: 'ML', color: 'bg-purple-500' }], comments: 11, attachments: 8, swimlane: 0 },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function GanttTimeline() {
  const now = new Date()
  const [currentDate, setCurrentDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1))
  const [selectedDay, setSelectedDay] = useState(now.getDate())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const totalWidth = daysInMonth * COLUMN_WIDTH

  // Group tasks by swimlane
  const swimlanes = SAMPLE_TASKS.reduce<{ tasks: GanttTask[]; label: string }[]>((acc, task) => {
    if (!acc[task.swimlane]) acc[task.swimlane] = { tasks: [], label: `Task Row ${task.swimlane + 1}` }
    acc[task.swimlane].tasks.push(task)
    return acc
  }, [])

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
    setSelectedDay(1)
  }
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
    setSelectedDay(1)
  }
  const goToday = () => {
    const t = new Date()
    setCurrentDate(new Date(t.getFullYear(), t.getMonth(), 1))
    setSelectedDay(t.getDate())
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#F7F7F8]">
      {/* Timeline Controls */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-900">{monthName}</h2>
          <button
            onClick={prevMonth}
            className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={nextMonth}
            className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
        <button
          onClick={goToday}
          className="px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Today
        </button>
      </div>

      {/* Timeline Grid */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        {/* Day Headers Row */}
        <div
          className="flex bg-white border-b border-gray-200 sticky top-0 z-20"
          style={{ minWidth: totalWidth }}
        >
          {/* Left label column */}
          <div className="w-[200px] shrink-0 border-r border-gray-100 bg-white sticky left-0 z-30" />

          {/* Day columns */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const today = isToday(year, month, day)
            return (
              <div
                key={i}
                className={cn(
                  'flex flex-col items-center justify-center py-2 cursor-pointer transition-colors border-r border-gray-100',
                  today ? 'bg-blue-50' : 'hover:bg-gray-50'
                )}
                style={{ width: COLUMN_WIDTH, minWidth: COLUMN_WIDTH }}
                onClick={() => setSelectedDay(day)}
              >
                <span className="text-[10px] font-medium text-gray-400 leading-tight">
                  {formatDayName(year, month, day)}
                </span>
                <span
                  className={cn(
                    'text-sm font-semibold leading-tight mt-0.5 w-7 h-7 flex items-center justify-center',
                    today ? 'bg-blue-500 text-white rounded-full' : 'text-gray-700'
                  )}
                >
                  {day}
                </span>
              </div>
            )
          })}
        </div>

        {/* Swimlane Rows */}
        <div className="relative" style={{ minWidth: totalWidth }}>
          {/* Today vertical indicator line */}
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-blue-500/60 z-10 pointer-events-none"
            style={{ left: (selectedDay - 1) * COLUMN_WIDTH + COLUMN_WIDTH / 2 }}
          />

          {swimlanes.map((swimlane, idx) => (
            <div
              key={idx}
              className={cn(
                'flex border-b border-gray-100',
                idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFB]'
              )}
              style={{ minHeight: 100 + SWIMLANE_GAP * 2 }}
            >
              {/* Label column */}
              <div
                className="w-[200px] shrink-0 border-r border-gray-100 p-3 flex flex-col justify-center sticky left-0 z-10"
                style={{ background: 'inherit' }}
              >
                <span className="text-xs font-semibold text-gray-700">{swimlane.label}</span>
                <span className="text-[11px] text-gray-400">{swimlane.tasks.length} tasks</span>
              </div>

              {/* Grid area */}
              <div className="relative flex-1" style={{ minHeight: 100 }}>
                {/* Vertical grid lines */}
                {Array.from({ length: daysInMonth }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 border-r border-gray-100"
                    style={{ left: i * COLUMN_WIDTH, width: COLUMN_WIDTH }}
                  />
                ))}

                {/* Task cards */}
                {swimlane.tasks.map((task) => {
                  const left = (task.startDay - 1) * COLUMN_WIDTH + 4
                  const width = task.duration * COLUMN_WIDTH - 8
                  return (
                    <div
                      key={task.id}
                      className={cn(
                        'absolute rounded-lg bg-white border border-gray-200 border-l-[4px] px-2.5 py-2 cursor-pointer hover:shadow-sm hover:border-gray-300 transition-all',
                        task.accentColor
                      )}
                      style={{
                        left,
                        width: Math.max(width, 120),
                        top: 8,
                        minHeight: 80,
                      }}
                    >
                      {/* Title */}
                      <h4 className="text-[13px] font-bold text-gray-900 truncate leading-snug mb-0.5">
                        {task.title}
                      </h4>

                      {/* Description */}
                      <p className="text-[11px] text-gray-500 truncate leading-normal mb-2">
                        {task.description}
                      </p>

                      {/* Footer */}
                      <div className="flex items-center justify-between">
                        {/* Avatar stack */}
                        <div className="flex items-center">
                          {task.assignees.slice(0, 3).map((a, i) => (
                            <div
                              key={i}
                              className={cn(
                                'w-4 h-4 rounded-full border border-white flex items-center justify-center text-[6px] font-bold text-white',
                                a.color
                              )}
                              style={{ marginLeft: i > 0 ? '-5px' : '0', zIndex: 10 - i }}
                            >
                              {a.initials}
                            </div>
                          ))}
                          {task.assignees.length > 3 && (
                            <div
                              className="w-4 h-4 rounded-full border border-white bg-gray-100 flex items-center justify-center text-[6px] font-medium text-gray-500"
                              style={{ marginLeft: '-5px' }}
                            >
                              +{task.assignees.length - 3}
                            </div>
                          )}
                        </div>

                        {/* Comment & attachment counts */}
                        <div className="flex items-center gap-2 text-gray-400">
                          <span className="flex items-center gap-0.5 text-[10px]">
                            <MessageSquare size={9} />
                            {task.comments}
                          </span>
                          <span className="flex items-center gap-0.5 text-[10px]">
                            <Paperclip size={9} />
                            {task.attachments}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
