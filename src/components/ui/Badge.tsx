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
  todo: { label: 'To Do', lightBg: '#F1F5F9', lightColor: '#64748B', darkClass: 'dark:bg-slate-800 dark:text-slate-200' },
  in_progress: { label: 'In Progress', lightBg: '#FFFBEB', lightColor: '#D97706', darkClass: 'dark:bg-amber-950/70 dark:text-amber-300' },
  done: { label: 'Done', lightBg: '#F0FDF4', lightColor: '#16A34A', darkClass: 'dark:bg-emerald-950/70 dark:text-emerald-300' },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const s = STATUS_STYLES[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-0.5',
        s.darkClass,
        className
      )}
      style={{ backgroundColor: s.lightBg, color: s.lightColor }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'currentColor' }} />
      {s.label}
    </span>
  )
}
