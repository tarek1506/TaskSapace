import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import {
  DashboardHeader, TaskList,
  GanttMini, TimeWidget, GradientButton
} from '@/components/dashboard/DashboardWidgets'
import { TaskModal } from '@/components/tasks/TaskModal'
import type { Workspace, WorkspaceMember, Task, TaskStatus } from '@/types'

interface OutletCtx {
  workspace: Workspace
  member: WorkspaceMember
  isOwner: boolean
}

export function DashboardPage() {
  const { workspace, member, isOwner } = useOutletContext<OutletCtx>()
  const { user } = useAuth()

  const [showTaskModal, setShowTaskModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [tasks, setTasks] = useState<Task[]>([])

  const canCreate = isOwner || member.can_create_task
  const canEdit = isOwner || member.can_edit_task

  const fetchData = async () => {
    setLoading(true)
    const [tasksRes, membersRes, freshMemberRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('workspace_id', workspace.id).order('order_index', { ascending: true }),
      supabase.from('workspace_members').select('*').eq('workspace_id', workspace.id),
      supabase.from('workspace_members').select('*').eq('workspace_id', workspace.id).eq('user_id', user?.id || '').single(),
    ])

    const freshMember = freshMemberRes.data || member

    if (tasksRes.error && tasksRes.error.message.includes('order_index')) {
      const fallback = await supabase.from('tasks').select('*').eq('workspace_id', workspace.id).order('created_at', { ascending: false })
      const fallbackTasks = fallback.data || []
      setTasks(!isOwner && !freshMember.can_view_all_tasks ? fallbackTasks.filter(t => t.assigned_to?.includes(user?.id || '')) : fallbackTasks)
    } else {
      const allTasks = tasksRes.data || []
      setTasks(!isOwner && !freshMember.can_view_all_tasks ? allTasks.filter(t => t.assigned_to?.includes(user?.id || '')) : allTasks)
    }
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

  useEffect(() => { fetchData() }, [workspace.id])

  const handleToggle = async (taskId: string, newStatus: TaskStatus) => {
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <DashboardHeader title={workspace.name} />

      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 sm:px-8 pb-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Column (~65%) */}
            <div className="flex-[2] space-y-6 min-w-0">
              <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <h2 className="text-base font-bold text-gray-900">Tasks</h2>
                    <span className="text-[11px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{tasks.length}</span>
                  </div>
                  {canCreate && <GradientButton onClick={() => setShowTaskModal(true)} />}
                </div>
                <TaskList tasks={tasks} members={members} onToggle={handleToggle} />
              </div>

              <GanttMini tasks={tasks} members={members} />
            </div>

            {/* Right Column (~35%) */}
            <div className="flex-[1] space-y-6 min-w-0 lg:min-w-[280px]">
              <TimeWidget tasks={tasks} />
            </div>
          </div>
        )}
      </div>

      <TaskModal
        open={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        workspaceId={workspace.id}
        task={null}
        members={members}
        canEdit={canEdit || canCreate}
        onSaved={() => { setShowTaskModal(false); fetchData() }}
      />
    </div>
  )
}
