import { useEffect, useState } from 'react'
import api from '../../../services/api'
import type { Comment } from '../../../types'

export function useComments(taskId: string) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    if (!taskId) return
    let cancelled = false
    setLoading(true)
    api
      .get<{ comments: Comment[] }>(`/tasks/${taskId}/comments`)
      .then(({ data }) => {
        if (!cancelled) setComments(data.comments)
      })
      .catch((err) => {
        if (!cancelled) setError(err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [taskId])

  async function addComment(body: string): Promise<void> {
    const { data } = await api.post<Comment>(`/tasks/${taskId}/comments`, {
      body,
    })
    setComments((prev) => [...prev, data])
  }

  async function deleteComment(commentId: string): Promise<void> {
    await api.delete(`/comments/${commentId}`)
    setComments((prev) => prev.filter((c) => c._id !== commentId))
  }

  return { comments, loading, error, addComment, deleteComment }
}
