import axios from 'axios'

interface Props {
  error: unknown
}

interface ApiValidationError {
  message?: string
  field?: string
}

export default function ErrorMessage({ error }: Props) {
  if (!axios.isAxiosError(error)) {
    return (
      <div
        role="alert"
        className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
      >
        An unexpected error occurred.
      </div>
    )
  }

  const status = error.response?.status
  const data = error.response?.data as {
    message?: string
    errors?: ApiValidationError[]
  }
  const retryAfter = error.response?.headers?.['retry-after']

  if (status === 401) {
    return (
      <div
        role="alert"
        className="rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800"
      >
        Session expired, please log in.
      </div>
    )
  }

  if (status === 403) {
    return (
      <div
        role="alert"
        className="rounded-lg bg-orange-50 border border-orange-200 px-4 py-3 text-sm text-orange-800"
      >
        You don&apos;t have permission to do that.
      </div>
    )
  }

  if (status === 429) {
    const seconds = retryAfter ? ` Try again in ${retryAfter} seconds.` : ''
    return (
      <div
        role="alert"
        className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
      >
        Too many requests.{seconds}
      </div>
    )
  }

  if (status === 422 && data?.errors?.length) {
    return (
      <div
        role="alert"
        className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 space-y-1"
      >
        {data.errors.map((e, i) => (
          <p key={i}>{e.message ?? JSON.stringify(e)}</p>
        ))}
      </div>
    )
  }

  return (
    <div
      role="alert"
      className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
    >
      {data?.message ?? error.message ?? 'Something went wrong.'}
    </div>
  )
}
