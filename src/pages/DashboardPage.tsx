import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  CheckCircle2, Clock, ListTodo, TrendingUp, Plus, ArrowRight, Zap
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { TopHeader } from '@/components/layout/Sidebar'
import { TaskRow } from '@/components/tasks/TaskRow'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Avatar, AvatarGroup } from '@/components/ui/Avatar'
import { ProjectPill } from '@/components/ui/Badge'
import { TaskModal } from '@/components/tasks/TaskModal'
import { formatDate } from '@/lib/utils'
import type { Workspace, WorkspaceMember, Task } from '@/types'

interface OutletCtx {
  workspace: Workspace
  member: WorkspaceMember
  isOwner: boolean
}

// Mock productivity data
const generateChartData = () => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return days.map((day) => ({
    day,
    completed: Math.floor(Math.random() * 8) + 1,
    created: Math.floor(Math.random() * 6) + 2,
  }))
}

export function DashboardPage() {
  const { workspace, member, isOwner } = useOutletContext<OutletCtx>()
  const { user } = useAuth()

  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [chartData] = useState(generateChartData)

  useEffect(() => { fetchData() }, [workspace.id])

  const fetchData = async () => {
    setLoading(true)
    const [tasksRes, membersRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('*')
        .eq('workspace_id', workspace.id)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', workspace.id),
    ])

    setTasks(tasksRes.data || [])
    setMembers(membersRes.data || [])
    setLoading(false)
  }

  const handleStatusChange = async (task: Task, done: boolean) => {
    await supabase
      .from('tasks')
      .update({ status: done ? 'done' : 'todo' })
      .eq('id', task.id)
    fetchData()
  }

  const todoTasks = tasks.filter((t) => t.status === 'todo')
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress')
  const doneTasks = tasks.filter((t) => t.status === 'done')
  const todayTasks = tasks.filter((t) => {
    if (!t.due_date) return false
    const today = new Date().toDateString()
    return new Date(t.due_date).toDateString() === today
  })

  const statCards = [
    {
      label: 'Total Tasks',
      value: tasks.length,
      icon: <ListTodo size={20} className="text-violet-600" />,
      bg: 'bg-violet-50',
      id: 'stat-total',
    },
    {
      label: 'In Progress',
      value: inProgressTasks.length,
      icon: <Clock size={20} className="text-amber-600" />,
      bg: 'bg-amber-50',
      id: 'stat-progress',
    },
    {
      label: 'Completed',
      value: doneTasks.length,
      icon: <CheckCircle2 size={20} className="text-emerald-600" />,
      bg: 'bg-emerald-50',
      id: 'stat-done',
    },
    {
      label: 'Completion Rate',
      value: tasks.length ? `${Math.round((doneTasks.length / tasks.length) * 100)}%` : '0%',
      icon: <TrendingUp size={20} className="text-blue-600" />,
      bg: 'bg-blue-50',
      id: 'stat-rate',
    },
  ]

  const canCreate = isOwner || member.can_create_task

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopHeader
        title={`${workspace.name} — Dashboard`}
        subtitle={`${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`}
        actions={
          canCreate && (
            <Button
              variant="primary"
              size="md"
              onClick={() => setShowTaskModal(true)}
              id="btn-add-task"
            >
              <Plus size={15} /> Add Task
            </Button>
          )
        }
      />

      <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <Card key={s.id} className="fade-in" id={s.id}>
              <CardContent className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                  {s.icon}
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Tasks */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Today's Tasks</CardTitle>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {todayTasks.length} tasks
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-2">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
                  </div>
                ) : todoTasks.length === 0 && inProgressTasks.length === 0 ? (
                  <div className="text-center py-10">
                    <CheckCircle2 size={36} className="text-gray-200 mx-auto mb-3" />
                    <p className="text-sm text-gray-400">All caught up! 🎉</p>
                    {canCreate && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="mt-4"
                        onClick={() => setShowTaskModal(true)}
                        id="btn-add-first-task"
                      >
                        <Plus size={14} /> Add a task
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {[...inProgressTasks, ...todoTasks].slice(0, 8).map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onStatusChange={handleStatusChange}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Productivity Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Productivity</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={120}>
                  <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -30, bottom: 0 }}>
                    <defs>
                      <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '10px',
                        fontSize: 12,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="completed"
                      stroke="#8B5CF6"
                      strokeWidth={2}
                      fill="url(#grad1)"
                      dot={{ r: 3, fill: '#8B5CF6', strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-2">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                    Completed
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Team Members */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Team</CardTitle>
                  <span className="text-xs text-gray-400">{members.length} members</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {members.slice(0, 5).map((m) => (
                  <div key={m.id} className="flex items-center gap-3">
                    <Avatar
                      email={m.user_email || ''}
                      name={m.user_name || m.user_email || ''}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {m.user_name || m.user_email?.split('@')[0]}
                      </p>
                      <p className="text-xs text-gray-400 capitalize">{m.role}</p>
                    </div>
                    {m.role === 'owner' && (
                      <Zap size={13} className="text-violet-500" />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Tasks */}
        {tasks.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Tasks</CardTitle>
                <Button variant="ghost" size="sm" id="btn-view-all-tasks">
                  View all <ArrowRight size={13} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-2">
              <div className="space-y-1">
                {tasks.slice(0, 5).map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <TaskModal
        open={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        workspaceId={workspace.id}
        members={members}
        canEdit={canCreate}
        onSaved={fetchData}
      />
    </div>
  )
}
