import { useState, useEffect, useRef } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, LayoutGrid, List, Trash2, Pencil, CheckCircle2, Clock, Circle, GripVertical } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { TopHeader } from '@/components/layout/Sidebar'
import { TaskRow } from '@/components/tasks/TaskRow'
import { TaskModal } from '@/components/tasks/TaskModal'
import { ConfirmModal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import type { Workspace, WorkspaceMember, Task, TaskStatus, ViewMode } from '@/types'

interface OutletCtx {
  workspace: Workspace
  member: WorkspaceMember
  isOwner: boolean
}

const STATUS_GROUPS: { status: TaskStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { status: 'todo', label: 'To Do', icon: <Circle size={14} />, color: 'text-gray-500' },
  { status: 'in_progress', label: 'In Progress', icon: <Clock size={14} />, color: 'text-amber-500' },
  { status: 'done', label: 'Done', icon: <CheckCircle2 size={14} />, color: 'text-emerald-500' },
]

export function TasksPage() {
  const { workspace, member, isOwner } = useOutletContext<OutletCtx>()
  const navigate = useNavigate()

  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [deletingTask, setDeletingTask] = useState<Task | null>(null)
  const [deleting, setDeleting] = useState(false)
  
  // Drag state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [dropTargetStatus, setDropTargetStatus] = useState<TaskStatus | null>(null)

  useEffect(() => { void fetchData() }, [workspace.id])

  const fetchData = async () => {
    setLoading(true)
    const [tasksRes, membersRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('workspace_id', workspace.id).order('created_at', { ascending: false }),
      supabase.from('workspace_members').select('*').eq('workspace_id', workspace.id),
    ])
    setTasks(tasksRes.data || [])
    if (membersRes.data && membersRes.data.length > 0) {
      const uniqueUserIds = [...new Set(membersRes.data.map((m: any) => m.user_id))]
      const { data: profiles } = await supabase.from('profiles').select('id, email, full_name').in('id', uniqueUserIds)
      const profileMap: Record<string, any> = {}
      for (const p of profiles || []) profileMap[p.id] = p
      setMembers(membersRes.data.map((m: any) => {
        const p = profileMap[m.user_id]
        return { ...m, user_email: p?.email || '', user_name: p?.full_name || p?.email?.split('@')[0] || 'User' }
      }))
    } else {
      setMembers([])
    }
    setLoading(false)
  }

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', taskId)
  }

  const handleDragOver = (e: React.DragEvent, taskId: string | null, status: TaskStatus) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setDropTargetId(taskId)
    setDropTargetStatus(status)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, targetTaskId: string | null, targetStatus: TaskStatus) => {
    e.preventDefault()
    e.stopPropagation()

    if (!draggedTaskId) {
      setDraggedTaskId(null)
      setDropTargetId(null)
      setDropTargetStatus(null)
      return
    }

    const draggedTask = tasks.find(t => t.id === draggedTaskId)
    if (!draggedTask) {
      setDraggedTaskId(null)
      setDropTargetId(null)
      setDropTargetStatus(null)
      return
    }

    // Calculate new order
    setTasks(prev => {
      const taskList = [...prev]
      const draggedIndex = taskList.findIndex(t => t.id === draggedTaskId)
      const draggedItem = taskList.splice(draggedIndex, 1)[0]
      
      // Update status if moving to different column
      draggedItem.status = targetStatus

      if (targetTaskId) {
        // Dropped on another task
        const targetIndex = taskList.findIndex(t => t.id === targetTaskId)
        if (targetIndex !== -1) {
          // Insert before the target
          taskList.splice(targetIndex, 0, draggedItem)
        } else {
          // Append to end
          taskList.push(draggedItem)
        }
      } else {
        // Dropped on column empty area - append to that status
        const sameStatusTasks = taskList.filter(t => t.status === targetStatus)
        const otherTasks = taskList.filter(t => t.status !== targetStatus)
        sameStatusTasks.push(draggedItem)
        return [...otherTasks, ...sameStatusTasks]
      }

      return taskList
    })

    // Update database if status changed
    if (draggedTask.status !== targetStatus) {
      await supabase.from('tasks').update({ status: targetStatus }).eq('id', draggedTaskId)
    }

    setDraggedTaskId(null)
    setDropTargetId(null)
    setDropTargetStatus(null)
  }

  const handleDragEnd = () => {
    setDraggedTaskId(null)
    setDropTargetId(null)
    setDropTargetStatus(null)
  }

  const handleStatusChange = async (task: Task, done: boolean) => {
    await supabase.from('tasks').update({ status: done ? 'done' : 'todo' }).eq('id', task.id)
    void fetchData()
  }

  const handleDelete = async () => {
    if (!deletingTask) return
    setDeleting(true)
    await supabase.from('tasks').delete().eq('id', deletingTask.id)
    setDeleting(false)
    setDeletingTask(null)
    void fetchData()
  }

  const canCreate = isOwner || member.can_create_task
  const canDelete = isOwner || member.can_delete_task
  const canEdit = isOwner || member.can_edit_task

  const filteredTasks = tasks.filter((t) => {
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || t.status === statusFilter
    return matchSearch && matchStatus
  })

  const getColumnTasks = (status: TaskStatus) =>
    filteredTasks.filter((t) => t.status === status)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopHeader
        title="Tasks"
        subtitle={`${tasks.length} total tasks`}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-100 rounded-full p-1">
              <button onClick={() => setViewMode('list')} className={cn('p-1.5 rounded-full transition-colors', viewMode === 'list' ? 'bg-white shadow-sm text-violet-600' : 'text-gray-400 hover:text-gray-600')} id="btn-list-view">
                <List size={14} />
              </button>
              <button onClick={() => setViewMode('kanban')} className={cn('p-1.5 rounded-full transition-colors', viewMode === 'kanban' ? 'bg-white shadow-sm text-violet-600' : 'text-gray-400 hover:text-gray-600')} id="btn-kanban-view">
                <LayoutGrid size={14} />
              </button>
            </div>
            {canCreate && (
              <Button variant="primary" size="md" onClick={() => { setEditingTask(null); setShowTaskModal(true) }} id="btn-new-task">
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
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks…" className="w-full pl-9 pr-4 py-2 text-sm rounded-full bg-gray-100 border-0 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:bg-white transition-all" id="search-tasks" />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter size={13} className="text-gray-400" />
          {(['all', 'todo', 'in_progress', 'done'] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={cn('text-xs px-3 py-1.5 rounded-full font-medium transition-all', statusFilter === s ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')} id={`filter-${s}`}>
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
          <div className="space-y-6">
            {STATUS_GROUPS.map(({ status, label, icon, color }) => {
              const groupTasks = filteredTasks.filter((t) => t.status === status)
              if (statusFilter !== 'all' && statusFilter !== status) return null
              return (
                <div key={status}>
                  <div className={`flex items-center gap-2 mb-3 ${color}`}>
                    {icon}
                    <span className="text-sm font-semibold">{label}</span>
                    <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{groupTasks.length}</span>
                  </div>
                  <Card>
                    <CardContent className="p-2">
                      {groupTasks.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-5">No {label.toLowerCase()} tasks</p>
                      ) : (
                        <div className="space-y-0.5">
                          {groupTasks.map((task) => (
                            <div key={task.id} className="group relative">
                              <TaskRow task={task} onClick={() => navigate(`/workspace/${workspace.id}/tasks/${task.id}`)} onStatusChange={handleStatusChange} />
                              <div className="absolute right-14 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1">
                                {canEdit && (
                                  <button onClick={(e) => { e.stopPropagation(); setEditingTask(task); setShowTaskModal(true) }} className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors" id={`edit-task-${task.id}`}>
                                    <Pencil size={13} />
                                  </button>
                                )}
                                {canDelete && (
                                  <button onClick={(e) => { e.stopPropagation(); setDeletingTask(task) }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" id={`delete-task-${task.id}`}>
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
          <div className="flex gap-4 h-full">
            {STATUS_GROUPS.map(({ status, label, icon, color }) => {
              const colTasks = getColumnTasks(status)
              const isDropTarget = dropTargetStatus === status

              return (
                <div
                  key={status}
                  className={cn(
                    "flex-1 min-w-[260px] flex flex-col rounded-2xl transition-colors",
                    isDropTarget && "bg-violet-50"
                  )}
                  onDragOver={(e) => handleDragOver(e, null, status)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, null, status)}
                >
                  <div className={`flex items-center gap-2 mb-3 ${color}`}>
                    {icon}
                    <span className="text-sm font-semibold">{label}</span>
                    <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 ml-auto">{colTasks.length}</span>
                  </div>
                  <div className="flex-1 bg-gray-50/80 rounded-2xl p-3 space-y-2 overflow-y-auto scrollbar-thin">
                    {colTasks.map((task) => {
                      const isDragging = draggedTaskId === task.id
                      const isDropHere = dropTargetId === task.id && dropTargetStatus === status

                      return (
                        <Card
                          key={task.id}
                          className={cn(
                            "transition-all select-none",
                            isDragging && "opacity-50"
                          )}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => handleDragOver(e, task.id, status)}
                          onDrop={(e) => handleDrop(e, task.id, status)}
                          onClick={() => navigate(`/workspace/${workspace.id}/tasks/${task.id}`)}
                        >
                          <div className="p-3">
                            <div className="flex items-start gap-2">
                              <GripVertical size={14} className="mt-0.5 text-gray-300 cursor-grab" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 leading-snug">{task.title}</p>
                                {task.project_label && task.project_color && (
                                  <span
                                    className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium"
                                    style={{
                                      backgroundColor: `${task.project_color}20`,
                                      color: task.project_color,
                                    }}
                                  >
                                    {task.project_label}
                                  </span>
                                )}
                                {task.due_date && (
                                  <p className="text-xs text-gray-400 mt-1">
                                    Due: {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                {(canEdit || canDelete) && (
                                  <div className="flex gap-1">
                                    {canEdit && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setEditingTask(task); setShowTaskModal(true) }}
                                        className="p-1 text-gray-300 hover:text-violet-500 transition-colors"
                                      >
                                        <Pencil size={12} />
                                      </button>
                                    )}
                                    {canDelete && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setDeletingTask(task) }}
                                        className="p-1 text-gray-300 hover:text-red-400 transition-colors"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      )
                    })}
                    {colTasks.length === 0 && (
                      <div className={cn(
                        "h-24 flex items-center justify-center border-2 border-dashed rounded-xl transition-colors",
                        isDropTarget ? "border-violet-400 bg-violet-50" : "border-gray-200"
                      )}>
                        <p className="text-xs text-gray-400">Drop tasks here</p>
                      </div>
                    )}
                    {canCreate && (
                      <button onClick={() => { setEditingTask(null); setShowTaskModal(true) }} className="w-full py-2.5 text-xs text-gray-400 hover:text-violet-600 hover:bg-white rounded-xl transition-colors flex items-center justify-center gap-1.5" id={`kanban-add-${status}`}>
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

      <TaskModal open={showTaskModal} onClose={() => { setShowTaskModal(false); setEditingTask(null) }} workspaceId={workspace.id} task={editingTask} members={members} canEdit={canEdit || canCreate} onSaved={fetchData} />
      <ConfirmModal open={!!deletingTask} onClose={() => setDeletingTask(null)} onConfirm={handleDelete} title="Delete Task" description={`Are you sure you want to delete "${deletingTask?.title}"? This action cannot be undone.`} confirmLabel="Delete" danger loading={deleting} />
    </div>
  )
}
