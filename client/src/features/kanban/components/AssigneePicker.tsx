import { useState, useRef, useEffect } from 'react'
import type { MemberWithUser } from '../../../types'

interface Props {
  members: MemberWithUser[]
  assigneeId: string | null | undefined
  disabled?: boolean
  onChange: (userId: string | null) => void
}

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function AssigneePicker({
  members,
  assigneeId,
  disabled,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const assigned = members.find((m) => m.userId === assigneeId)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(userId: string | null) {
    onChange(userId)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
          open ? 'ring-2 ring-indigo-500' : ''
        }`}
      >
        {assigned ? (
          <>
            <span
              aria-hidden="true"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-semibold shrink-0"
            >
              {initials(assigned.name)}
            </span>
            <span className="text-gray-800 truncate max-w-[120px]">
              {assigned.name}
            </span>
          </>
        ) : (
          <>
            <span
              aria-hidden="true"
              className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-dashed border-gray-300 text-gray-400 text-xs shrink-0"
            >
              ?
            </span>
            <span className="text-gray-400">Unassigned</span>
          </>
        )}
        <svg
          className="h-3.5 w-3.5 text-gray-400 ml-0.5"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Select assignee"
          className="absolute z-30 mt-1 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-1 max-h-60 overflow-y-auto"
        >
          <li
            role="option"
            aria-selected={assigneeId == null}
            onClick={() => handleSelect(null)}
            className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 text-sm ${
              assigneeId == null ? 'bg-indigo-50' : ''
            }`}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-dashed border-gray-300 text-gray-400 text-xs shrink-0">
              ?
            </span>
            <span className="text-gray-500">Unassigned</span>
            {assigneeId == null && (
              <svg
                className="h-4 w-4 text-indigo-600 ml-auto"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </li>

          {members.map((m) => (
            <li
              key={m.userId}
              role="option"
              aria-selected={assigneeId === m.userId}
              onClick={() => handleSelect(m.userId)}
              className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 text-sm ${
                assigneeId === m.userId ? 'bg-indigo-50' : ''
              }`}
            >
              <span
                aria-hidden="true"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-semibold shrink-0"
              >
                {initials(m.name)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 font-medium truncate">{m.name}</p>
                <p className="text-gray-400 text-xs truncate">{m.role}</p>
              </div>
              {assigneeId === m.userId && (
                <svg
                  className="h-4 w-4 text-indigo-600 ml-auto shrink-0"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
