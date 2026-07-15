import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-violet-600 text-white hover:bg-violet-700 shadow-md shadow-violet-200 hover:shadow-lg hover:shadow-violet-200 active:scale-95',
        secondary:
          'bg-white text-violet-700 border border-violet-200 hover:bg-violet-50 hover:border-violet-300',
        ghost:
          'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
        danger:
          'bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-100',
        outline:
          'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
      },
      size: {
        sm: 'text-xs px-3 py-1.5 rounded-full',
        md: 'text-sm px-4 py-2 rounded-full',
        lg: 'text-sm px-6 py-2.5 rounded-full',
        icon: 'p-2 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
