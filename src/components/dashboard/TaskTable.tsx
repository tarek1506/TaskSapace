import { useState } from 'react'
import { Check, Plus, GripVertical } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import type { Task, TaskStatus } from '@/types'

interface TaskTableProps {
  tasks: Task[]
  onNewTask?: () => void
  onTaskClick?: (task: Task) => void
}

type Priority = 'high' | 'medium' | 'low'

const PRIORITY_COLORS: Record<Priority, string> = {
  high: 'text-red-500',
  medium: 'text-amber-500',
  low: 'text-green-500',
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: string; textColor: string; bg: string }> = {
  done: { label: 'Finish', icon: '✓', textColor: 'text-green-700', bg: 'bg-green-50' },
  in_progress: { label: 'In Progress', icon: '⟳', textColor: 'text-blue-700', bg: 'bg-blue-50' },
  todo: { label: 'Pending', icon: '○', textColor: 'text-amber-700', bg: 'bg-amber-50' },
}

const COLUMNS = [
  { id: 'check', label: '', icon: null },
  { id: 'task', label: 'Task', icon: '☐' },
  { id: 'id', label: '#', icon: '#' },
  { id: 'category', label: 'Category', icon: '⊙' },
  { id: 'assigned', label: 'Assigned', icon: '👤' },
  { id: 'due', label: 'Due Date', icon: '📅' },
  { id: 'priority', label: 'Priority', icon: '🚩' },
  { id: 'status', label: 'Status', icon: '◉' },
]

const SAMPLE_NAMES = ['Alex Chen', 'Sarah Kim', 'Mike Liu', 'Emma Wilson', 'James Park', 'Lisa Wang', 'David Lee', 'Anna Zhao']

function getRandomAssignee(): { initials: string; name: string; color: string } {
  const COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500', 'bg-cyan-500']
  const name = SAMPLE_NAMES[Math.floor(Math.random() * SAMPLE_NAMES.length)]
  const initials = name.split(' ').map(n => n[0]).join('')
  const color = COLORS[Math.floor(Math.random() * COLORS.length)]
  return { initials, name, color }
}

interface RowData {
  id: string
  title: string
  done: boolean
  category: string
  assignee: { initials: string; name: string; color: string }
  dueDate: string | null
  priority: Priority
  status: TaskStatus
}

const SAMPLE_TASKS: RowData[] = [
  { id: 'T-1001', title: 'Design system color palette update', done: false, category: 'Design', assignee: getRandomAssignee(), dueDate: '2026-07-20', priority: 'high', status: 'in_progress' },
  { id: 'T-1002', title: 'User authentication flow implementation', done: false, category: 'Frontend', assignee: getRandomAssignee(), dueDate: '2026-07-22', priority: 'high', status: 'in_progress' },
  { id: 'T-1003', title: 'API rate limiting middleware', done: false, category: 'Backend', assignee: getRandomAssignee(), dueDate: '2026-07-19', priority: 'medium', status: 'todo' },
  { id: 'T-1004', title: 'Sprint planning documentation', done: true, category: 'Marketing', assignee: getRandomAssignee(), dueDate: '2026-07-15', priority: 'low', status: 'done' },
  { id: 'T-1005', title: 'Database migration for v2 schema', done: false, category: 'DevOps', assignee: getRandomAssignee(), dueDate: '2026-07-25', priority: 'high', status: 'todo' },
  { id: 'T-1006', title: 'Mobile responsive nav component', done: false, category: 'Frontend', assignee: getRandomAssignee(), dueDate: '2026-07-21', priority: 'medium', status: 'in_progress' },
  { id: 'T-1007', title: 'Weekly team sync notes', done: true, category: 'Research', assignee: getRandomAssignee(), dueDate: '2026-07-14', priority: 'low', status: 'done' },
  { id: 'T-1008', title: 'Load testing infrastructure setup', done: false, category: 'DevOps', assignee: getRandomAssignee(), dueDate: '2026-07-28', priority: 'medium', status: 'todo' },
]

