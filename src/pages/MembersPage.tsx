import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Plus, Mail, Lock, Shield, Eye, EyeOff, Trash2, Crown, Pencil, Check, X, Circle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { TopHeader } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { PermissionToggle } from '@/components/ui/Switch'
import { Avatar } from '@/components/ui/Avatar'
import type { Workspace, WorkspaceMember, PermissionFlags } from '@/types'

interface OutletCtx {
  workspace: Workspace
  member: WorkspaceMember
  isOwner: boolean
}

interface MemberWithProfile extends WorkspaceMember {
  last_seen_at?: string | null
}

const PERMISSION_FIELDS: {
  key: keyof PermissionFlags
  label: string
  description: string
}[] = [
  {
    key: 'can_create_task',
    label: 'Create Tasks',
    description: 'Member can create new tasks in this workspace',
  },
  {
    key: 'can_edit_task',
    label: 'Edit Own Tasks',
    description: 'Member can edit tasks assigned to them',
  },
  {
    key: 'can_delete_task',
    label: 'Delete Tasks',
    description: 'Member can delete tasks they created',
  },
  {
    key: 'can_assign_task',
    label: 'Assign Tasks',
    description: 'Member can assign tasks to other members',
  },
  {
    key: 'can_view_all_tasks',
    label: 'View All Tasks',
    description: 'See tasks assigned to other members, not just their own',
  },
  {
    key: 'can_edit_others_tasks',
    label: "Edit Others' Tasks",
    description: "Member can edit tasks assigned to other members",
  },
]

