import { useEffect, useState } from 'react'
import { Outlet, useParams, useNavigate } from 'react-router-dom'
import { DashboardSidebar } from './DashboardSidebar'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import type { Workspace, WorkspaceMember } from '@/types'

export function WorkspaceLayout() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [member, setMember] = useState<WorkspaceMember | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id || !user) return

    const load = async () => {
      const [wsRes, memRes] = await Promise.all([
        supabase.from('workspaces').select('*').eq('id', id).single(),
        supabase
          .from('workspace_members')
          .select('*')
          .eq('workspace_id', id)
          .eq('user_id', user.id)
          .single(),
      ])

      if (wsRes.error || memRes.error) {
        navigate('/workspaces')
        return
      }

      setWorkspace(wsRes.data)
      setMember(memRes.data)
      setLoading(false)
    }

    load()
  }, [id, user, navigate])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F3F4F6]">
        <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!workspace || !member) return null

  const isOwner = member.role === 'owner'

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-4">
      <div className="w-full max-w-[1440px] h-[calc(100vh-2rem)] bg-white rounded-[24px] shadow-[0_8px_40px_rgba(0,0,0,0.08)] flex overflow-hidden">
        <DashboardSidebar
          workspaceId={workspace.id}
          workspaceName={workspace.name}
          isOwner={isOwner}
        />
        <main className="flex-1 flex flex-col overflow-hidden bg-[#F3F4F6]">
          <NotificationProvider workspaceId={workspace.id}>
            <Outlet context={{ workspace, member, isOwner }} />
          </NotificationProvider>
        </main>
      </div>
    </div>
  )
}
