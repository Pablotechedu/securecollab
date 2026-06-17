import DOMPurify from 'dompurify'

// Strip all HTML/JS markup from text before sending to the API.
export function sanitizeText(value: string): string {
  return DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim()
}
