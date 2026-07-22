import { useState, useEffect } from 'react'
import { X, Tag, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { StatusBadge } from '@/components/ui/Badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { DatePicker } from '@/components/ui/DatePicker'
import { cn } from '@/lib/utils'
import { PROJECT_COLORS } from '@/types'
import type { Task, WorkspaceMember, TaskStatus, TaskPriority } from '@/types'

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

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; icon: string; color: string }[] = [
  { value: 'high', label: 'High', icon: '↑', color: 'text-pink-600' },
  { value: 'medium', label: 'Medium', icon: '→', color: 'text-amber-600' },
  { value: 'low', label: 'Low', icon: '↓', color: 'text-emerald-600' },
  { value: 'none', label: 'None', icon: '–', color: 'text-gray-400' },
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
  const [priority, setPriority] = useState<TaskPriority>('none')
  const [startDate, setStartDate] = useState('')
  const [deadline, setDeadline] = useState('')
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
      setPriority(task.priority || 'none')
      setStartDate(task.start_date || '')
      setDeadline(task.deadline || '')
      setProjectLabel(task.project_label || '')
      setProjectColor(task.project_color || '#8B5CF6')
      setAssignedTo(task.assigned_to || [])
    } else {
      setTitle('')
      setDescription('')
      setStatus('todo')
      setPriority('none')
      setStartDate('')
      setDeadline('')
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
      priority,
      start_date: startDate || null,
      deadline: deadline || null,
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
          <Select value={status} onValueChange={(val) => setStatus(val as TaskStatus)} disabled={!canEdit}>
            <SelectTrigger label="Status" id="task-status">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'w-2 h-2 rounded-full',
                      option.value === 'todo' && 'bg-gray-400',
                      option.value === 'in_progress' && 'bg-amber-500',
                      option.value === 'done' && 'bg-green-500'
                    )} />
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Priority */}
          <Select value={priority} onValueChange={(val) => setPriority(val as TaskPriority)} disabled={!canEdit}>
            <SelectTrigger label="Priority" id="task-priority">
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className={cn('flex items-center gap-2', option.color)}>
                    <span className="text-xs font-bold">{option.icon}</span>
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Start Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
            <div className="relative">
              <DatePicker
                value={startDate}
                onChange={setStartDate}
                placeholder="Set start date & time"
                disabled={!canEdit}
                id="task-start-date"
                showTime
              />
            </div>
          </div>

          {/* Deadline */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Deadline</label>
            <div className="relative">
              <DatePicker
                value={deadline}
                onChange={setDeadline}
                placeholder="Set deadline & time"
                disabled={!canEdit}
                id="task-deadline"
                showTime
              />
            </div>
          </div>
        </div>

        {/* Project Label */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <Tag size={13} /> Project / Label
          </label>
          <div className="flex gap-2">
            <input
              value={projectLabel}
              onChange={(e) => setProjectLabel(e.target.value)}
              placeholder="e.g. Design, Backend…"
              disabled={!canEdit}
              className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:bg-white dark:focus:bg-gray-700 transition-all"
              id="task-project-label"
            />
            {/* Color picker */}
            <div className="flex items-center gap-1.5">
              {COLOR_ENTRIES.map(([name, hex]) => (
                <button
                  key={name}
                  className={`w-5 h-5 rounded-full transition-transform ${
                    projectColor === hex ? 'ring-2 ring-offset-1 ring-gray-400 dark:ring-gray-300 dark:ring-offset-gray-800 scale-110' : 'hover:scale-110'
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
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
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
                      ? 'bg-violet-100 text-violet-700 ring-1 ring-violet-300 dark:bg-violet-950 dark:text-violet-300 dark:ring-violet-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
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
