import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, Calendar, ArrowRight, Zap, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { formatDate } from '@/lib/utils'
import type { WorkspaceWithRole } from '@/types'

const WORKSPACE_GRADIENTS = [
  'from-violet-500 to-indigo-600',
  'from-pink-500 to-rose-600',
  'from-teal-500 to-cyan-600',
  'from-amber-500 to-orange-600',
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
]

export function WorkspacesPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const [workspaces, setWorkspaces] = useState<WorkspaceWithRole[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  useEffect(() => { fetchWorkspaces() }, [user])

  const fetchWorkspaces = async () => {
    if (!user) return
    setLoading(true)

    const { data } = await supabase
      .from('workspace_members')
      .select(`
        role,
        workspace:workspace_id (
          id, name, owner_id, created_at
        )
      `)
      .eq('user_id', user.id)

    if (data) {
      const ws: WorkspaceWithRole[] = data
        .filter((d: any) => d.workspace)
        .map((d: any) => ({
          ...d.workspace,
          role: d.role,
          member_count: 0,
        }))
      setWorkspaces(ws)
    }
    setLoading(false)
  }

  const createWorkspace = async () => {
    if (!newName.trim() || !user) return
    setCreating(true)
    setCreateError('')

    // 1. Create workspace
    const { data: ws, error: wsErr } = await supabase
      .from('workspaces')
      .insert({ name: newName.trim(), owner_id: user.id })
      .select()
      .single()

    if (wsErr || !ws) {
      setCreateError(wsErr?.message || 'Failed to create workspace')
      setCreating(false)
      return
    }

    // 2. Add creator as owner member
    await supabase.from('workspace_members').insert({
      workspace_id: ws.id,
      user_id: user.id,
      role: 'owner',
      can_create_task: true,
      can_edit_task: true,
      can_delete_task: true,
      can_assign_task: true,
      can_view_all_tasks: true,
      can_edit_others_tasks: true,
      must_change_password: false,
    })

    setCreating(false)
    setShowCreate(false)
    setNewName('')
    navigate(`/workspace/${ws.id}/dashboard`)
  }

  const getGradient = (id: string) => {
    let hash = 0
    for (const c of id) hash = c.charCodeAt(0) + ((hash << 5) - hash)
    return WORKSPACE_GRADIENTS[Math.abs(hash) % WORKSPACE_GRADIENTS.length]
  }

  return (
    <div className="min-h-screen gradient-bg flex flex-col">
      {/* Fixed blurs */}
      <div className="fixed top-0 left-0 w-80 h-80 bg-violet-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-pink-200/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-200">
            <Zap size={18} className="text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg">TaskSpace</span>
        </div>
        <button
          onClick={signOut}
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          id="btn-signout-workspaces"
        >
          Sign out
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-start px-8 py-8 max-w-5xl mx-auto w-full">
        <div className="w-full mb-8 fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Your Workspaces</h1>
              <p className="text-gray-500 mt-1 text-sm">
                Welcome back, {user?.user_metadata?.name || user?.email?.split('@')[0]} 👋
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={() => setShowCreate(true)}
              id="btn-create-workspace"
            >
              <Plus size={16} />
              New Workspace
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
          </div>
        ) : workspaces.length === 0 ? (
          <div className="text-center py-20 fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-100 mb-4">
              <Sparkles size={28} className="text-violet-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">No workspaces yet</h2>
            <p className="text-gray-500 text-sm mb-6">Create your first workspace to get started</p>
            <Button variant="primary" onClick={() => setShowCreate(true)} id="btn-create-first">
              <Plus size={16} /> Create Workspace
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
            {workspaces.map((ws, i) => (
              <button
                key={ws.id}
                onClick={() => navigate(`/workspace/${ws.id}/dashboard`)}
                className="group text-left glass-card rounded-2xl p-5 hover:shadow-xl hover:shadow-violet-100 transition-all duration-300 hover:-translate-y-1 fade-in"
                style={{ animationDelay: `${i * 60}ms` }}
                id={`workspace-card-${ws.id}`}
              >
                {/* Color accent */}
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getGradient(ws.id)} flex items-center justify-center mb-4 shadow-md`}>
                  <span className="text-white font-bold text-base">
                    {ws.name[0]?.toUpperCase()}
                  </span>
                </div>

                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-base group-hover:text-violet-700 transition-colors">
                      {ws.name}
                    </h3>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        ws.role === 'owner'
                          ? 'bg-violet-100 text-violet-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {ws.role === 'owner' ? 'Owner' : 'Member'}
                      </span>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-gray-300 group-hover:text-violet-400 transition-colors mt-1" />
                </div>

                <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar size={11} />
                    {formatDate(ws.created_at)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Create Workspace Modal */}
      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); setNewName(''); setCreateError('') }}
        title="Create Workspace"
        description="A workspace is a shared space for your team."
        size="sm"
      >
        <div className="space-y-4">
          {createError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {createError}
            </div>
          )}
          <Input
            label="Workspace Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Acme Corp, Personal Projects…"
            id="workspace-name-input"
            onKeyDown={(e) => e.key === 'Enter' && createWorkspace()}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={createWorkspace}
              loading={creating}
              disabled={!newName.trim()}
              id="btn-confirm-create-workspace"
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
