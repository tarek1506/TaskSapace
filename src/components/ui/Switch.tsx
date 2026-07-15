import { cn } from '@/lib/utils'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
  id?: string
  className?: string
}

export function Switch({ checked, onChange, label, disabled, id, className }: SwitchProps) {
  return (
    <label
      className={cn('flex items-center gap-3 cursor-pointer', disabled && 'opacity-50 cursor-not-allowed', className)}
      htmlFor={id}
    >
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative w-10 h-5.5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-1',
          checked ? 'bg-violet-600' : 'bg-gray-200'
        )}
        style={{ height: '1.375rem' }}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform duration-200',
            checked ? 'translate-x-4.5' : 'translate-x-0'
          )}
          style={{ width: '1.125rem', height: '1.125rem' }}
        />
      </button>
      {label && <span className="text-sm text-gray-700 select-none">{label}</span>}
    </label>
  )
}

interface PermissionToggleProps {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  id: string
}

export function PermissionToggle({
  label, description, checked, onChange, disabled, id
}: PermissionToggleProps) {
  return (
    <div className={cn(
      'flex items-center justify-between p-3 rounded-xl transition-colors',
      checked ? 'bg-violet-50' : 'bg-gray-50'
    )}>
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <Switch
        id={id}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  )
}
