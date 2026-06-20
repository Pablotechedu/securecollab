import { useState, useEffect, useCallback } from 'react'
import { getSocket, disconnectSocket } from '../services/socket'
import useAuthStore from '../store/authStore'
import api from '../services/api'

export interface Notification {
  id: string
  type: 'task:created' | 'task:updated' | 'task:status_changed' | 'task:deleted' | 'comment:created' | 'org.invite'
  message: string
  projectId?: string
  timestamp: number
  read: boolean
  // invitation-specific
  invitationId?: string
  orgId?: string
  orgName?: string
  role?: string
}

const MAX_NOTIFICATIONS = 50

function persistedToNotification(n: {
  _id: string
  type: string
  read: boolean
  data: Record<string, string>
  createdAt: string
}): Notification {
  const base: Notification = {
    id: n._id,
    type: n.type as Notification['type'],
    message: '',
    timestamp: new Date(n.createdAt).getTime(),
    read: n.read,
  }
  if (n.type === 'org.invite') {
    base.message = `You've been invited to ${n.data.orgName ?? 'an organization'} as ${n.data.role ?? 'member'}`
    base.invitationId = n.data.invitationId
    base.orgId = n.data.orgId
    base.orgName = n.data.orgName
    base.role = n.data.role
  }
  return base
}

export function useNotifications(projectId?: string) {
  const user = useAuthStore((s) => s.user)
  const [notifications, setNotifications] = useState<Notification[]>([])

  const addNotification = useCallback(
    (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
      setNotifications((prev) => [
        { ...n, id: crypto.randomUUID(), timestamp: Date.now(), read: false },
        ...prev.slice(0, MAX_NOTIFICATIONS - 1),
      ])
    },
    [],
  )

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    api.patch('/notifications/read-all').catch(() => {})
  }, [])

  const clearAll = useCallback(() => setNotifications([]), [])

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const acceptInvite = useCallback(async (invitationId: string, notificationId: string) => {
    await api.post(`/invitations/${invitationId}/accept`)
    dismissNotification(notificationId)
  }, [dismissNotification])

  const rejectInvite = useCallback(async (invitationId: string, notificationId: string) => {
    await api.post(`/invitations/${invitationId}/reject`)
    dismissNotification(notificationId)
  }, [dismissNotification])

  // Load persisted notifications (org invites, etc.) on mount
  useEffect(() => {
    if (!user) return
    api.get<{ notifications: Array<{ _id: string; type: string; read: boolean; data: Record<string, string>; createdAt: string }> }>('/notifications')
      .then(({ data }) => {
        const parsed = data.notifications.map(persistedToNotification)
        setNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => n.id))
          return [...parsed.filter((n) => !existingIds.has(n.id)), ...prev].slice(0, MAX_NOTIFICATIONS)
        })
      })
      .catch(() => {})
  }, [user])

  useEffect(() => {
    if (!user) return

    let sock: ReturnType<typeof getSocket>
    try {
      sock = getSocket()
    } catch {
      return
    }

    if (projectId) sock.emit('join:project', projectId)

    function onTaskCreated(payload: { projectId: string; actorId: string; title?: string }) {
      if (payload.actorId === user!._id) return
      addNotification({ type: 'task:created', message: 'New task created', projectId: payload.projectId })
    }
    function onTaskUpdated(payload: { projectId: string; actorId: string }) {
      if (payload.actorId === user!._id) return
      addNotification({ type: 'task:updated', message: 'Task updated', projectId: payload.projectId })
    }
    function onTaskStatusChanged(payload: { projectId: string; actorId: string; status: string }) {
      if (payload.actorId === user!._id) return
      addNotification({
        type: 'task:status_changed',
        message: `Task moved to ${payload.status.replace('_', ' ')}`,
        projectId: payload.projectId,
      })
    }
    function onTaskDeleted(payload: { projectId: string; actorId: string }) {
      if (payload.actorId === user!._id) return
      addNotification({ type: 'task:deleted', message: 'A task was deleted', projectId: payload.projectId })
    }
    function onCommentCreated(payload: { projectId: string; actorId: string }) {
      if (payload.actorId === user!._id) return
      addNotification({ type: 'comment:created', message: 'New comment posted', projectId: payload.projectId })
    }
    function onNotificationNew(payload: { _id: string; type: string; read: boolean; data: Record<string, string>; createdAt: string }) {
      const n = persistedToNotification(payload)
      setNotifications((prev) => {
        if (prev.some((existing) => existing.id === n.id)) return prev
        return [n, ...prev.slice(0, MAX_NOTIFICATIONS - 1)]
      })
    }

    sock.on('task:created', onTaskCreated)
    sock.on('task:updated', onTaskUpdated)
    sock.on('task:status_changed', onTaskStatusChanged)
    sock.on('task:deleted', onTaskDeleted)
    sock.on('comment:created', onCommentCreated)
    sock.on('notification:new', onNotificationNew)

    return () => {
      if (projectId) sock.emit('leave:project', projectId)
      sock.off('task:created', onTaskCreated)
      sock.off('task:updated', onTaskUpdated)
      sock.off('task:status_changed', onTaskStatusChanged)
      sock.off('task:deleted', onTaskDeleted)
      sock.off('comment:created', onCommentCreated)
      sock.off('notification:new', onNotificationNew)
    }
  }, [user, projectId, addNotification])

  useEffect(() => {
    if (!user) disconnectSocket()
  }, [user])

  const unreadCount = notifications.filter((n) => !n.read).length

  return { notifications, unreadCount, markAllRead, clearAll, acceptInvite, rejectInvite }
}
