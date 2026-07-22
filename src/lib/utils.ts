import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Returns initials from a name or email */
export function getInitials(nameOrEmail: string): string {
  if (!nameOrEmail) return '?'
  const parts = nameOrEmail.split(/[\s@]+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/** Generates a deterministic background color from a string */
export function getAvatarColor(str: string): string {
  const colors = [
    '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6',
    '#EF4444', '#06B6D4', '#6366F1', '#14B8A6', '#F97316',
  ]
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

/** Safely parse an ISO or date string without timezone shift bugs */
export function parseIsoDate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const str = iso.trim()
  // Pure date YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-').map(Number)
    return new Date(y, m - 1, d, 12, 0, 0)
  }
  // Midnight UTC string from date-only column (e.g. 2026-07-25T00:00:00Z)
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})T00:00:00(?:\.000)?(?:Z|\+00:00)?$/)
  if (match) {
    const y = parseInt(match[1], 10)
    const m = parseInt(match[2], 10)
    const d = parseInt(match[3], 10)
    return new Date(y, m - 1, d, 12, 0, 0)
  }
  const parsed = new Date(str)
  return isNaN(parsed.getTime()) ? null : parsed
}

/** Format ISO date string to readable form */
export function formatDate(iso: string | null): string {
  const d = parseIsoDate(iso)
  if (!d) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Check if a date is overdue */
export function isOverdue(iso: string | null): boolean {
  const d = parseIsoDate(iso)
  if (!d) return false
  return d < new Date()
}

/** Get relative time string */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function formatDateTime(iso: string | null): string {
  const d = parseIsoDate(iso)
  if (!d) return '—'
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined })
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${date} at ${time}`
}
