import { useState, useEffect, useMemo } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn, parseIsoDate } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Workspace, WorkspaceMember, Task } from '@/types'

interface OutletCtx {
  workspace: Workspace
  member: WorkspaceMember
  isOwner: boolean
}

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const STATUS_BUBBLE_CLASSES: Record<string, string> = {
  todo: 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400',
  in_progress: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400',
  done: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400',
}

const STATUS_DOT: Record<string, string> = {
  todo: 'bg-blue-500',
  in_progress: 'bg-amber-500',
  done: 'bg-emerald-500',
}

const STATUS_LABEL: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
}

interface DayOverlayProps {
  day: number
  month: number
  year: number
  tasks: Task[]
  workspaceId: string
  onClose: () => void
}

function DayOverlay({ day, month, year, tasks, workspaceId, onClose }: DayOverlayProps) {
  const navigate = useNavigate()
  const date = new Date(year, month, day)
  const dateLabel = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Tasks for</div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">{dateLabel}</h2>
            <span className="inline-flex items-center gap-1.5 mt-1 text-xs font-medium text-gray-400 dark:text-gray-500">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 inline-block" />
              {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-3 py-3 space-y-1.5">
          {tasks.map(task => (
            <button
              key={task.id}
              onClick={() => { onClose(); navigate(`/workspace/${workspaceId}/tasks/${task.id}`) }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors group"
            >
              <span className={cn('w-2 h-2 rounded-full shrink-0', STATUS_DOT[task.status])} />
              <span className="flex-1 min-w-0">
                <span className={cn(
                  'block text-sm font-medium truncate',
                  task.status === 'done' ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'
                )}>{task.title}</span>
                <span className="flex items-center gap-2 mt-0.5">
                  <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', STATUS_BUBBLE_CLASSES[task.status])}>{STATUS_LABEL[task.status]}</span>
                  {task.project_label && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${task.project_color || '#8B5CF6'}18`, color: task.project_color || '#8B5CF6' }}>
                      {task.project_label}
                    </span>
                  )}
                </span>
              </span>
              <ChevronRight size={14} className="text-gray-300 dark:text-gray-600 group-hover:text-gray-400 transition-colors shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function CalendarPage() {
  const { workspace, member, isOwner } = useOutletContext<OutletCtx>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [overlayDay, setOverlayDay] = useState<number | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const goToday = () => setCurrentDate(new Date())

  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true)

      const { data: freshMember } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', workspace.id)
        .eq('user_id', user?.id || '')
        .single()

      const currentMember = freshMember || member
      const canViewAll = isOwner || currentMember.can_view_all_tasks

      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('workspace_id', workspace.id)
        .or('start_date.not.is.null,deadline.not.is.null')

      const allTasks = data || []
      setTasks(canViewAll ? allTasks : allTasks.filter(t => t.assigned_to?.includes(user?.id || '')))
      setLoading(false)
    }

    void fetchTasks()

    const channel = supabase
      .channel(`calendar-tasks:${workspace.id}:${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `workspace_id=eq.${workspace.id}` },
        () => { void fetchTasks() }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [workspace.id])

  // Build a map: day-of-month → tasks for the current month
  const tasksByDay = useMemo(() => {
    const map: Record<number, Task[]> = {}
    for (const task of tasks) {
      const taskDate = task.start_date || task.deadline
      if (!taskDate) continue
      const d = parseIsoDate(taskDate)
      if (!d) continue
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate()
        if (!map[day]) map[day] = []
        map[day].push(task)
      }
    }
    return map
  }, [tasks, year, month])

  const overlayTasks = overlayDay !== null ? (tasksByDay[overlayDay] || []) : []

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 mb-1">
            <span>{workspace.name}</span>
            <span>/</span>
            <span className="text-gray-700 dark:text-gray-300 font-medium">Calendar</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Calendar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Tasks with due dates appear here</p>
        </div>
      </div>

      {/* Calendar View */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 bg-[#F3F4F6] dark:bg-[#0f1117]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{monthName}</h2>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-700 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button onClick={goToday} className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors">
              Today
            </button>
            <button onClick={nextMonth} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-700 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-px mb-1">
          {weekDays.map(day => (
            <div key={day} className="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 px-1 sm:px-2 py-1.5">{day}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-px bg-gray-100 dark:bg-gray-700">
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-gray-50 dark:bg-gray-800 h-16 sm:h-28" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const dayDate = new Date(year, month, day)
                const dayTasks = tasksByDay[day] || []
                const isToday = dayDate.getTime() === today.getTime()
                return (
                  <div key={day} className={cn('bg-white dark:bg-gray-800 min-h-16 sm:min-h-28 p-1 sm:p-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors', isToday && 'bg-blue-50/50 dark:bg-blue-950/30')}>
                    <span className={cn(
                      'inline-flex items-center justify-center w-6 h-6 text-sm font-medium rounded-full',
                      isToday ? 'bg-violet-600 text-white' : 'text-gray-700 dark:text-gray-300'
                    )}>{day}</span>
                    <div className="mt-1 space-y-0.5">
                      {dayTasks.slice(0, 3).map((task) => (
                        <div
                          key={task.id}
                          onClick={() => navigate(`/workspace/${workspace.id}/tasks/${task.id}`)}
                          className={cn(
                            "text-[10px] font-semibold px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition-opacity",
                            STATUS_BUBBLE_CLASSES[task.status]
                          )}
                          title={task.title}
                        >
                          {task.title}
                        </div>
                      ))}
                      {dayTasks.length > 3 && (
                        <button
                          onClick={() => setOverlayDay(day)}
                          className="text-[10px] font-bold px-1.5 py-0.5 w-full text-left rounded-md bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors cursor-pointer"
                        >
                          +{dayTasks.length - 3} more
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {overlayDay !== null && (
        <DayOverlay
          day={overlayDay}
          month={month}
          year={year}
          tasks={overlayTasks}
          workspaceId={workspace.id}
          onClose={() => setOverlayDay(null)}
        />
      )}
    </div>
  )
}
