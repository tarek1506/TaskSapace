import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute, PublicRoute } from '@/components/guards/RouteGuard'
import { WorkspaceLayout } from '@/components/layout/WorkspaceLayout'
import { LoginPage } from '@/pages/LoginPage'
import { SignupPage } from '@/pages/SignupPage'
import { WorkspacesPage } from '@/pages/WorkspacesPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { TasksPage } from '@/pages/TasksPage'
import { TaskDetailPage } from '@/pages/TaskDetailPage'
import { MembersPage } from '@/pages/MembersPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { CalendarPage } from '@/pages/CalendarPage'
import { TimelinePage } from '@/pages/TimelinePage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={
            <PublicRoute><LoginPage /></PublicRoute>
          } />
          <Route path="/signup" element={
            <PublicRoute><SignupPage /></PublicRoute>
          } />

          {/* Protected: workspace selector */}
          <Route path="/workspaces" element={
            <ProtectedRoute><WorkspacesPage /></ProtectedRoute>
          } />

          {/* Protected: workspace routes */}
          <Route path="/workspace/:id" element={
            <ProtectedRoute><WorkspaceLayout /></ProtectedRoute>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="tasks/:taskId" element={<TaskDetailPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="timeline" element={<TimelinePage />} />
            <Route path="members" element={<MembersPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* Profile route outside workspace */}
          <Route path="/profile" element={
            <ProtectedRoute><ProfilePage /></ProtectedRoute>
          } />

          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/workspaces" replace />} />
          <Route path="*" element={<Navigate to="/workspaces" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
