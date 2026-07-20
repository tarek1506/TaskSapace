"use client"

import * as React from "react"
import { format } from "date-fns"
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover"

interface DatePickerProps {
  value?: string
  onChange: (date: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
  showTime?: boolean
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  className,
  id,
  showTime,
}: DatePickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(undefined)
  const [timeStr, setTimeStr] = React.useState("09:00")
  const [open, setOpen] = React.useState(false)
  const [viewDate, setViewDate] = React.useState(() => value ? new Date(value) : new Date())

  React.useEffect(() => {
    if (value) {
      const d = new Date(value)
      setDate(d)
      setViewDate(d)
      if (showTime) {
        setTimeStr(format(d, "HH:mm"))
      }
    } else {
      setDate(undefined)
      if (showTime) setTimeStr("09:00")
    }
  }, [value, showTime])

  const emitChange = (selectedDate: Date, time: string) => {
    if (showTime) {
      const [h, m] = time.split(':').map(Number)
      selectedDate.setHours(h, m, 0, 0)
      onChange(format(selectedDate, "yyyy-MM-dd'T'HH:mm"))
    } else {
      onChange(format(selectedDate, "yyyy-MM-dd"))
    }
  }

  const handleSelect = (selectedDate: Date) => {
    setDate(selectedDate)
    if (showTime) {
      emitChange(selectedDate, timeStr)
    } else {
      onChange(format(selectedDate, "yyyy-MM-dd"))
      setOpen(false)
    }
  }

  const displayValue = () => {
    if (!date) return null
    if (showTime) {
      const [h, m] = timeStr.split(':').map(Number)
      const ampm = h >= 12 ? 'PM' : 'AM'
      const h12 = h % 12 || 12
      return format(date, "PPP") + ` ${h12}:${String(m).padStart(2, '0')} ${ampm}`
    }
    return format(date, "PPP")
  }

  const goToPrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))
  }

  const getDaysInMonth = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDay = firstDay.getDay()

    const days: (number | null)[] = []
    
    for (let i = 0; i < startDay; i++) {
      days.push(null)
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }
    
    return days
  }

  const isToday = (day: number) => {
    const today = new Date()
    return day === today.getDate() && 
           viewDate.getMonth() === today.getMonth() && 
           viewDate.getFullYear() === today.getFullYear()
  }

  const isSelected = (day: number) => {
    return date && 
           day === date.getDate() && 
           viewDate.getMonth() === date.getMonth() && 
           viewDate.getFullYear() === date.getFullYear()
  }

  const isPastDate = (day: number) => {
    const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return d < today
  }

  const monthName = viewDate.toLocaleString("default", { month: "long" })
  const year = viewDate.getFullYear()
  const days = getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth())
  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between text-left font-normal h-10 px-3 bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-900"
            disabled={disabled}
            id={id}
          >
            <span className={date ? "text-gray-900" : "text-gray-400"}>
              {displayValue() || placeholder}
            </span>
            <ChevronDownIcon className="h-4 w-4 text-gray-400" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3 bg-white border border-gray-200 shadow-lg rounded-xl max-h-[calc(100vh-2rem)] overflow-y-auto scrollbar-thin" align="start">
          <div style={{ minWidth: "280px" }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={goToPrevMonth}
                className="h-7 w-7 p-0 bg-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg flex items-center justify-center transition-colors"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium text-gray-900">
                {monthName} {year}
              </span>
              <button
                onClick={goToNextMonth}
                className="h-7 w-7 p-0 bg-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg flex items-center justify-center transition-colors"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {weekDays.map((day) => (
                <div key={day} className="h-6 flex items-center justify-center text-[10px] text-gray-400 uppercase">
                  {day}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {days.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="h-8" />
                }

                const selected = isSelected(day)
                const today = isToday(day)
                const past = isPastDate(day)

                return (
                  <button
                    key={day}
                    onClick={() => !past && handleSelect(new Date(viewDate.getFullYear(), viewDate.getMonth(), day))}
                    disabled={past}
                    className={`
                      h-8 w-8 p-0 flex items-center justify-center text-sm rounded-lg transition-colors
                      ${selected 
                        ? "bg-violet-600 text-white hover:bg-violet-700" 
                        : today 
                          ? "bg-gray-100 text-gray-900" 
                          : past 
                            ? "text-gray-300 cursor-not-allowed" 
                            : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      }
                    `}
                  >
                    {day}
                  </button>
                )
              })}
            </div>

            {showTime && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs text-gray-500 font-medium">Time</span>
                  <span className="text-xs font-semibold text-gray-900">{timeStr}</span>
                </div>
                <div className="flex gap-2">
                  {/* Hours */}
                  <div className="flex-1">
                    <div className="text-[10px] text-gray-400 font-medium mb-0.5 text-center">Hour</div>
                    <div className="h-24 overflow-y-auto scrollbar-thin rounded-lg border border-gray-100 bg-gray-50/50">
                      {Array.from({ length: 24 }, (_, i) => i).map(h => {
                        const hStr = String(h).padStart(2, '0')
                        const active = timeStr.split(':')[0] === hStr
                        return (
                          <button
                            key={h}
                            type="button"
                            onClick={() => {
                              const newTime = `${hStr}:${timeStr.split(':')[1] || '00'}`
                              setTimeStr(newTime)
                              if (date) emitChange(date, newTime)
                            }}
                            className={cn(
                              'w-full h-7 flex items-center justify-center text-[11px] transition-colors',
                              active
                                ? 'bg-violet-600 text-white font-semibold'
                                : 'text-gray-600 hover:bg-gray-100'
                            )}
                          >
                            {hStr}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  {/* Minutes */}
                  <div className="flex-1">
                    <div className="text-[10px] text-gray-400 font-medium mb-0.5 text-center">Min</div>
                    <div className="h-24 overflow-y-auto scrollbar-thin rounded-lg border border-gray-100 bg-gray-50/50">
                      {Array.from({ length: 12 }, (_, i) => i * 5).map(m => {
                        const mStr = String(m).padStart(2, '0')
                        const active = timeStr.split(':')[1] === mStr
                        return (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              const newTime = `${timeStr.split(':')[0] || '09'}:${mStr}`
                              setTimeStr(newTime)
                              if (date) emitChange(date, newTime)
                            }}
                            className={cn(
                              'w-full h-7 flex items-center justify-center text-[11px] transition-colors',
                              active
                                ? 'bg-violet-600 text-white font-semibold'
                                : 'text-gray-600 hover:bg-gray-100'
                            )}
                          >
                            {mStr}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
