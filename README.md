# TaskSpace — Team Workspace & Task Manager

A Notion-lite multi-tenant workspace app built with **React + TypeScript**, **Tailwind CSS**, and **Supabase**.

---

## ✨ Features

- **Multi-tenant workspaces** — Create / join multiple workspaces
- **Role-based access** — Owner vs Member with 6 granular permission toggles per user
- **Task management** — List view + Kanban board, status, due date, project labels
- **Real-time comments** — Threaded comments with live Supabase subscription
- **Invite members** — Owner sets email + temporary password; member forced to change on first login
- **Responsive sidebar** — Collapses on mobile, active-state nav items
- **Dashboard** — Stat cards, productivity chart, team widget

---

## 🚀 Quick Start

### 1. Install

```bash
npm install
```

### 2. Configure Supabase

Copy the env example and fill in your Supabase project credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Set up the database

In your **Supabase SQL Editor**, run the migrations in order:

1. `supabase/migrations/001_schema.sql` — Tables + trigger
2. `supabase/migrations/002_rls_policies.sql` — Row Level Security

### 4. Run dev server

```bash
npm run dev
```

---

## 📁 Project Structure

```
src/
├── components/
│   ├── guards/         RouteGuard (ProtectedRoute, PublicRoute)
│   ├── layout/         Sidebar, WorkspaceLayout, TopHeader
│   ├── tasks/          TaskRow, TaskModal, CommentThread
│   └── ui/             Button, Input, Card, Modal, Avatar, Badge, Switch
├── contexts/           AuthContext (Supabase auth)
├── lib/                supabase.ts, utils.ts
├── pages/              Login, Signup, Workspaces, Dashboard, Tasks, TaskDetail, Members, Settings
└── types/              All TypeScript interfaces

supabase/migrations/
├── 001_schema.sql      Tables + auto-profile trigger
└── 002_rls_policies.sql  Row Level Security policies
```

---

## 🗄️ Database Schema

| Table | Key Columns |
|-------|-------------|
| `profiles` | `id`, `email`, `full_name` |
| `workspaces` | `id`, `name`, `owner_id` |
| `workspace_members` | `workspace_id`, `user_id`, `role`, 6x `can_*` flags |
| `tasks` | `title`, `status`, `due_date`, `project_label`, `assigned_to[]` |
| `task_comments` | `task_id`, `user_id`, `content` |

---

## 🔐 Permissions

| Permission | Description |
|-----------|-------------|
| `can_create_task` | Create new tasks |
| `can_edit_task` | Edit own/assigned tasks |
| `can_delete_task` | Delete own tasks |
| `can_assign_task` | Assign tasks to members |
| `can_view_all_tasks` | See all workspace tasks |
| `can_edit_others_tasks` | Edit any task |

Enforced both client-side and via Supabase RLS.

---

## ⚙️ Production Notes

- **Inviting users**: In production, use a **Supabase Edge Function** with the Admin API (`supabase.auth.admin.createUser`) instead of exposing credentials on the client.
- **Force password change**: The `must_change_password` flag is stored on `workspace_members`; add a post-login redirect to enforce this.
