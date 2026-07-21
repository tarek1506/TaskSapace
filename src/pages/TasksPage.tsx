import { useState, useEffect, useMemo } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import {
  Plus, Search, LayoutGrid, LayoutList, Table,
  CheckCircle2, Calendar, GripVertical, Users, MessageCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { DashboardHeader, GradientButton } from '@/components/dashboard/DashboardWidgets'
import { Avatar } from '@/components/ui/Avatar'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/Select'
import { TaskModal } from '@/components/tasks/TaskModal'
import { ConfirmModal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'
import type { Workspace, WorkspaceMember, Task, TaskStatus, TaskPriority } from '@/types'

interface OutletCtx {
  workspace: Workspace
  member: WorkspaceMember
  isOwner: boolean
}

type ViewMode = 'board' | 'table' | 'list'

const TABS: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
  { id: 'board', label: 'Board', icon: <LayoutGrid size={14} /> },
  { id: 'table', label: 'Table', icon: <Table size={14} /> },
  { id: 'list', label: 'List', icon: <LayoutList size={14} /> },
]

const COLUMNS: { status: TaskStatus; label: string; dotColor: string }[] = [
  { status: 'todo', label: 'To Do', dotColor: 'bg-blue-500' },
  { status: 'in_progress', label: 'In Progress', dotColor: 'bg-amber-500' },
  { status: 'done', label: 'Done', dotColor: 'bg-emerald-500' },
]

const AVATAR_COLORS = ['bg-pink-400', 'bg-purple-400', 'bg-blue-400', 'bg-teal-400', 'bg-emerald-400', 'bg-indigo-400', 'bg-amber-400', 'bg-rose-400']

const PRIORITY_BADGE: Record<TaskPriority, { label: string; icon: string; color: string; bg: string } | null> = {
  high: { label: 'High', icon: '↑', color: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-950/50' },
  medium: { label: 'Medium', icon: '→', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/50' },
  low: { label: 'Low', icon: '↓', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/50' },
  none: null,
}

export function TasksPage() {
  const { workspace, member, isOwner } = useOutletContext<OutletCtx>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('board')
  const [search, setSearch] = useState('')
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [deletingTask, setDeletingTask] = useState<Task | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all')

  // Drag state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [dropBefore, setDropBefore] = useState(true)

  const canCreate = isOwner || member.can_create_task
  const canEdit = isOwner || member.can_edit_task

  const profileMap = useMemo(() => new Map(members.map(m => [m.user_id, m])), [members])

  useEffect(() => { fetchData() }, [workspace.id])

  const fetchData = async () => {
    setLoading(true)
    const [tasksRes, membersRes, freshMemberRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('workspace_id', workspace.id).order('order_index', { ascending: true }),
      supabase.from('workspace_members').select('*').eq('workspace_id', workspace.id),
      supabase.from('workspace_members').select('*').eq('workspace_id', workspace.id).eq('user_id', user?.id || '').single(),
    ])

    const freshMember = freshMemberRes.data || member

    let allTasks: Task[]
    if (tasksRes.error && tasksRes.error.message.includes('order_index')) {
      const fallback = await supabase.from('tasks').select('*').eq('workspace_id', workspace.id).order('created_at', { ascending: false })
      allTasks = fallback.data || []
    } else {
      allTasks = tasksRes.data || []
    }

    if (!isOwner && !freshMember.can_view_all_tasks) {
      allTasks = allTasks.filter(t => t.assigned_to?.includes(user?.id || ''))
    }

    // Fetch comment counts
    const taskIds = allTasks.map(t => t.id)
    const countMap: Record<string, number> = {}
    if (taskIds.length > 0) {
      const { data: commentRows } = await supabase
        .from('task_comments')
        .select('task_id')
        .in('task_id', taskIds)
      for (const row of commentRows || []) {
        countMap[row.task_id] = (countMap[row.task_id] || 0) + 1
      }
    }

    setTasks(allTasks.map(t => ({ ...t, comments_count: countMap[t.id] || 0 })))
    if (membersRes.data && membersRes.data.length > 0) {
      const uniqueUserIds = [...new Set(membersRes.data.map((m: any) => m.user_id))]
      const { data: profiles } = await supabase.from('profiles').select('id, email, full_name, avatar_url').in('id', uniqueUserIds)
      const pMap: Record<string, any> = {}
      for (const p of profiles || []) pMap[p.id] = p
      setMembers(membersRes.data.map((m: any) => {
        const p = pMap[m.user_id]
        return { ...m, user_email: p?.email || '', user_name: p?.full_name || p?.email?.split('@')[0] || 'User', user_avatar_url: p?.avatar_url || null }
      }))
    } else {
      setMembers([])
    }
    setLoading(false)
  }

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/x-task-id', taskId)
  }

  const handleCardDragOver = (e: React.DragEvent, taskId: string) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    const before = e.clientY < midY
    setDropTargetId(taskId)
    setDropBefore(before)
  }

  const handleColumnDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault() }

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault()
    const droppedTaskId = e.dataTransfer.getData('application/x-task-id') || draggedTaskId
    if (!droppedTaskId) { resetDrag(); return }

    const draggedTask = tasks.find(t => t.id === droppedTaskId)
    if (!draggedTask) { resetDrag(); return }

    const colTasks = tasks
      .filter(t => t.status === targetStatus && t.id !== droppedTaskId)
      .sort((a, b) => a.order_index - b.order_index)

    let insertIndex = colTasks.length
    if (dropTargetId && dropTargetId !== droppedTaskId) {
      const targetIdx = colTasks.findIndex(t => t.id === dropTargetId)
      if (targetIdx !== -1) insertIndex = dropBefore ? targetIdx : targetIdx + 1
    }

    const newOrder = colTasks.map((t, i) => ({ id: t.id, order_index: i >= insertIndex ? i + 1 : i }))
    newOrder.push({ id: droppedTaskId, order_index: insertIndex })

    const statusChanged = draggedTask.status !== targetStatus

    if (statusChanged) {
      const { error } = await supabase.from('tasks').update({ status: targetStatus }).eq('id', droppedTaskId)
      if (error) { console.error('Failed to update task status:', error); resetDrag(); return }
    }

    const orderUpdates = newOrder.map(({ id, order_index }) =>
      supabase.from('tasks').update({ order_index }).eq('id', id)
    )
    await Promise.allSettled(orderUpdates)

    setTasks(prev => {
      const updated = prev.map(t => {
        const ord = newOrder.find(o => o.id === t.id)
        if (!ord) return t
        return { ...t, order_index: ord.order_index, ...(t.id === droppedTaskId && statusChanged ? { status: targetStatus } : {}) }
      })
      return updated
    })
    resetDrag()
  }

  const handleDragEnd = () => resetDrag()

  const resetDrag = () => {
    setDraggedTaskId(null)
    setDropTargetId(null)
    setDropBefore(true)
  }

  const handleDelete = async () => {
    if (!deletingTask) return
    setDeleting(true)
    await supabase.from('tasks').delete().eq('id', deletingTask.id)
    setDeleting(false)
    setDeletingTask(null)
    fetchData()
  }

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
      if (assigneeFilter !== 'all' && !t.assigned_to?.includes(assigneeFilter)) return false
      return true
    })
  }, [tasks, search, assigneeFilter])

  const getColumnTasks = (status: TaskStatus) =>
    filteredTasks.filter(t => t.status === status).sort((a, b) => a.order_index - b.order_index)

  const getAssignees = (assigneeIds: string[]) =>
    assigneeIds.map((uid, i) => {
      const m = profileMap.get(uid)
      const name = m?.user_name || m?.user_email || 'U'
      return {
        user_id: uid,
        name,
        email: m?.user_email || '',
        avatar_url: m?.user_avatar_url || null,
        color: AVATAR_COLORS[i % AVATAR_COLORS.length],
      }
    })

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <DashboardHeader title={workspace.name} />

      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 sm:px-8 pb-8">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pt-10 md:pt-0">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-[28px] font-bold text-gray-900 dark:text-gray-100">Tasks</h2>
            <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{filteredTasks.length}</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 sm:flex-none">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks..."
                className="w-full sm:w-56 pl-9 pr-4 py-2 text-sm rounded-full bg-gray-100 dark:bg-gray-700 border-0 focus:outline-none focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-800 placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Assignee Filter */}
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="w-full sm:w-48 h-10 rounded-full bg-gray-100! dark:bg-gray-700! border-0! ring-0! outline-none! focus:ring-0! focus:outline-none! focus:bg-gray-100! text-sm shadow-none! [&>span]:line-clamp-1">
                <SelectValue placeholder="All members" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                      <Users size={10} className="text-gray-500 dark:text-gray-400" />
                    </div>
                    <span>All members</span>
                  </div>
                </SelectItem>
                {members.map(m => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    <div className="flex items-center gap-2">
                      <Avatar name={m.user_name || m.user_email} src={m.user_avatar_url} size="xs" />
                      <span>{m.user_name || m.user_email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* View Tabs */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-full p-0.5">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setViewMode(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-full transition-all',
                    viewMode === tab.id
                      ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  )}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {canCreate && <GradientButton onClick={() => { setEditingTask(null); setShowTaskModal(true) }} />}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
          </div>
        ) : viewMode === 'board' ? (
          <div className="flex gap-4 h-[calc(100%-64px)] overflow-x-auto pb-2">
            {COLUMNS.map(({ status, label, dotColor }) => {
              const colTasks = getColumnTasks(status)
              const isDragging = draggedTaskId !== null

              return (
                <div
                  key={status}
                  className="flex-1 min-w-[280px] sm:min-w-[300px] flex flex-col"
                  onDragOver={handleColumnDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, status)}
                >
                  {/* Column Header */}
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className={cn('w-2 h-2 rounded-full', dotColor)} />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</span>
                    <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{colTasks.length}</span>
                  </div>

                  {/* Column Body */}
                  <div className={cn(
                    "flex-1 rounded-2xl p-3 space-y-2 overflow-y-auto scrollbar-thin transition-colors",
                    isDragging ? 'bg-purple-50/50 dark:bg-purple-950/20 ring-1 ring-purple-200 dark:ring-purple-800' : 'bg-gray-100/80 dark:bg-gray-800'
                  )}>
                    {colTasks.map(task => {
                      const isBeingDragged = draggedTaskId === task.id
                      const showDropBefore = dropTargetId === task.id && dropBefore && !isBeingDragged
                      const showDropAfter = dropTargetId === task.id && !dropBefore && !isBeingDragged
                      const assignees = getAssignees(task.assigned_to || [])

                      return (
                        <div key={task.id}>
                          {showDropBefore && (
                            <div className="h-0.5 bg-purple-400 rounded-full mb-2 mx-1" />
                          )}
                          <div
                            draggable
                            onDragStart={(e) => handleDragStart(e, task.id)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => handleCardDragOver(e, task.id)}
                            onClick={() => navigate(`/workspace/${workspace.id}/tasks/${task.id}`)}
                            className={cn(
                              "bg-white dark:bg-gray-800 rounded-xl p-4 cursor-grab active:cursor-grabbing transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:border-gray-300 dark:hover:border-gray-600 border border-gray-200 dark:border-gray-700",
                              isBeingDragged && "opacity-40 scale-95"
                            )}
                          >
                          {/* Project Label */}
                          {(task.project_label || PRIORITY_BADGE[task.priority]) && (
                            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                              {task.project_label && (
                                <span
                                  className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                                  style={{
                                    backgroundColor: `${task.project_color || '#8B5CF6'}15`,
                                    color: task.project_color || '#8B5CF6',
                                  }}
                                >
                                  {task.project_label}
                                </span>
                              )}
                              {PRIORITY_BADGE[task.priority] && (
                                <span className={cn('inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full', PRIORITY_BADGE[task.priority]!.bg, PRIORITY_BADGE[task.priority]!.color)}>
                                  {PRIORITY_BADGE[task.priority]!.icon} {PRIORITY_BADGE[task.priority]!.label}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Title */}
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1 leading-snug">{task.title}</h3>

                          {/* Description */}
                          {task.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{task.description}</p>
                          )}

                          {/* Footer */}
                          <div className="flex items-center justify-between pt-2 mt-1 border-t border-gray-100 dark:border-gray-700">
                            <div className="flex items-center">
                              {assignees.slice(0, 3).map((a, i) => (
                                <Avatar
                                  key={a.user_id}
                                  email={a.email}
                                  name={a.name}
                                  src={a.avatar_url}
                                  size="xs"
                                  className={cn('ring-2 ring-white dark:ring-gray-800 cursor-pointer', i > 0 && '-ml-1')}
                                />
                              ))}
                              {assignees.length > 3 && (
                                <div className="w-5 h-5 rounded-full border-2 border-white dark:border-gray-800 bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[7px] font-medium text-gray-500 dark:text-gray-400 -ml-1">
                                  +{assignees.length - 3}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2.5">
                              {(task.comments_count ?? 0) > 0 && (
                                <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
                                  <MessageCircle size={10} />
                                  {task.comments_count}
                                </span>
                              )}
                              {task.due_date && (
                                <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
                                  <Calendar size={10} />
                                  {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </div>
                          </div>
                          </div>
                          {showDropAfter && (
                            <div className="h-0.5 bg-purple-400 rounded-full mt-2 mx-1" />
                          )}
                        </div>
                      )
                    })}

                    {colTasks.length === 0 && !isDragging && (
                      <div className="h-24 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl transition-colors">
                        <p className="text-xs text-gray-400 dark:text-gray-500">Drop tasks here</p>
                      </div>
                    )}

                    {canCreate && (
                      <button
                        onClick={() => { setEditingTask(null); setShowTaskModal(true) }}
                        className="w-full py-2.5 text-xs text-gray-400 dark:text-gray-500 hover:text-purple-600 hover:bg-white dark:hover:bg-gray-700 rounded-xl border border-dashed border-gray-200 dark:border-gray-600 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Plus size={12} /> Add task
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : viewMode === 'table' ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-gray-100 dark:border-gray-700">
                <tr className="text-left text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  <th className="px-5 py-3">Task</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Priority</th>
                  <th className="px-5 py-3">Assignees</th>
                  <th className="px-5 py-3">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {filteredTasks.map(task => {
                  const assignees = getAssignees(task.assigned_to || [])
                  const statusConf = COLUMNS.find(c => c.status === task.status)
                  return (
                    <tr
                      key={task.id}
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/workspace/${workspace.id}/tasks/${task.id}`)}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <GripVertical size={14} className="text-gray-300 dark:text-gray-600 cursor-grab" />
                          <div>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{task.title}</span>
                            {task.project_label && (
                              <span
                                className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                                style={{ backgroundColor: `${task.project_color || '#8B5CF6'}15`, color: task.project_color || '#8B5CF6' }}
                              >
                                {task.project_label}
                              </span>
                            )}
                          </div>
                          {(task.comments_count ?? 0) > 0 && (
                            <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500 ml-auto">
                              <MessageCircle size={10} />
                              {task.comments_count}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 text-xs font-medium",
                          task.status === 'done' && "text-emerald-600",
                          task.status === 'in_progress' && "text-amber-600",
                          task.status === 'todo' && "text-blue-600"
                        )}>
                          <div className={cn("w-1.5 h-1.5 rounded-full", statusConf?.dotColor)} />
                          {statusConf?.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {PRIORITY_BADGE[task.priority] ? (
                          <span className={cn('inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full', PRIORITY_BADGE[task.priority]!.bg, PRIORITY_BADGE[task.priority]!.color)}>
                            {PRIORITY_BADGE[task.priority]!.icon} {PRIORITY_BADGE[task.priority]!.label}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">–</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center">
                          {assignees.slice(0, 3).map((a, i) => (
                            <Avatar
                              key={a.user_id}
                              email={a.email}
                              name={a.name}
                              src={a.avatar_url}
                              size="xs"
                              className={cn('ring-2 ring-white dark:ring-gray-800 cursor-pointer', i > 0 && '-ml-1')}
                            />
                          ))}
                          {assignees.length > 3 && (
                            <div className="w-5 h-5 rounded-full border-2 border-white dark:border-gray-800 bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[7px] font-medium text-gray-500 dark:text-gray-400 -ml-1">
                              +{assignees.length - 3}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {task.due_date && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filteredTasks.length === 0 && (
              <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                <CheckCircle2 size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No tasks found</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden divide-y divide-gray-50 dark:divide-gray-700">
            {filteredTasks.map(task => {
              const assignees = getAssignees(task.assigned_to || [])
              const statusConf = COLUMNS.find(c => c.status === task.status)
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/workspace/${workspace.id}/tasks/${task.id}`)}
                >
                  <GripVertical size={14} className="text-gray-300 dark:text-gray-600 cursor-grab shrink-0" />
                  <div className={cn("w-2 h-2 rounded-full shrink-0", statusConf?.dotColor)} />
                  <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{task.title}</span>
                  {task.project_label && (
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0"
                      style={{ backgroundColor: `${task.project_color || '#8B5CF6'}15`, color: task.project_color || '#8B5CF6' }}
                    >
                      {task.project_label}
                    </span>
                  )}
                  {PRIORITY_BADGE[task.priority] && (
                    <span className={cn('inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0', PRIORITY_BADGE[task.priority]!.bg, PRIORITY_BADGE[task.priority]!.color)}>
                      {PRIORITY_BADGE[task.priority]!.icon} {PRIORITY_BADGE[task.priority]!.label}
                    </span>
                  )}
                  {(task.comments_count ?? 0) > 0 && (
                    <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500 shrink-0">
                      <MessageCircle size={10} />
                      {task.comments_count}
                    </span>
                  )}
                  <div className="flex items-center shrink-0">
                    {assignees.slice(0, 2).map((a, i) => (
                      <Avatar
                        key={a.user_id}
                        email={a.email}
                        name={a.name}
                        src={a.avatar_url}
                        size="xs"
                        className={cn('ring-2 ring-white dark:ring-gray-800 cursor-pointer', i > 0 && '-ml-1')}
                      />
                    ))}
                  </div>
                  {task.due_date && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 w-16 text-right shrink-0">
                      {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              )
            })}
            {filteredTasks.length === 0 && (
              <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                <CheckCircle2 size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No tasks found</p>
              </div>
            )}
          </div>
        )}
      </div>

      <TaskModal
        open={showTaskModal}
        onClose={() => { setShowTaskModal(false); setEditingTask(null) }}
        workspaceId={workspace.id}
        task={editingTask}
        members={members}
        canEdit={canEdit || canCreate}
        onSaved={() => { setShowTaskModal(false); setEditingTask(null); fetchData() }}
      />
      <ConfirmModal
        open={!!deletingTask}
        onClose={() => setDeletingTask(null)}
        onConfirm={handleDelete}
        title="Delete Task"
        description={`Are you sure you want to delete "${deletingTask?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
      />
    </div>
  )
}
