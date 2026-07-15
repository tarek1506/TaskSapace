import { useState } from 'react'
import { Paperclip, Check } from 'lucide-react'
import { cn, formatDate, isOverdue } from '@/lib/utils'
import { AvatarGroup } from '@/components/ui/Avatar'
import { ProjectPill } from '@/components/ui/Badge'
import type { Task } from '@/types'

interface TaskRowProps {
  task: Task
  onClick?: (task: Task) => void
  onStatusChange?: (task: Task, done: boolean) => void
  className?: string
}

export function TaskRow({ task, onClick, onStatusChange, className }: TaskRowProps) {
  const [hovered, setHovered] = useState(false)
  const isDone = task.status === 'done'
  const overdue = isOverdue(task.due_date) && !isDone

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl task-row-hover cursor-pointer group',
        isDone && 'opacity-60',
        className
      )}
      onClick={() => onClick?.(task)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.(task)}
      id={`task-row-${task.id}`}
    >
      {/* Checkbox */}
      <button
        className={cn(
          'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200',
          isDone
            ? 'bg-violet-600 border-violet-600'
            : hovered
            ? 'border-violet-400'
            : 'border-gray-300'
        )}
        onClick={(e) => {
          e.stopPropagation()
          onStatusChange?.(task, !isDone)
        }}
        id={`checkbox-${task.id}`}
        aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}
      >
        {isDone && <Check size={12} className="text-white" />}
      </button>

      {/* Title */}
      <span
        className={cn(
          'flex-1 text-sm font-medium text-gray-800 truncate',
          isDone && 'line-through text-gray-400'
        )}
      >
        {task.title}
      </span>

      {/* Due date */}
      {task.due_date && (
        <span
          className={cn(
            'text-xs font-medium hidden sm:block',
            overdue ? 'text-red-500' : 'text-gray-400'
          )}
        >
          {formatDate(task.due_date)}
        </span>
      )}

      {/* Attachment count */}
      <div className="flex items-center gap-1 text-gray-400 text-xs">
        <Paperclip size={13} />
        <span>{task.comments_count ?? 0}</span>
      </div>

      {/* Assignees */}
      {task.assignees && task.assignees.length > 0 && (
        <AvatarGroup
          members={task.assignees}
          max={3}
          size="xs"
        />
      )}

      {/* Project pill */}
      {task.project_label && task.project_color && (
        <ProjectPill
          label={task.project_label}
          color={task.project_color}
        />
      )}
    </div>
  )
}
