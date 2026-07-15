import { useState, useEffect } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import {
  Plus, Search, Filter, LayoutGrid, List, Trash2, Pencil,
  CheckCircle2, Clock, Circle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { TopHeader } from '@/components/layout/Sidebar'
import { TaskRow } from '@/components/tasks/TaskRow'
import { TaskModal } from '@/components/tasks/TaskModal'
import { ConfirmModal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import type { Workspace, WorkspaceMember, Task, TaskStatus, ViewMode } from '@/types'

interface OutletCtx {
  workspace: Workspace
  member: WorkspaceMember
  isOwner: boolean
}

const STATUS_GROUPS: { status: TaskStatus; label: string; icon: React.ReactNode; color: string }[] = [
  {
    status: 'todo',
    label: 'To Do',
    icon: <Circle size={14} />,
    color: 'text-gray-500',
  },
  {
    status: 'in_progress',
    label: 'In Progress',
    icon: <Clock size={14} />,
    color: 'text-amber-500',
  },
  {
    status: 'done',
    label: 'Done',
    icon: <CheckCircle2 size={14} />,
    color: 'text-emerald-500',
  },
]

export function TasksPage() {
  const { workspace, member, isOwner } = useOutletContext<OutletCtx>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [deletingTask, setDeletingTask] = useState<Task | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { fetchData() }, [workspace.id])

  const fetchData = async () => {
    setLoading(true)
    const [tasksRes, membersRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('*')
        .eq('workspace_id', workspace.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('workspace_members')
        .select(`
          *,
          profiles:user_id (
            email,
            full_name
          )
        `)
        .eq('workspace_id', workspace.id),
    ])
    setTasks(tasksRes.data || [])
    if (membersRes.data) {
      setMembers(
        membersRes.data.map((m: any) => ({
          ...m,
          user_email: m.profiles?.email || '',
          user_name: m.profiles?.full_name || m.profiles?.email?.split('@')[0] || 'User',
        }))
      )
    } else {
      setMembers([])
    }
    setLoading(false)
  }

  const handleStatusChange = async (task: Task, done: boolean) => {
    await supabase
      .from('tasks')
      .update({ status: done ? 'done' : 'todo' })
      .eq('id', task.id)
    fetchData()
  }

  const handleDelete = async () => {
    if (!deletingTask) return
    setDeleting(true)
    await supabase.from('tasks').delete().eq('id', deletingTask.id)
    setDeleting(false)
    setDeletingTask(null)
    fetchData()
  }

  const canCreate = isOwner || member.can_create_task
  const canDelete = isOwner || member.can_delete_task
  const canEdit = isOwner || member.can_edit_task

  const filteredTasks = tasks.filter((t) => {
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || t.status === statusFilter
    return matchSearch && matchStatus
  })

  // Kanban column tasks
  const getColumnTasks = (status: TaskStatus) =>
    filteredTasks.filter((t) => t.status === status)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopHeader
        title="Tasks"
        subtitle={`${tasks.length} total tasks`}
        actions={
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center bg-gray-100 rounded-full p-1">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-1.5 rounded-full transition-colors',
                  viewMode === 'list' ? 'bg-white shadow-sm text-violet-600' : 'text-gray-400 hover:text-gray-600'
                )}
                id="btn-list-view"
                title="List view"
              >
                <List size={14} />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={cn(
                  'p-1.5 rounded-full transition-colors',
                  viewMode === 'kanban' ? 'bg-white shadow-sm text-violet-600' : 'text-gray-400 hover:text-gray-600'
                )}
                id="btn-kanban-view"
                title="Kanban view"
              >
                <LayoutGrid size={14} />
              </button>
            </div>
            {canCreate && (
              <Button
                variant="primary"
                size="md"
                onClick={() => { setEditingTask(null); setShowTaskModal(true) }}
                id="btn-new-task"
              >
                <Plus size={15} /> New Task
              </Button>
            )}
          </div>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100 bg-white/50">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="w-full pl-9 pr-4 py-2 text-sm rounded-full bg-gray-100 border-0 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:bg-white transition-all"
            id="search-tasks"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter size={13} className="text-gray-400" />
          {(['all', 'todo', 'in_progress', 'done'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'text-xs px-3 py-1.5 rounded-full font-medium transition-all',
                statusFilter === s
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
              id={`filter-${s}`}
            >
              {s === 'all' ? 'All' : s === 'in_progress' ? 'In Progress' : s === 'todo' ? 'To Do' : 'Done'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto scrollbar-thin p-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-7 h-7 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          </div>
        ) : viewMode === 'list' ? (
          // List view
          <div className="space-y-6">
            {STATUS_GROUPS.map(({ status, label, icon, color }) => {
              const groupTasks = filteredTasks.filter((t) => t.status === status)
              if (statusFilter !== 'all' && statusFilter !== status) return null
              return (
                <div key={status}>
                  <div className={`flex items-center gap-2 mb-3 ${color}`}>
                    {icon}
                    <span className="text-sm font-semibold">{label}</span>
                    <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
                      {groupTasks.length}
                    </span>
                  </div>
                  <Card>
                    <CardContent className="p-2">
                      {groupTasks.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-5">
                          No {label.toLowerCase()} tasks
                        </p>
                      ) : (
                        <div className="space-y-0.5">
                          {groupTasks.map((task) => (
                            <div key={task.id} className="group relative">
                              <TaskRow
                                task={task}
                                onClick={() => navigate(`/workspace/${workspace.id}/tasks/${task.id}`)}
                                onStatusChange={handleStatusChange}
                              />
                              {/* Action buttons on hover */}
                              <div className="absolute right-14 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1">
                                {canEdit && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setEditingTask(task)
                                      setShowTaskModal(true)
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                                    id={`edit-task-${task.id}`}
                                  >
                                    <Pencil size={13} />
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setDeletingTask(task)
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    id={`delete-task-${task.id}`}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )
            })}
          </div>
        ) : (
          // Kanban view
          <div className="flex gap-4 h-full">
            {STATUS_GROUPS.map(({ status, label, icon, color }) => {
              const colTasks = getColumnTasks(status)
              return (
                <div key={status} className="flex-1 min-w-[240px] flex flex-col">
                  <div className={`flex items-center gap-2 mb-3 ${color}`}>
                    {icon}
                    <span className="text-sm font-semibold">{label}</span>
                    <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 ml-auto">
                      {colTasks.length}
                    </span>
                  </div>
                  <div className="flex-1 bg-gray-50/80 rounded-2xl p-2 space-y-2 overflow-y-auto scrollbar-thin">
                    {colTasks.map((task) => (
                      <Card
                        key={task.id}
                        className="p-3 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                        onClick={() => navigate(`/workspace/${workspace.id}/tasks/${task.id}`)}
                        id={`kanban-card-${task.id}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm font-medium text-gray-800 leading-snug">{task.title}</p>
                          {(canEdit || canDelete) && (
                            <div className="flex gap-1 flex-shrink-0">
                              {canEdit && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setEditingTask(task)
                                    setShowTaskModal(true)
                                  }}
                                  className="p-1 text-gray-300 hover:text-violet-500 transition-colors"
                                >
                                  <Pencil size={12} />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setDeletingTask(task)
                                  }}
                                  className="p-1 text-gray-300 hover:text-red-400 transition-colors"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        {task.project_label && task.project_color && (
                          <div className="mb-2">
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{
                                backgroundColor: `${task.project_color}20`,
                                color: task.project_color,
                              }}
                            >
                              {task.project_label}
                            </span>
                          </div>
                        )}
                        {task.due_date && (
                          <p className="text-xs text-gray-400 mt-1">
                            Due: {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        )}
                      </Card>
                    ))}
                    {canCreate && (
                      <button
                        onClick={() => { setEditingTask(null); setShowTaskModal(true) }}
                        className="w-full py-2.5 text-xs text-gray-400 hover:text-violet-600 hover:bg-white rounded-xl transition-colors flex items-center justify-center gap-1.5"
                        id={`kanban-add-${status}`}
                      >
                        <Plus size={13} /> Add task
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
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
        onSaved={fetchData}
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
