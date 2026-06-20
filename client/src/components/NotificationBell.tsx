import { useState, useRef, useEffect } from 'react'
import { Bell, PlusCircle, Pencil, ArrowRight, Trash2, MessageCircle, Mail } from 'lucide-react'
import { useNotifications } from '../hooks/useNotifications'
import type { Notification } from '../hooks/useNotifications'

function TypeIcon({ type }: { type: Notification['type'] }) {
  const cls = 'w-4 h-4 shrink-0 mt-0.5'
  switch (type) {
    case 'task:created': return <PlusCircle className={`${cls} text-indigo-500`} />
    case 'task:updated': return <Pencil className={`${cls} text-yellow-500`} />
    case 'task:status_changed': return <ArrowRight className={`${cls} text-blue-500`} />
    case 'task:deleted': return <Trash2 className={`${cls} text-red-500`} />
    case 'comment:created': return <MessageCircle className={`${cls} text-green-500`} />
    case 'org.invite': return <Mail className={`${cls} text-purple-500`} />
  }
}

function InviteActions({
  n,
  acceptInvite,
  rejectInvite,
}: {
  n: Notification
  acceptInvite: (invitationId: string, notificationId: string) => Promise<void>
  rejectInvite: (invitationId: string, notificationId: string) => Promise<void>
}) {
  const [busy, setBusy] = useState<'accept' | 'reject' | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function handle(action: 'accept' | 'reject') {
    if (!n.invitationId) return
    setBusy(action)
    setErr(null)
    try {
      if (action === 'accept') await acceptInvite(n.invitationId, n.id)
      else await rejectInvite(n.invitationId, n.id)
    } catch {
      setErr('Action failed. Try again.')
      setBusy(null)
    }
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <button
        onClick={() => void handle('accept')}
        disabled={busy !== null}
        className="text-xs bg-indigo-600 text-white px-2.5 py-1 rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {busy === 'accept' ? '…' : 'Accept'}
      </button>
      <button
        onClick={() => void handle('reject')}
        disabled={busy !== null}
        className="text-xs text-gray-500 dark:text-gray-400 px-2.5 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        {busy === 'reject' ? '…' : 'Decline'}
      </button>
      {err && <span className="text-xs text-red-500">{err}</span>}
    </div>
  )
}

export default function NotificationBell() {
  const { notifications, unreadCount, markAllRead, clearAll, acceptInvite, rejectInvite } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleOpen() {
    setOpen((v) => {
      if (!v) markAllRead()
      return !v
    })
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        className="relative flex items-center justify-center w-8 h-8 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h3>
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                Clear all
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400 dark:text-gray-500 text-center">
              No notifications yet
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700">
              {notifications.map((n) => (
                <li key={n.id} className={`flex items-start gap-3 px-4 py-3 text-sm ${!n.read ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
                  <TypeIcon type={n.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 dark:text-gray-200">{n.message}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {new Date(n.timestamp).toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {n.type === 'org.invite' && n.invitationId && (
                      <InviteActions n={n} acceptInvite={acceptInvite} rejectInvite={rejectInvite} />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
