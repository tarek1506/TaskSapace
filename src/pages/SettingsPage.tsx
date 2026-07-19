import { useState } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { Trash2, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { TopHeader } from '@/components/layout/Sidebar'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ConfirmModal } from '@/components/ui/Modal'
import type { Workspace, WorkspaceMember } from '@/types'

interface OutletCtx {
  workspace: Workspace
  member: WorkspaceMember
  isOwner: boolean
}

export function SettingsPage() {
  const { workspace, isOwner } = useOutletContext<OutletCtx>()
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState(workspace.name)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleSaveName = async () => {
    if (!name.trim() || !isOwner) return
    setSaving(true)
    await supabase.from('workspaces').update({ name: name.trim() }).eq('id', workspace.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleDeleteWorkspace = async () => {
    if (!isOwner) return
    setDeleting(true)
    // Step 1: Get all task IDs in this workspace
    const { data: taskRows } = await supabase
      .from('tasks')
      .select('id')
      .eq('workspace_id', workspace.id)
    const taskIds = (taskRows || []).map((t: any) => t.id)
    // Step 2: Delete comments for those tasks
    if (taskIds.length > 0) {
      await supabase.from('task_comments').delete().in('task_id', taskIds)
    }
    await supabase.from('tasks').delete().eq('workspace_id', workspace.id)
    await supabase.from('notifications').delete().eq('workspace_id', workspace.id)
    await supabase.from('workspace_members').delete().eq('workspace_id', workspace.id)
    await supabase.from('workspaces').delete().eq('id', workspace.id)
    setDeleting(false)
    await signOut()
    navigate('/workspaces')
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopHeader title="Settings" subtitle="Manage your workspace" />

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 sm:p-6">
        <div className="max-w-lg space-y-6">
          {/* Workspace Name */}
          <Card>
            <CardHeader>
              <CardTitle>Workspace Name</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Workspace name"
                disabled={!isOwner}
                id="setting-workspace-name"
              />
              {isOwner && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveName}
                  loading={saving}
                  disabled={!name.trim() || name === workspace.name}
                  id="btn-save-workspace-name"
                >
                  {saved ? '✓ Saved!' : 'Save Changes'}
                </Button>
              )}
              {!isOwner && (
                <p className="text-xs text-gray-400">Only owners can rename the workspace.</p>
              )}
            </CardContent>
          </Card>

          {/* Info card */}
          <Card>
            <CardHeader>
              <CardTitle>Workspace Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Workspace ID</span>
                <span className="text-sm font-mono text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                  {workspace.id.slice(0, 8)}…
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Created</span>
                <span className="text-sm text-gray-700">
                  {new Date(workspace.created_at).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-500">Your Role</span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  isOwner ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {isOwner ? 'Owner' : 'Member'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          {isOwner && (
            <Card className="border-red-200">
              <CardHeader>
                <div className="flex items-center gap-2 text-red-500">
                  <AlertTriangle size={16} />
                  <CardTitle className="text-red-500">Danger Zone</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Delete Workspace</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Permanently delete this workspace and all its data.
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setShowDelete(true)}
                    id="btn-delete-workspace"
                  >
                    <Trash2 size={13} /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ConfirmModal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDeleteWorkspace}
        title="Delete Workspace"
        description="This will permanently delete the workspace, all tasks, comments, and members. This action cannot be undone."
        confirmLabel="Delete Forever"
        danger
        loading={deleting}
      />
    </div>
  )
}
