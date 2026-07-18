// ─── Database Types ────────────────────────────────────────────────────────────

export interface Workspace {
  id: string
  name: string
  owner_id: string
  created_at: string
}

export type MemberRole = 'owner' | 'member'

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: MemberRole
  can_create_task: boolean
  can_edit_task: boolean
  can_delete_task: boolean
  can_assign_task: boolean
  can_view_all_tasks: boolean
  can_edit_others_tasks: boolean
  must_change_password: boolean
  joined_at: string
  // Joined fields
  user_email?: string
  user_name?: string
  user_avatar_url?: string | null
}

export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'high' | 'medium' | 'low' | 'none'

export interface Task {
  id: string
  workspace_id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  deadline: string | null
  project_label: string | null
  project_color: string | null
  assigned_to: string[] // array of user_ids
  created_by: string
  created_at: string
  order_index: number
  // Joined fields
  assignees?: MemberProfile[]
  comments_count?: number
}

export interface TaskComment {
  id: string
  task_id: string
  user_id: string
  content: string
  created_at: string
  // Joined
  user_name?: string
  user_email?: string
}

export interface MemberProfile {
  user_id: string
  email: string
  name: string
  avatar_color: string
  avatar_url?: string | null
}

// ─── UI / App Types ───────────────────────────────────────────────────────────

export interface PermissionFlags {
  can_create_task: boolean
  can_edit_task: boolean
  can_delete_task: boolean
  can_assign_task: boolean
  can_view_all_tasks: boolean
  can_edit_others_tasks: boolean
}

export interface AppUser {
  id: string
  email: string
  name: string
}

export interface WorkspaceWithRole extends Workspace {
  role: MemberRole
  member_count: number
}

export interface TaskFilters {
  status?: TaskStatus | 'all'
  assignee?: string
  project?: string
  search?: string
}

export type ViewMode = 'list' | 'kanban'

export const PROJECT_COLORS: Record<string, string> = {
  teal: '#2DD4BF',
  red: '#F87171',
  purple: '#A78BFA',
  yellow: '#FBBF24',
  blue: '#60A5FA',
  green: '#34D399',
  pink: '#F472B6',
  orange: '#FB923C',
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
}

export const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: '#94A3B8',
  in_progress: '#FBBF24',
  done: '#34D399',
}

export interface AppNotification {
  id: string
  workspace_id: string
  user_id: string
  task_id: string | null
  action_type: 'task_created' | 'task_updated' | 'task_deleted' | 'comment_added'
  details: {
    task_title?: string
    task_id?: string
    status_changed?: boolean
    old_status?: string
    new_status?: string
    title_changed?: boolean
    old_title?: string
    new_title?: string
    comment_preview?: string
  }
  created_at: string
  // Joined fields
  user_name?: string
  user_email?: string
}
