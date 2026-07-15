import { useEffect, useState } from 'react'
import { Outlet, useParams, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!workspace || !member) return null

  const isOwner = member.role === 'owner'

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="w-full max-w-[1400px] h-[calc(100vh-2rem)] glass-card rounded-3xl flex overflow-hidden">
        <Sidebar
          workspaceId={workspace.id}
          workspaceName={workspace.name}
          isOwner={isOwner}
        />
        <main className="flex-1 flex flex-col overflow-hidden">
          <Outlet context={{ workspace, member, isOwner }} />
        </main>
      </div>
    </div>
  )
}