export function MembersPage() {
  const { workspace, isOwner } = useOutletContext<OutletCtx>()
  const { user: currentUser } = useAuth()

  const [members, setMembers] = useState<MemberWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [selectedMember, setSelectedMember] = useState<MemberWithProfile | null>(null)
  const [removingMember, setRemovingMember] = useState<MemberWithProfile | null>(null)
  const [removing, setRemoving] = useState(false)

  // Edit name state
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [savingName, setSavingName] = useState(false)

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitePassword, setInvitePassword] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [showInvitePassword, setShowInvitePassword] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')

  useEffect(() => { fetchMembers() }, [workspace.id])

  // Update own last_seen periodically
  useEffect(() => {
    if (currentUser) {
      updateLastSeen()
      const interval = setInterval(updateLastSeen, 60000) // Every minute
      return () => clearInterval(interval)
    }
  }, [currentUser])

  const updateLastSeen = async () => {
    if (!currentUser) return
    await supabase
      .from('profiles')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', currentUser.id)
  }

  const isUserActive = (lastSeenAt: string | null | undefined): boolean => {
    if (!lastSeenAt) return false
    const lastSeen = new Date(lastSeenAt).getTime()
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
    return lastSeen > fiveMinutesAgo
  }

  const fetchMembers = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', workspace.id)
      .order('joined_at', { ascending: true })

    if (data && data.length > 0) {
      const uniqueUserIds = [...new Set(data.map((m: any) => m.user_id))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name, last_seen_at')
        .in('id', uniqueUserIds)

      const profileMap: Record<string, any> = {}
      for (const p of profiles || []) profileMap[p.id] = p

      setMembers(
        data.map((m: any) => {
          const p = profileMap[m.user_id]
          return {
            ...m,
            user_email: p?.email || '',
            user_name: p?.full_name || p?.email?.split('@')[0] || 'User',
            last_seen_at: p?.last_seen_at || null,
          }
        })
      )
    } else {
      setMembers([])
    }
    setLoading(false)
  }

  const handleInvite = async () => {
    if (!inviteEmail || !invitePassword) {
      setInviteError('Email and password are required')
      return
    }
    if (invitePassword.length < 6) {
      setInviteError('Password must be at least 6 characters')
      return
    }

    setInviting(true)
    setInviteError('')

    const { data, error } = await supabase.auth.signUp({
      email: inviteEmail,
      password: invitePassword,
      options: {
        data: { name: inviteName },
      },
    })

    if (error || !data.user) {
      setInviteError(error?.message || 'Failed to create user')
      setInviting(false)
      return
    }

    const { error: memberErr } = await supabase.from('workspace_members').insert({
      workspace_id: workspace.id,
      user_id: data.user.id,
      role: 'member',
      can_create_task: false,
      can_edit_task: false,
      can_delete_task: false,
      can_assign_task: false,
      can_view_all_tasks: false,
      can_edit_others_tasks: false,
      must_change_password: true,
    })

    setInviting(false)
    if (memberErr) {
      setInviteError(memberErr.message)
      return
    }

    setShowInvite(false)
    setInviteEmail('')
    setInvitePassword('')
    setInviteName('')
    fetchMembers()
  }

  const handlePermissionChange = async (
    memberId: string,
    key: keyof PermissionFlags,
    value: boolean
  ) => {
    await supabase
      .from('workspace_members')
      .update({ [key]: value })
      .eq('id', memberId)

    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, [key]: value } : m))
    )
    if (selectedMember?.id === memberId) {
      setSelectedMember((prev) => prev ? { ...prev, [key]: value } : prev)
    }
  }

  const handleStartEditName = (member: MemberWithProfile) => {
    setEditingMemberId(member.id)
    setEditingName(member.user_name || member.user_email?.split('@')[0] || '')
  }

  const handleSaveName = async (memberId: string) => {
    if (!editingName.trim()) return
    setSavingName(true)

    // Find the member to get their user_id
    const member = members.find(m => m.id === memberId)
    if (!member) return

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: editingName.trim() })
      .eq('id', member.user_id)

    setSavingName(false)
    if (!error) {
      setMembers(prev => prev.map(m => 
        m.id === memberId ? { ...m, user_name: editingName.trim() } : m
      ))
      if (selectedMember?.id === memberId) {
        setSelectedMember(prev => prev ? { ...prev, user_name: editingName.trim() } : prev)
      }
    }
    setEditingMemberId(null)
    setEditingName('')
  }

  const handleCancelEditName = () => {
    setEditingMemberId(null)
    setEditingName('')
  }

  const handleRemoveMember = async () => {
    if (!removingMember) return
    setRemoving(true)
    await supabase.from('workspace_members').delete().eq('id', removingMember.id)
    setRemoving(false)
    setRemovingMember(null)
    if (selectedMember?.id === removingMember.id) setSelectedMember(null)
    fetchMembers()
  }

  if (!isOwner) {
    return (
      <div className="flex flex-col h-full">
        <TopHeader title="Members" subtitle="Workspace team" />
        <div className="flex flex-col items-center justify-center flex-1">
          <Shield size={40} className="text-gray-200 mb-3" />
          <p className="text-gray-500 text-sm">Only workspace owners can manage members.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopHeader
        title="Members"
        subtitle={`${members.length} members`}
        actions={
          <Button
            variant="primary"
            size="md"
            onClick={() => setShowInvite(true)}
            id="btn-invite-member"
          >
            <Plus size={15} /> Invite Member
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
          {/* Members list */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Team Members
            </h2>
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
              </div>
            ) : (
              members.map((m) => {
                const isActive = isUserActive(m.last_seen_at)
                const isEditing = editingMemberId === m.id

                return (
                  <Card
                    key={m.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedMember?.id === m.id
                        ? 'ring-2 ring-violet-400 shadow-md'
                        : ''
                    }`}
                    onClick={() => {
                      if (!isEditing) {
                        setSelectedMember(m.id === selectedMember?.id ? null : m)
                      }
                    }}
                    id={`member-card-${m.id}`}
                  >
                    <CardContent className="flex items-center gap-4 py-4">
                      <div className="relative">
                        <Avatar
                          email={m.user_email || ''}
                          name={m.user_name || m.user_email || ''}
                          size="md"
                        />
                        {isActive && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white" title="Active now" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="flex-1 px-2 py-1 text-sm rounded-lg border border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveName(m.id)
                                if (e.key === 'Escape') handleCancelEditName()
                              }}
                            />
                            <button
                              onClick={(e) => { e.stopPropagation(); handleSaveName(m.id) }}
                              className="p-1 text-emerald-500 hover:bg-emerald-50 rounded"
                              disabled={savingName}
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleCancelEditName() }}
                              className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {m.user_name || m.user_email?.split('@')[0]}
                            </p>
                            {isActive && (
                              <span className="text-xs text-emerald-500 font-medium">Active</span>
                            )}
                            {m.role === 'owner' && (
                              <Crown size={13} className="text-amber-500 flex-shrink-0" />
                            )}
                            {m.must_change_password && (
                              <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">
                                Must change pw
                              </span>
                            )}
                          </div>
                        )}
                        <p className="text-xs text-gray-400 truncate">{m.user_email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isEditing && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleStartEditName(m)
                            }}
                            className="p-1.5 text-gray-300 hover:text-violet-500 hover:bg-violet-50 rounded-lg transition-colors"
                            title="Edit name"
                          >
                            <Pencil size={13} />
                          </button>
                        )}
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          m.role === 'owner'
                            ? 'bg-violet-100 text-violet-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {m.role}
                        </span>
                        {m.role !== 'owner' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setRemovingMember(m)
                            }}
                            className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                            id={`remove-member-${m.id}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>

          {/* Permissions panel */}
          {selectedMember && selectedMember.role !== 'owner' && (
            <div className="space-y-3 fade-in">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Permissions for {selectedMember.user_name || selectedMember.user_email?.split('@')[0]}
              </h2>
              <Card>
                <CardContent className="space-y-2 py-4">
                  {PERMISSION_FIELDS.map((perm) => (
                    <PermissionToggle
                      key={perm.key}
                      id={`perm-${selectedMember.id}-${perm.key}`}
                      label={perm.label}
                      description={perm.description}
                      checked={!!selectedMember[perm.key]}
                      onChange={(val) =>
                        handlePermissionChange(selectedMember.id, perm.key, val)
                      }
                    />
                  ))}
                </CardContent>
              </Card>
              <p className="text-xs text-gray-400 text-center">
                Changes are saved instantly
              </p>
            </div>
          )}

          {selectedMember?.role === 'owner' && (
            <Card className="fade-in">
              <CardContent className="flex flex-col items-center justify-center py-10 text-center gap-3">
                <Crown size={28} className="text-amber-400" />
                <p className="text-sm font-medium text-gray-700">Workspace Owner</p>
                <p className="text-xs text-gray-400">
                  Owners have full access to all features and cannot be restricted.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      <Modal
        open={showInvite}
        onClose={() => {
          setShowInvite(false)
          setInviteEmail('')
          setInvitePassword('')
          setInviteName('')
          setInviteError('')
        }}
        title="Invite Member"
        description="Set their credentials directly. They'll be prompted to change their password on first login."
        size="md"
      >
        <div className="space-y-4">
          {inviteError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {inviteError}
            </div>
          )}
          <Input
            label="Full Name (optional)"
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            placeholder="Jane Smith"
            id="invite-name"
          />
          <Input
            label="Email Address"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="jane@company.com"
            leftIcon={<Mail size={14} />}
            id="invite-email"
          />
          <Input
            label="Temporary Password"
            type={showInvitePassword ? 'text' : 'password'}
            value={invitePassword}
            onChange={(e) => setInvitePassword(e.target.value)}
            placeholder="Set a temporary password"
            leftIcon={<Lock size={14} />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowInvitePassword(!showInvitePassword)}
                className="text-gray-400 hover:text-gray-600"
              >
                {showInvitePassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            }
            id="invite-password"
          />
          <p className="text-xs text-gray-400 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            💡 In production, use a Supabase Edge Function with the Admin API to invite users
            without exposing admin credentials on the client.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowInvite(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleInvite}
              loading={inviting}
              disabled={!inviteEmail || !invitePassword}
              id="btn-confirm-invite"
            >
              Send Invite
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!removingMember}
        onClose={() => setRemovingMember(null)}
        onConfirm={handleRemoveMember}
        title="Remove Member"
        description={`Remove ${removingMember?.user_name || removingMember?.user_email} from this workspace?`}
        confirmLabel="Remove"
        danger
        loading={removing}
      />
    </div>
  )
}
