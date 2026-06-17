import { useState, type FormEvent } from 'react'
import DOMPurify from 'dompurify'
import { useComments } from '../hooks/useComments'
import ErrorMessage from '../../../components/ErrorMessage'
import LoadingSpinner from '../../../components/LoadingSpinner'
import useAuthStore from '../../../store/authStore'
import { sanitizeText } from '../../../utils/sanitize'

interface Props {
  taskId: string
  canComment: boolean
}

export default function CommentsPanel({ taskId, canComment }: Props) {
  const { comments, loading, error, addComment, deleteComment } =
    useComments(taskId)
  const currentUser = useAuthStore((s) => s.user)
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<unknown>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setSubmitError(null)
    setSubmitting(true)
    try {
      await addComment(sanitizeText(body))
      setBody('')
    } catch (err) {
      setSubmitError(err)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(commentId: string) {
    if (deleteConfirm !== commentId) {
      setDeleteConfirm(commentId)
      return
    }
    await deleteComment(commentId)
    setDeleteConfirm(null)
  }

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Comments</h3>

      {loading && <LoadingSpinner label="Loading comments" />}
      {error != null && <ErrorMessage error={error} />}

      <div className="space-y-3 mb-4">
        {comments.map((c) => (
          <div key={c._id} className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-600">
                {c.authorId}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {new Date(c.createdAt).toLocaleString()}
                  {c.editedAt && ' (edited)'}
                </span>
                {currentUser && c.authorId === currentUser._id && (
                  <button
                    onClick={() => handleDelete(c._id)}
                    className={`text-xs ${
                      deleteConfirm === c._id
                        ? 'text-red-600 font-semibold'
                        : 'text-gray-400 hover:text-red-500'
                    }`}
                    aria-label={
                      deleteConfirm === c._id
                        ? 'Confirm delete comment'
                        : 'Delete comment'
                    }
                  >
                    {deleteConfirm === c._id ? 'Confirm?' : 'Delete'}
                  </button>
                )}
              </div>
            </div>
            <p
              className="text-sm text-gray-800 whitespace-pre-wrap"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(c.body),
              }}
            />
          </div>
        ))}
      </div>

      {canComment && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Add a comment…"
            maxLength={2000}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            aria-label="New comment"
          />
          {submitError != null && <ErrorMessage error={submitError} />}
          <button
            type="submit"
            disabled={submitting || !body.trim()}
            className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? 'Posting…' : 'Post comment'}
          </button>
        </form>
      )}
    </div>
  )
}
