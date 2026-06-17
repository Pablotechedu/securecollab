import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AuthGuard from './features/auth/components/AuthGuard'
import LoginPage from './features/auth/pages/LoginPage'
import RegisterPage from './features/auth/pages/RegisterPage'
import OrgListPage from './features/orgs/pages/OrgListPage'
import OrgMembersPage from './features/orgs/pages/OrgMembersPage'
import ProjectListPage from './features/projects/pages/ProjectListPage'
import KanbanPage from './features/kanban/pages/KanbanPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/orgs"
          element={
            <AuthGuard>
              <OrgListPage />
            </AuthGuard>
          }
        />
        <Route
          path="/orgs/:orgId/members"
          element={
            <AuthGuard>
              <OrgMembersPage />
            </AuthGuard>
          }
        />
        <Route
          path="/orgs/:orgId/projects"
          element={
            <AuthGuard>
              <ProjectListPage />
            </AuthGuard>
          }
        />
        <Route
          path="/orgs/:orgId/projects/:projectId"
          element={
            <AuthGuard>
              <KanbanPage />
            </AuthGuard>
          }
        />

        <Route path="*" element={<Navigate to="/orgs" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
