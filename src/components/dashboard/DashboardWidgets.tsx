import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Search, Plus, Bell, Check,
  Calendar, ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/contexts/NotificationContext'
import { Avatar } from '@/components/ui/Avatar'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { Task, WorkspaceMember, TaskPriority, AppNotification } from '@/types'

// ─── Dashboard Header ─────────────────────────────────────────────────────────

interface DashboardHeaderProps {
  title: string
}

export function DashboardHeader({ title }: DashboardHeaderProps) {
  const { user, profile, signOut } = useAuth()
  const { notifications, unreadCount, markAllAsRead } = useNotifications()
  const navigate = useNavigate()
  const { id: workspaceId } = useParams<{ id: string }>()

  const [showNotifDropdown, setShowNotifDropdown] = useState(false)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)

  const getNotificationMessage = (notif: AppNotification) => {
    const actor = notif.user_name || notif.user_email?.split('@')[0] || 'Someone'
    const taskTitle = notif.details.task_title || 'a task'
    switch (notif.action_type) {
      case 'task_created':
        return <span><strong className="text-gray-900">{actor}</strong> created &ldquo;{taskTitle}&rdquo;</span>
      case 'task_updated':
        if (notif.details.status_changed) {
          const statusMap: Record<string, string> = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' }
          return <span><strong className="text-gray-900">{actor}</strong> moved &ldquo;{taskTitle}&rdquo; to <span className="text-violet-600">{statusMap[notif.details.new_status || 'todo']}</span></span>
        }
        return <span><strong className="text-gray-900">{actor}</strong> updated &ldquo;{taskTitle}&rdquo;</span>
      case 'comment_added':
        return <span><strong className="text-gray-900">{actor}</strong> commented on &ldquo;{taskTitle}&rdquo;</span>
      default:
        return <span>New activity</span>
    }
  }

  return (
    <div className="flex items-center justify-between px-8 py-5">
      <h1 className="text-[28px] font-bold text-gray-900 leading-tight">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search..."
            className="w-56 pl-4 pr-9 py-2 text-sm rounded-full bg-gray-100 border-0 focus:outline-none focus:ring-2 focus:ring-purple-200 placeholder-gray-400"
          />
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifDropdown(!showNotifDropdown)
              if (!showNotifDropdown && unreadCount > 0) markAllAsRead()
            }}
            className={cn(
              'relative w-10 h-10 rounded-full flex items-center justify-center transition-colors',
              showNotifDropdown ? 'bg-violet-50 text-violet-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            )}
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white" />
            )}
          </button>
          {showNotifDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifDropdown(false)} />
              <div className="absolute right-0 mt-2 w-80 max-h-[400px] overflow-hidden bg-white rounded-xl border border-gray-200 shadow-lg z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <span className="text-sm font-semibold text-gray-900">Notifications</span>
                </div>
                <div className="overflow-y-auto max-h-[340px]">
                  {notifications.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <Bell size={20} className="mx-auto mb-2 opacity-30" />
                      <p className="text-xs">No notifications</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {notifications.map((notif) => (
                        <div key={notif.id} className="px-4 py-3 hover:bg-gray-50 text-xs">
                          <p className="text-gray-600">{getNotificationMessage(notif)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Profile Avatar */}
        <div className="relative">
          <button
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <div className="relative">
              <Avatar
                email={user?.email || ''}
                name={profile?.full_name || user?.email || ''}
                src={profile?.avatar_url}
                size="sm"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white" />
            </div>
            <ChevronDown size={12} className="text-gray-400" />
          </button>
          {showProfileDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowProfileDropdown(false)} />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
                <button
                  onClick={() => { navigate(`/workspace/${workspaceId}/profile`); setShowProfileDropdown(false) }}
                  className="w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Profile
                </button>
                <button
                  onClick={() => { setShowProfileDropdown(false); signOut() }}
                  className="w-full px-4 py-2.5 text-sm text-left text-red-600 hover:bg-red-50 transition-colors"
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── CTA Button ───────────────────────────────────────────────────────────────

export function GradientButton({ onClick }: { onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-[0_4px_16px_rgba(139,92,246,0.3)] transition-all">
      <Plus size={16} />
      <span>New Task</span>
    </button>
  )
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

const TAG_STYLES: Record<string, { color: string; bg: string }> = {
  Design: { color: 'text-pink-600', bg: 'bg-pink-50' },
  Marketing: { color: 'text-amber-600', bg: 'bg-amber-50' },
  Engineering: { color: 'text-purple-600', bg: 'bg-purple-50' },
  Research: { color: 'text-blue-600', bg: 'bg-blue-50' },
  Planning: { color: 'text-teal-600', bg: 'bg-teal-50' },
  Frontend: { color: 'text-indigo-600', bg: 'bg-indigo-50' },
  Backend: { color: 'text-emerald-600', bg: 'bg-emerald-50' },
}

const AVATAR_COLORS = ['bg-pink-400', 'bg-purple-400', 'bg-blue-400', 'bg-teal-400', 'bg-emerald-400', 'bg-indigo-400', 'bg-amber-400', 'bg-rose-400']

const PRIORITY_BADGE: Record<TaskPriority, { label: string; icon: string; color: string; bg: string } | null> = {
  high: { label: 'High', icon: '↑', color: 'text-pink-600', bg: 'bg-pink-50' },
  medium: { label: 'Medium', icon: '→', color: 'text-amber-600', bg: 'bg-amber-50' },
  low: { label: 'Low', icon: '↓', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  none: null,
}

function getAvatarColor(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length]
}

export function TaskList({ tasks, members, onToggle }: { tasks: Task[]; members: WorkspaceMember[]; onToggle?: (taskId: string, newStatus: 'done' | 'todo') => void }) {
  const profileMap = new Map(members.map(m => [m.user_id, m]))

  return (
    <div className="space-y-0">
      {tasks.map((task, idx) => {
        const done = task.status === 'done'
        const tag = task.project_label || 'General'
        const tagStyle = task.project_color
          ? null
          : TAG_STYLES[tag] || { color: 'text-gray-600', bg: 'bg-gray-50' }
        const assignees = (task.assigned_to || []).map((uid, i) => {
          const m = profileMap.get(uid)
          const name = m?.user_name || m?.user_email || 'U'
          return { initials: name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2), color: getAvatarColor(i) }
        })

        return (
          <div
            key={task.id}
            className={cn(
              'flex items-center gap-3 px-4 py-3 border-b border-gray-100 transition-all',
              idx === 0 && 'bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] rounded-xl border border-gray-200 -mx-1',
              idx !== 0 && 'hover:bg-gray-50'
            )}
          >
            <button
              onClick={() => onToggle?.(task.id, done ? 'todo' : 'done')}
              className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                done
                  ? 'bg-purple-500 border-purple-500'
                  : 'border-gray-300 hover:border-purple-400'
              )}
            >
              {done && <Check size={10} className="text-white" />}
            </button>

            <span className={cn(
              'flex-1 text-sm font-medium',
              done ? 'text-gray-400 line-through' : 'text-gray-800'
            )}>
              {task.title}
            </span>

            {PRIORITY_BADGE[task.priority] && (
              <span className={cn('inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full', PRIORITY_BADGE[task.priority]!.bg, PRIORITY_BADGE[task.priority]!.color)}>
                {PRIORITY_BADGE[task.priority]!.icon} {PRIORITY_BADGE[task.priority]!.label}
              </span>
            )}

            <div className="flex items-center">
              {assignees.slice(0, 2).map((a, i) => (
                <div
                  key={i}
                  className={cn('w-5 h-5 rounded-full border border-white flex items-center justify-center text-[7px] font-bold text-white', a.color)}
                  style={{ marginLeft: i > 0 ? '-4px' : '0', zIndex: 10 - i }}
                >
                  {a.initials}
                </div>
              ))}
              {assignees.length > 2 && (
                <div className="w-5 h-5 rounded-full border border-white bg-gray-100 flex items-center justify-center text-[7px] font-medium text-gray-500" style={{ marginLeft: '-4px' }}>
                  +{assignees.length - 2}
                </div>
              )}
            </div>

            {task.project_color ? (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${task.project_color}20`, color: task.project_color }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
                {task.project_label}
              </span>
            ) : (
              <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full', tagStyle!.bg, tagStyle!.color)}>
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
                {tag}
              </span>
            )}
          </div>
        )
      })}

      {tasks.length === 0 && (
        <div className="py-10 text-center text-sm text-gray-400">No tasks yet</div>
      )}
    </div>
  )
}

// ─── Project Cards ────────────────────────────────────────────────────────────

interface ProjectCard {
  id: string
  title: string
  iconBg: string
  icon: string
  assignees: { initials: string; color: string }[]
  progress: number
  progressColor: string
}

const PROJECT_CARDS: ProjectCard[] = [
  { id: 'p1', title: 'Mobile App', iconBg: 'bg-teal-100', icon: '📱', assignees: [{ initials: 'AL', color: 'bg-pink-400' }, { initials: 'SK', color: 'bg-purple-400' }], progress: 72, progressColor: 'bg-teal-500' },
  { id: 'p2', title: 'Backend API', iconBg: 'bg-red-100', icon: '🔧', assignees: [{ initials: 'JP', color: 'bg-blue-400' }, { initials: 'ML', color: 'bg-indigo-400' }], progress: 45, progressColor: 'bg-red-500' },
  { id: 'p3', title: 'Design System', iconBg: 'bg-purple-100', icon: '🎨', assignees: [{ initials: 'AL', color: 'bg-pink-400' }, { initials: 'EW', color: 'bg-emerald-400' }], progress: 88, progressColor: 'bg-purple-500' },
  { id: 'p4', title: 'Marketing Site', iconBg: 'bg-blue-100', icon: '🚀', assignees: [{ initials: 'LW', color: 'bg-teal-400' }], progress: 33, progressColor: 'bg-blue-500' },
]

export function ProjectCards() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {PROJECT_CARDS.map(card => (
        <div key={card.id} className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-shadow cursor-pointer">
          <div className="flex items-start justify-between mb-4">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-lg', card.iconBg)}>
              {card.icon}
            </div>
          </div>
          <h3 className="text-sm font-bold text-gray-900 mb-3">{card.title}</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-gray-400 mb-1">Assignee</p>
              <div className="flex items-center">
                {card.assignees.slice(0, 3).map((a, i) => (
                  <div
                    key={i}
                    className={cn('w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold text-white', a.color)}
                    style={{ marginLeft: i > 0 ? '-6px' : '0', zIndex: 10 - i }}
                  >
                    {a.initials}
                  </div>
                ))}
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-gray-400 mb-1">Progress</p>
              <p className="text-xs font-bold text-gray-700">{card.progress}%</p>
              <div className="w-16 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                <div className={cn('h-full rounded-full', card.progressColor)} style={{ width: `${card.progress}%` }} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Gantt / Mini Timeline ────────────────────────────────────────────────────

interface GanttBar {
  id: string
  label: string
  initials: string
  avatarColor: string
  startCol: number
  span: number
  accentColor: string
  accentBg: string
  featured?: boolean
}

const GANTT_BARS: GanttBar[] = [
  { id: 'g1', label: 'Mobile App Design', initials: 'AL', avatarColor: 'bg-pink-400', startCol: 0, span: 3, accentColor: 'border-l-teal-500', accentBg: 'bg-white', featured: true },
  { id: 'g2', label: 'API Integration', initials: 'JP', avatarColor: 'bg-blue-400', startCol: 1, span: 4, accentColor: 'border-l-orange-500', accentBg: 'bg-white' },
  { id: 'g3', label: 'User Testing', initials: 'SK', avatarColor: 'bg-purple-400', startCol: 2, span: 2, accentColor: 'border-l-purple-500', accentBg: 'bg-white' },
  { id: 'g4', label: 'Marketing Campaign', initials: 'LW', avatarColor: 'bg-teal-400', startCol: 3, span: 3, accentColor: 'border-l-rose-500', accentBg: 'bg-white' },
]

const GANTT_DAYS = ['May 9', 'May 10', 'May 11', 'May 12', 'May 13', 'May 14', 'May 15']
const NOW_COL = 1

export function GanttMini() {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-gray-400" />
          <span className="text-sm font-bold text-gray-900">Timeline</span>
        </div>
        <span className="text-[11px] text-gray-400">{GANTT_DAYS.length} days</span>
      </div>

      {/* Date Headers */}
      <div className="flex items-end mb-3 relative">
        <div className="w-24 shrink-0" />
        <div className="flex-1 flex relative">
          {GANTT_DAYS.map((day, i) => (
            <div key={i} className="flex-1 text-center">
              <span className="text-[10px] text-gray-400 font-medium">{day}</span>
            </div>
          ))}
          {/* Red "now" marker */}
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-red-400 z-10"
            style={{ left: `${(NOW_COL / GANTT_DAYS.length) * 100}%` }}
          />
          {/* Red pill */}
          <div
            className="absolute -top-2 -translate-x-1/2 z-20"
            style={{ left: `${((NOW_COL + 0.5) / GANTT_DAYS.length) * 100}%` }}
          >
            <span className="text-[9px] font-bold text-white bg-red-400 px-1.5 py-0.5 rounded-full">12 AM</span>
          </div>
        </div>
      </div>

      {/* Bars */}
      <div className="space-y-2">
        {GANTT_BARS.map(bar => (
          <div key={bar.id} className="flex items-center">
            <div className="w-24 shrink-0 pr-2">
              <div className="flex items-center gap-1.5">
                <div className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold text-white', bar.avatarColor)}>
                  {bar.initials}
                </div>
                <span className="text-[11px] text-gray-500 truncate">{bar.label}</span>
              </div>
            </div>
            <div className="flex-1 relative h-7">
              {/* Grid lines */}
              {GANTT_DAYS.map((_, i) => (
                <div key={i} className="absolute top-0 bottom-0 border-l border-gray-100" style={{ left: `${(i / GANTT_DAYS.length) * 100}%` }} />
              ))}
              {/* Bar */}
              <div
                className={cn(
                  'absolute top-1 h-5 rounded-full border-l-[3px] flex items-center px-2 shadow-sm',
                  bar.accentColor,
                  bar.featured ? 'bg-gradient-to-r from-purple-400 to-pink-400 text-white' : 'bg-white border border-gray-200 text-gray-600'
                )}
                style={{
                  left: `${(bar.startCol / GANTT_DAYS.length) * 100}%`,
                  width: `${(bar.span / GANTT_DAYS.length) * 100}%`,
                }}
              >
                <span className="text-[9px] font-medium truncate">{bar.label}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Time Management Widget ───────────────────────────────────────────────────

const CHART_DATA = [
  { day: 'Mon', hours: 6.5 },
  { day: 'Tue', hours: 7.2 },
  { day: 'Wed', hours: 5.8 },
  { day: 'Thu', hours: 7.8 },
  { day: 'Fri', hours: 7.5 },
]

export function TimeWidget() {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-bold text-gray-900">Time Tracking</span>
        <span className="text-[11px] text-gray-400">This week</span>
      </div>

      <div className="flex items-end gap-2 mb-4">
        <span className="text-3xl font-extrabold text-gray-900 tracking-tight">7h 28m</span>
        <span className="text-xs font-semibold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-full mb-1">+27m</span>
      </div>

      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={CHART_DATA} margin={{ top: 5, right: 0, left: -30, bottom: 0 }}>
            <defs>
              <linearGradient id="timeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: '10px',
                fontSize: 12,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
            />
            <Area
              type="monotone"
              dataKey="hours"
              stroke="#3B82F6"
              strokeWidth={2}
              fill="url(#timeGrad)"
              dot={{ r: 3, fill: '#3B82F6', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#3B82F6', stroke: 'white', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
