import React from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean
}

export function Card({ className, glass = false, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/80 dark:border-gray-700/80',
        glass
          ? 'glass-card'
          : 'bg-white shadow-sm shadow-gray-100 dark:bg-gray-800 dark:shadow-gray-900/50',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 py-4 border-b border-gray-100 dark:border-gray-700', className)} {...props}>
      {children}
    </div>
  )
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 py-4', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-base font-semibold text-gray-900 dark:text-gray-100', className)} {...props}>
      {children}
    </h3>
  )
}
