export interface User {
  _id: string
  email: string
  name: string
  role: 'super_admin' | 'user'
  isActive: boolean
  createdAt: string
}

export interface OrgMember {
  userId: string
  role: 'org_admin' | 'member'
}

export interface Organization {
  _id: string
  name: string
  description?: string
  ownerId: string
  members: OrgMember[]
  createdAt: string
}

export interface ProjectMember {
  userId: string
  role: 'project_admin' | 'developer' | 'viewer'
}

export interface Project {
  _id: string
  name: string
  description?: string
  orgId: string
  visibility: 'private' | 'internal'
  members: ProjectMember[]
  status: 'active' | 'archived'
  createdAt: string
}

export type TaskStatus = 'backlog' | 'in_progress' | 'review' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'

export interface Task {
  _id: string
  title: string
  description?: string
  projectId: string
  assigneeId?: string | null
  reporterId: string
  status: TaskStatus
  priority: TaskPriority
  sensitive: boolean
  dueDate?: string | null
  createdAt: string
  updatedAt: string
}

export interface Comment {
  _id: string
  taskId: string
  authorId: string
  body: string
  createdAt: string
  editedAt?: string | null
}

export interface MemberWithUser {
  userId: string
  name: string
  email: string
  role: 'org_admin' | 'member' | 'project_admin' | 'developer' | 'viewer'
}

export interface AuditLogEntry {
  _id: string
  action: string
  actorId: string | null
  resourceType: string | null
  resourceId: string | null
  metadata: Record<string, unknown>
  ip: string
  timestamp: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: User
}

export interface ApiError {
  message: string
  errors?: Record<string, string>[]
}
