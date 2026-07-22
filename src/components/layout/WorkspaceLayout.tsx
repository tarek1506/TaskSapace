import { useEffect, useState, useCallback } from 'react'
import { Outlet, useParams, useNavigate } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { DashboardSidebar } from './DashboardSidebar'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { ChatProvider } from '@/contexts/ChatContext'
import type { Workspace, WorkspaceMember } from '@/types'

export function WorkspaceLayout() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [member, setMember] = useState<WorkspaceMember | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

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

  useEffect(() => {
    setSidebarOpen(false)
  }, [id])

  // ── Presence heartbeat ─────────────────────────────────────────────────────
  // Updates last_seen_at immediately on mount and every 60 s so the user
  // appears online in chat while the app is open.
  const pingPresence = useCallback(async () => {
    if (!user) return
    await supabase
      .from('profiles')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', user.id)
  }, [user])

  useEffect(() => {
    void pingPresence() // immediate ping on mount

    const interval = setInterval(() => void pingPresence(), 60_000)

    // Also ping when the user switches back to this tab
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void pingPresence()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [pingPresence])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F3F4F6] dark:bg-[#0f1117]">
        <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!workspace || !member) return null

  const isOwner = member.role === 'owner'

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0f1117] flex items-center justify-center p-2 sm:p-4">
      <ChatProvider workspaceId={workspace.id}>
      <div className="w-full max-w-[1440px] h-[calc(100vh-1rem)] sm:h-[calc(100vh-2rem)] bg-white dark:bg-gray-900 rounded-[24px] shadow-[0_8px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)] flex overflow-hidden relative">
        {/* Mobile hamburger */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="md:hidden fixed top-3 left-3 z-50 p-2 rounded-xl bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/30 z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`
          fixed md:static inset-y-0 left-0 z-40
          w-[260px] transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <DashboardSidebar
            workspaceId={workspace.id}
            workspaceName={workspace.name}
            isOwner={isOwner}
            onNavClick={() => setSidebarOpen(false)}
          />
        </div>

        <main className="flex-1 flex flex-col overflow-hidden bg-[#F3F4F6] dark:bg-[#0f1117] min-w-0">
          <NotificationProvider workspaceId={workspace.id}>
            <Outlet context={{ workspace, member, isOwner }} />
          </NotificationProvider>
        </main>
      </div>
      </ChatProvider>
    </div>
  )
}
