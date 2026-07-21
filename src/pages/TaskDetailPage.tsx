import { useState, useEffect } from 'react'
import { useParams, useOutletContext, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Calendar, Tag, Users, Circle, Clock, CheckCircle2, Pencil, Trash2, ArrowUp, ArrowRight, ArrowDown
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { TopHeader } from '@/components/layout/Sidebar'
import { CommentThread } from '@/components/tasks/CommentThread'
import { TaskModal } from '@/components/tasks/TaskModal'
import { ConfirmModal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { AvatarGroup } from '@/components/ui/Avatar'
import { ProjectPill, StatusBadge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { cn, formatDate, formatDateTime } from '@/lib/utils'
import type { Workspace, WorkspaceMember, Task, TaskPriority } from '@/types'

interface OutletCtx {
  workspace: Workspace
  member: WorkspaceMember
  isOwner: boolean
}

export function TaskDetailPage() {
  const { id: workspaceId, taskId } = useParams<{ id: string; taskId: string }>()
  const { workspace, member, isOwner } = useOutletContext<OutletCtx>()
  const navigate = useNavigate()

  const [task, setTask] = useState<Task | null>(null)
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (taskId) fetchData()
  }, [taskId])

  const fetchData = async () => {
    setLoading(true)
    const [taskRes, membersRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('id', taskId!).single(),
      supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', workspaceId!),
    ])

    if (taskRes.data) setTask(taskRes.data)

    if (membersRes.data && membersRes.data.length > 0) {
      const uniqueUserIds = [...new Set(membersRes.data.map((m: any) => m.user_id))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', uniqueUserIds)

      const profileMap: Record<string, any> = {}
      for (const p of profiles || []) profileMap[p.id] = p

      setMembers(
        membersRes.data.map((m: any) => {
          const p = profileMap[m.user_id]
          return {
            ...m,
            user_email: p?.email || '',
            user_name: p?.full_name || p?.email?.split('@')[0] || 'User',
          }
        })
      )
    } else {
      setMembers([])
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!task) return
    setDeleting(true)
    await supabase.from('tasks').delete().eq('id', task.id)
    setDeleting(false)
    navigate(`/workspace/${workspaceId}/tasks`)
  }

  const handleStatusChange = async (status: Task['status']) => {
    if (!task) return
    await supabase.from('tasks').update({ status }).eq('id', task.id)
    setTask({ ...task, status })
  }

  const priorityConfig: Record<TaskPriority, { label: string; icon: React.ReactNode; color: string; bg: string } | null> = {
    high: { label: 'High', icon: <ArrowUp size={12} />, color: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-950/50' },
    medium: { label: 'Medium', icon: <ArrowRight size={12} />, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/50' },
    low: { label: 'Low', icon: <ArrowDown size={12} />, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/50' },
    none: null,
  }

  const canEdit = isOwner || member.can_edit_task || member.can_edit_others_tasks
  const canDelete = isOwner || member.can_delete_task

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <TopHeader title="Task Detail" />
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        </div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="flex flex-col h-full">
        <TopHeader title="Task Not Found" />
        <div className="flex flex-col items-center justify-center flex-1 gap-4">
          <p className="text-gray-500 dark:text-gray-400">This task doesn't exist or you don't have access.</p>
          <Button variant="secondary" onClick={() => navigate(`/workspace/${workspaceId}/tasks`)}>
            <ArrowLeft size={14} /> Back to Tasks
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopHeader
        title={task.title}
        subtitle={`Created ${formatDate(task.created_at)}`}
        actions={
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/workspace/${workspaceId}/tasks`)}
              id="btn-back-tasks"
            >
              <ArrowLeft size={14} /> Back
            </Button>
            {canEdit && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowEdit(true)}
                id="btn-edit-task"
              >
                <Pencil size={13} /> Edit
              </Button>
            )}
            {canDelete && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDelete(true)}
                id="btn-delete-task"
              >
                <Trash2 size={13} /> Delete
              </Button>
            )}
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 sm:p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Main task card */}
          <Card className="fade-in">
            <CardContent className="space-y-6">
              {/* Title + Status */}
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-snug">{task.title}</h2>
                <StatusBadge status={task.status} />
              </div>

              {/* Description */}
              {task.description && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Description</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {task.description}
                  </p>
                </div>
              )}

              {/* Meta grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* Status quick-change */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Status</p>
                  <div className="flex flex-col gap-1.5">
                    {(['todo', 'in_progress', 'done'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => canEdit && handleStatusChange(s)}
                        className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg transition-colors text-left ${
                          task.status === s
                            ? 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 font-medium'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                        disabled={!canEdit}
                        id={`status-btn-${s}`}
                      >
                        {s === 'todo' && <Circle size={12} />}
                        {s === 'in_progress' && <Clock size={12} className="text-amber-500" />}
                        {s === 'done' && <CheckCircle2 size={12} className="text-emerald-500" />}
                        {s === 'todo' ? 'To Do' : s === 'in_progress' ? 'In Progress' : 'Done'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Due Date */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={11} /> Due Date
                    </span>
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {task.due_date ? formatDateTime(task.due_date) : '—'}
                  </p>
                </div>

                {/* Deadline */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                    <span className="flex items-center gap-1.5">
                      <Clock size={11} /> Deadline
                    </span>
                  </p>
                  <p className={cn(
                    'text-sm font-medium',
                    task.deadline ? (new Date(task.deadline) < new Date() && task.status !== 'done' ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-200') : 'text-gray-400 dark:text-gray-500'
                  )}>
                    {task.deadline ? formatDateTime(task.deadline) : '—'}
                  </p>
                </div>

                {/* Priority */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Priority</p>
                  {priorityConfig[task.priority] ? (
                    <span className={cn('inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full', priorityConfig[task.priority]!.bg, priorityConfig[task.priority]!.color)}>
                      {priorityConfig[task.priority]!.icon} {priorityConfig[task.priority]!.label}
                    </span>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500">—</p>
                  )}
                </div>

                {/* Project */}
                {task.project_label && task.project_color && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                      <span className="flex items-center gap-1.5">
                        <Tag size={11} /> Project
                      </span>
                    </p>
                    <ProjectPill
                      label={task.project_label}
                      color={task.project_color}
                      size="md"
                    />
                  </div>
                )}
              </div>

              {/* Assignees */}
              {task.assigned_to && task.assigned_to.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                    <span className="flex items-center gap-1.5">
                      <Users size={11} /> Assignees
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {task.assigned_to.map((uid) => {
                      const m = members.find((m) => m.user_id === uid)
                      if (!m) return null
                      return (
                        <div key={uid} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-full px-3 py-1.5">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                            style={{ backgroundColor: '#8B5CF6' }}
                          >
                            {(m.user_name || m.user_email || '?')[0].toUpperCase()}
                          </div>
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            {m.user_name || m.user_email?.split('@')[0]}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comments section */}
          <Card className="fade-in">
            <CardContent>
              <CommentThread taskId={task.id} workspaceId={workspaceId!} taskTitle={task.title} members={members} ownerId={workspace.owner_id} createdBy={task.created_by} />
            </CardContent>
          </Card>
        </div>
      </div>

      <TaskModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        workspaceId={workspace.id}
        task={task}
        members={members}
        canEdit={canEdit}
        onSaved={fetchData}
      />

      <ConfirmModal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete Task"
        description="Are you sure? All comments will also be deleted."
        confirmLabel="Delete"
        danger
        loading={deleting}
      />
    </div>
  )
}