export function TaskTable({ tasks: _tasks, onNewTask, onTaskClick }: TaskTableProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  const [rows, setRows] = useState<RowData[]>(SAMPLE_TASKS)

  const toggleDone = (id: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, done: !r.done } : r))
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        {/* Column Headers */}
        <thead>
          <tr className="text-left">
            {COLUMNS.map(col => (
              <th
                key={col.id}
                className={cn(
                  'px-3 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider',
                  col.id === 'check' ? 'w-10' : '',
                  col.id === 'task' ? 'w-1/3 min-w-[200px]' : '',
                  col.id === 'assigned' ? 'w-[140px]' : '',
                  col.id === 'due' ? 'w-[100px]' : '',
                  col.id === 'priority' ? 'w-[80px]' : '',
                  col.id === 'status' ? 'w-[120px]' : '',
                  col.id === 'category' ? 'w-[90px]' : '',
                  col.id === 'id' ? 'w-[70px]' : ''
                )}
              >
                <div className="flex items-center gap-1">
                  {col.icon && <span className="text-[10px]">{col.icon}</span>}
                  <span>{col.label}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {rows.map(row => (
            <tr
              key={row.id}
              className="task-row-hover cursor-pointer border-b border-gray-50 group"
              onMouseEnter={() => setHoveredRow(row.id)}
              onMouseLeave={() => setHoveredRow(null)}
              onClick={() => onTaskClick?.(row as any)}
            >
              {/* Checkbox */}
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-1">
                  {/* Drag handle - appears on hover */}
                  <span className={cn(
                    'text-gray-300 text-xs select-none transition-opacity',
                    hoveredRow === row.id ? 'opacity-100' : 'opacity-0'
                  )}>
                    <GripVertical size={12} />
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleDone(row.id) }}
                    className={cn(
                      'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                      row.done
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-gray-300 hover:border-blue-400'
                    )}
                  >
                    {row.done && <Check size={9} className="text-white" />}
                  </button>
                </div>
              </td>

              {/* Task Title */}
              <td className="px-3 py-2.5">
                <span className={cn(
                  'text-sm font-medium text-gray-900',
                  row.done && 'line-through text-gray-400'
                )}>
                  {row.title}
                </span>
              </td>

              {/* ID */}
              <td className="px-3 py-2.5">
                <span className="text-xs text-gray-400">{row.id}</span>
              </td>

              {/* Category */}
              <td className="px-3 py-2.5">
                <span className="text-sm text-gray-600">{row.category}</span>
              </td>

              {/* Assigned */}
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  <div className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0', row.assignee.color)}>
                    {row.assignee.initials}
                  </div>
                  <span className="text-sm text-gray-600 truncate">{row.assignee.name}</span>
                </div>
              </td>

              {/* Due Date */}
              <td className="px-3 py-2.5">
                {row.dueDate && (
                  <span className="text-sm text-gray-500">{formatDate(row.dueDate)}</span>
                )}
              </td>

              {/* Priority */}
              <td className="px-3 py-2.5">
                <span className={cn('text-sm font-medium', PRIORITY_COLORS[row.priority])}>
                  {row.priority.charAt(0).toUpperCase() + row.priority.slice(1)}
                </span>
              </td>

              {/* Status */}
              <td className="px-3 py-2.5">
                <span className={cn(
                  'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                  STATUS_CONFIG[row.status].bg,
                  STATUS_CONFIG[row.status].textColor
                )}>
                  <span>{STATUS_CONFIG[row.status].icon}</span>
                  <span>{STATUS_CONFIG[row.status].label}</span>
                </span>
              </td>
            </tr>
          ))}

          {/* New Row */}
          <tr>
            <td colSpan={8} className="px-3 py-2">
              <button
                onClick={onNewTask}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 py-2 px-1 rounded-lg hover:bg-gray-50 transition-colors w-full"
              >
                <Plus size={14} />
                <span>New</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
