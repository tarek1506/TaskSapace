import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Workspace, WorkspaceMember } from '@/types'

interface OutletCtx {
  workspace: Workspace
  member: WorkspaceMember
  isOwner: boolean
}

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function CalendarPage() {
  const { workspace } = useOutletContext<OutletCtx>()
  const [currentDate, setCurrentDate] = useState(new Date())

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

  const mockEvents: Record<number, { title: string; color: string }[]> = {
    5: [{ title: 'Mobile App Launch', color: '#8B5CF6' }],
    12: [{ title: 'API Review', color: '#3B82F6' }],
    18: [{ title: 'Marketing Sprint', color: '#F59E0B' }],
    25: [{ title: 'Design Handoff', color: '#EC4899' }],
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 bg-white">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
            <span>{workspace.name}</span>
            <span>/</span>
            <span className="text-gray-700 font-medium">Calendar</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your tasks and deadlines</p>
        </div>
      </div>

      {/* Calendar View */}
      <div className="flex-1 overflow-auto p-6 bg-[#F3F4F6]">
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
            <div key={day} className="text-xs font-medium text-gray-500 px-2 py-1.5">{day}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="grid grid-cols-7 gap-px bg-gray-100">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-gray-50 h-24" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dayDate = new Date(year, month, day)
              const dayEvents = mockEvents[day] || []
              const isToday = dayDate.getTime() === today.getTime()
              return (
                <div key={day} className={cn('bg-white min-h-24 p-1.5 cursor-pointer hover:bg-gray-50 transition-colors', isToday && 'bg-blue-50/50')}>
                  <span className={cn('text-sm font-medium', isToday ? 'text-blue-600' : 'text-gray-700')}>{day}</span>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.map((event, ei) => (
                      <div key={ei} className="text-[10px] font-medium px-1 py-0.5 rounded truncate" style={{ backgroundColor: `${event.color}20`, color: event.color }}>
                        {event.title}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
