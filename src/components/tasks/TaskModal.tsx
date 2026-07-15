import { useState, useEffect } from 'react'
import { X, Calendar, Tag, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { StatusBadge } from '@/components/ui/Badge'
import { PROJECT_COLORS } from '@/types'
import type { Task, WorkspaceMember, TaskStatus } from '@/types'

interface TaskModalProps {
  open: boolean
  onClose: () => void
  workspaceId: string
  task?: Task | null
  members: WorkspaceMember[]
  canEdit: boolean
  onSaved: () => void
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
]

const COLOR_ENTRIES = Object.entries(PROJECT_COLORS)

export function TaskModal({
  open, onClose, workspaceId, task, members, canEdit, onSaved
}: TaskModalProps) {
  const { user } = useAuth()
  const isEdit = !!task

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [dueDate, setDueDate] = useState('')
  const [projectLabel, setProjectLabel] = useState('')
  const [projectColor, setProjectColor] = useState(PROJECT_COLORS.violet || '#8B5CF6')
  const [assignedTo, setAssignedTo] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description || '')
      setStatus(task.status)
      setDueDate(task.due_date ? task.due_date.slice(0, 10) : '')
      setProjectLabel(task.project_label || '')
      setProjectColor(task.project_color || '#8B5CF6')
      setAssignedTo(task.assigned_to || [])
    } else {
      setTitle('')
      setDescription('')
      setStatus('todo')
      setDueDate('')
      setProjectLabel('')
      setProjectColor('#8B5CF6')
      setAssignedTo([])
    }
    setError('')
  }, [task, open])

  const toggleAssignee = (userId: string) => {
    setAssignedTo((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const handleSave = async () => {
    if (!title.trim()) { setError('Title is required'); return }
    setSaving(true)
    setError('')

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      status,
      due_date: dueDate || null,
      project_label: projectLabel.trim() || null,
      project_color: projectLabel.trim() ? projectColor : null,
      assigned_to: assignedTo,
      workspace_id: workspaceId,
    }

    let err
    if (isEdit && task) {
      const { error: e } = await supabase.from('tasks').update(payload).eq('id', task.id)
      err = e
    } else {
      const { error: e } = await supabase.from('tasks').insert({ ...payload, created_by: user?.id })
      err = e
    }

    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Task' : 'Create Task'}
      size="lg"
    >
      <div className="space-y-4">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            {error}
          </div>
        )}

        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title…"
          disabled={!canEdit}
          id="task-title"
        />

        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What needs to be done?"
          rows={3}
          disabled={!canEdit}
          id="task-description"
        />

        <div className="grid grid-cols-2 gap-4">
          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              disabled={!canEdit}
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:bg-white transition-all"
              id="task-status"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Due Date */}
          <Input
            label="Due Date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={!canEdit}
            leftIcon={<Calendar size={14} />}
            id="task-due-date"
          />
        </div>

        {/* Project Label */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
            <Tag size={13} /> Project / Label
          </label>
          <div className="flex gap-2">
            <input
              value={projectLabel}
              onChange={(e) => setProjectLabel(e.target.value)}
              placeholder="e.g. Design, Backend…"
              disabled={!canEdit}
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:bg-white transition-all"
              id="task-project-label"
            />
            {/* Color picker */}
            <div className="flex items-center gap-1.5">
              {COLOR_ENTRIES.map(([name, hex]) => (
                <button
                  key={name}
                  className={`w-5 h-5 rounded-full transition-transform ${
                    projectColor === hex ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: hex }}
                  onClick={() => setProjectColor(hex)}
                  title={name}
                  disabled={!canEdit}
                  id={`color-${name}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Assignees */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
            <Users size={13} /> Assignees
          </label>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => {
              const selected = assignedTo.includes(m.user_id)
              return (
                <button
                  key={m.user_id}
                  onClick={() => canEdit && toggleAssignee(m.user_id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    selected
                      ? 'bg-violet-100 text-violet-700 ring-1 ring-violet-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  id={`assignee-${m.user_id}`}
                  disabled={!canEdit}
                >
                  {selected && <X size={10} />}
                  {m.user_name || m.user_email}
                </button>
              )
            })}
          </div>
        </div>

        {canEdit && (
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleSave} loading={saving}>
              {isEdit ? 'Save Changes' : 'Create Task'}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}
