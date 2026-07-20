import { useState, useEffect, useMemo } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Workspace, WorkspaceMember, Task } from '@/types'

interface OutletCtx {
  workspace: Workspace
  member: WorkspaceMember
  isOwner: boolean
}

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const STATUS_COLORS: Record<string, string> = {
  todo: '#3B82F6',
  in_progress: '#F59E0B',
  done: '#10B981',
}

export function CalendarPage() {
  const { workspace, member, isOwner } = useOutletContext<OutletCtx>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

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
        .not('due_date', 'is', null)

      const allTasks = data || []
      setTasks(canViewAll ? allTasks : allTasks.filter(t => t.assigned_to?.includes(user?.id || '')))
      setLoading(false)
    }
    fetchTasks()
  }, [workspace.id])

  // Build a map: day-of-month → tasks for the current month
  const tasksByDay = useMemo(() => {
    const map: Record<number, Task[]> = {}
    for (const task of tasks) {
      if (!task.due_date) continue
      const d = new Date(task.due_date)
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate()
        if (!map[day]) map[day] = []
        map[day].push(task)
      }
    }
    return map
  }, [tasks, year, month])

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5 bg-white border-b border-gray-100">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
            <span>{workspace.name}</span>
            <span>/</span>
            <span className="text-gray-700 font-medium">Calendar</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-sm text-gray-500 mt-0.5">Tasks with due dates appear here</p>
        </div>
      </div>

      {/* Calendar View */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 bg-[#F3F4F6]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{monthName}</h2>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-white transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button onClick={goToday} className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-colors">
              Today
            </button>
            <button onClick={nextMonth} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-white transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-px mb-1">
          {weekDays.map(day => (
            <div key={day} className="text-[10px] sm:text-xs font-medium text-gray-500 px-1 sm:px-2 py-1.5">{day}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-px bg-gray-100">
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-gray-50 h-16 sm:h-28" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const dayDate = new Date(year, month, day)
                const dayTasks = tasksByDay[day] || []
                const isToday = dayDate.getTime() === today.getTime()
                return (
                  <div key={day} className={cn('bg-white min-h-16 sm:min-h-28 p-1 sm:p-1.5 hover:bg-gray-50 transition-colors', isToday && 'bg-blue-50/50')}>
                    <span className={cn(
                      'inline-flex items-center justify-center w-6 h-6 text-sm font-medium rounded-full',
                      isToday ? 'bg-violet-600 text-white' : 'text-gray-700'
                    )}>{day}</span>
                    <div className="mt-1 space-y-0.5">
                      {dayTasks.slice(0, 3).map((task) => (
                        <div
                          key={task.id}
                          onClick={() => navigate(`/workspace/${workspace.id}/tasks/${task.id}`)}
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition-opacity"
                          style={{
                            backgroundColor: `${STATUS_COLORS[task.status]}20`,
                            color: STATUS_COLORS[task.status],
                          }}
                          title={task.title}
                        >
                          {task.title}
                        </div>
                      ))}
                      {dayTasks.length > 3 && (
                        <div className="text-[10px] text-gray-400 px-1">+{dayTasks.length - 3} more</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
