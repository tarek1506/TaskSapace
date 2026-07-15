import { cn } from '@/lib/utils'

interface ProjectPillProps {
  label: string
  color: string
  size?: 'sm' | 'md'
  className?: string
}

export function ProjectPill({ label, color, size = 'sm', className }: ProjectPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full',
        size === 'sm' ? 'text-xs px-2.5 py-0.5' : 'text-sm px-3 py-1',
        className
      )}
      style={{
        backgroundColor: `${color}20`,
        color: color,
        border: `1px solid ${color}40`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  )
}

interface StatusBadgeProps {
  status: 'todo' | 'in_progress' | 'done'
  className?: string
}

const STATUS_STYLES = {
  todo: { bg: '#F1F5F9', color: '#64748B', label: 'To Do' },
  in_progress: { bg: '#FFFBEB', color: '#D97706', label: 'In Progress' },
  done: { bg: '#F0FDF4', color: '#16A34A', label: 'Done' },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const s = STATUS_STYLES[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-0.5',
        className
      )}
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
      {s.label}
    </span>
  )
}
