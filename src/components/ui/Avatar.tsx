import React from 'react'
import { cn, getInitials, getAvatarColor } from '@/lib/utils'
import type { MemberProfile } from '@/types'

interface AvatarProps {
  user?: MemberProfile | null
  email?: string
  name?: string
  src?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  xs: 'w-5 h-5 text-[10px]',
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
}

export function Avatar({ user, email, name, src, size = 'md', className }: AvatarProps) {
  const displayName = user?.name || name || user?.email || email || ''
  const initials = getInitials(displayName)
  const color = user?.avatar_color || getAvatarColor(displayName)
  const imageUrl = src || user?.avatar_url

  // Show image if available
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={displayName}
        className={cn(
          'rounded-full ring-2 ring-white flex-shrink-0 object-cover',
          sizeMap[size],
          className
        )}
        title={displayName}
        onError={(e) => {
          // Fallback to initials if image fails to load
          const target = e.target as HTMLImageElement
          target.style.display = 'none'
          const parent = target.parentElement
          if (parent) {
            parent.style.backgroundColor = color
            parent.innerHTML = initials
          }
        }}
      />
    )
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold text-white ring-2 ring-white flex-shrink-0',
        sizeMap[size],
        className
      )}
      style={{ backgroundColor: color }}
      title={displayName}
    >
      {initials}
    </div>
  )
}

interface AvatarGroupProps {
  members: (MemberProfile | { user_id: string; email: string; name: string })[]
  max?: number
  size?: 'xs' | 'sm' | 'md'
  className?: string
}

export function AvatarGroup({ members, max = 3, size = 'sm', className }: AvatarGroupProps) {
  const visible = members.slice(0, max)
  const extra = members.length - max

  return (
    <div className={cn('flex avatar-overlap', className)}>
      {visible.map((m) => (
        <Avatar
          key={m.user_id}
          email={m.email}
          name={m.name}
          size={size}
          className="ring-2 ring-white"
        />
      ))}
      {extra > 0 && (
        <div
          className={cn(
            'rounded-full flex items-center justify-center font-semibold text-white ring-2 ring-white bg-gray-400 flex-shrink-0',
            sizeMap[size]
          )}
        >
          +{extra}
        </div>
      )}
    </div>
  )
}
