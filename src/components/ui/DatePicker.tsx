"use client"

import * as React from "react"
import { format } from "date-fns"
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover"

import { parseIsoDate } from "@/lib/utils"

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
  const [hour12, setHour12] = React.useState<number>(12)
  const [minute, setMinute] = React.useState<number>(0)
  const [ampm, setAmPm] = React.useState<'AM' | 'PM'>('PM')
  const [open, setOpen] = React.useState(false)
  const [viewDate, setViewDate] = React.useState(() => parseIsoDate(value) || new Date())

  // Sync internal state from value prop
  React.useEffect(() => {
    if (value) {
      const d = parseIsoDate(value)
      if (d) {
        setDate(d)
        setViewDate(d)
        if (showTime) {
          const h24 = d.getHours()
          const min = d.getMinutes()
          setHour12(h24 % 12 || 12)
          setMinute(min - (min % 5))
          setAmPm(h24 >= 12 ? 'PM' : 'AM')
        }
      }
    } else {
      setDate(undefined)
      if (showTime) {
        setHour12(12)
        setMinute(0)
        setAmPm('PM')
      }
    }
  }, [value, showTime])

  const get24Hour = (h12: number, ap: 'AM' | 'PM') => {
    if (ap === 'AM') return h12 === 12 ? 0 : h12
    return h12 === 12 ? 12 : h12 + 12
  }

  const emit = (d: Date | undefined, h12: number, min: number, ap: 'AM' | 'PM') => {
    if (!d) return
    const y = d.getFullYear()
    const mo = String(d.getMonth() + 1).padStart(2, '0')
    const da = String(d.getDate()).padStart(2, '0')

    if (showTime) {
      const h24 = get24Hour(h12, ap)
      const hh = String(h24).padStart(2, '0')
      const mm = String(min).padStart(2, '0')
      onChange(`${y}-${mo}-${da}T${hh}:${mm}`)
    } else {
      onChange(`${y}-${mo}-${da}`)
    }
  }

  const handleSelectDay = (day: number) => {
    const newD = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
    setDate(newD)
    emit(newD, hour12, minute, ampm)
    if (!showTime) {
      setOpen(false)
    }
  }

  const handleHourClick = (h: number) => {
    setHour12(h)
    const targetDate = date || new Date(viewDate.getFullYear(), viewDate.getMonth(), new Date().getDate())
    setDate(targetDate)
    emit(targetDate, h, minute, ampm)
  }

  const handleMinuteClick = (m: number) => {
    setMinute(m)
    const targetDate = date || new Date(viewDate.getFullYear(), viewDate.getMonth(), new Date().getDate())
    setDate(targetDate)
    emit(targetDate, hour12, m, ampm)
  }

  const handleAmPmClick = (ap: 'AM' | 'PM') => {
    setAmPm(ap)
    const targetDate = date || new Date(viewDate.getFullYear(), viewDate.getMonth(), new Date().getDate())
    setDate(targetDate)
    emit(targetDate, hour12, minute, ap)
  }

  const displayValue = () => {
    if (!date) return null
    const y = date.getFullYear()
    const moName = date.toLocaleString('default', { month: 'short' })
    const da = date.getDate()
    const dateStr = `${moName} ${da}, ${y}`

    if (showTime) {
      const mStr = String(minute).padStart(2, '0')
      return `${dateStr} at ${hour12}:${mStr} ${ampm}`
    }
    return dateStr
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
    for (let i = 0; i < startDay; i++) days.push(null)
    for (let i = 1; i <= daysInMonth; i++) days.push(i)
    return days
  }

  const isToday = (day: number) => {
    const today = new Date()
    return (
      day === today.getDate() &&
      viewDate.getMonth() === today.getMonth() &&
      viewDate.getFullYear() === today.getFullYear()
    )
  }

  const isSelected = (day: number) => {
    return (
      date &&
      day === date.getDate() &&
      viewDate.getMonth() === date.getMonth() &&
      viewDate.getFullYear() === date.getFullYear()
    )
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
            className="w-full justify-between text-left font-normal h-10 px-3 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 text-gray-900 dark:text-gray-100"
            disabled={disabled}
            id={id}
          >
            <span className={date ? "text-gray-900 dark:text-gray-100 font-medium" : "text-gray-400"}>
              {displayValue() || placeholder}
            </span>
            <ChevronDownIcon className="h-4 w-4 text-gray-400" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-xl max-h-[calc(100vh-2rem)] overflow-y-auto scrollbar-thin" align="start">
          <div style={{ minWidth: "280px" }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={goToPrevMonth}
                className="h-7 w-7 p-0 bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {monthName} {year}
              </span>
              <button
                type="button"
                onClick={goToNextMonth}
                className="h-7 w-7 p-0 bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors"
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
                    type="button"
                    onClick={() => !past && handleSelectDay(day)}
                    disabled={past}
                    className={`
                      h-8 w-8 p-0 flex items-center justify-center text-sm rounded-lg transition-colors
                      ${selected 
                        ? "bg-violet-600 text-white font-bold hover:bg-violet-700 shadow-sm" 
                        : today 
                          ? "bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 font-bold border border-violet-200 dark:border-violet-800" 
                          : past 
                            ? "text-gray-300 dark:text-gray-600 cursor-not-allowed" 
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
                      }
                    `}
                  >
                    {day}
                  </button>
                )
              })}
            </div>

            {showTime && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Time</span>
                  <span className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60 px-2 py-0.5 rounded-md border border-violet-100 dark:border-violet-900">
                    {hour12}:{String(minute).padStart(2, '0')} {ampm}
                  </span>
                </div>
                <div className="flex gap-2">
                  {/* Hours 1-12 */}
                  <div className="flex-1">
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mb-1 text-center">Hour</div>
                    <div className="h-28 overflow-y-auto scrollbar-thin rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 p-1 space-y-0.5">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(h => {
                        const active = hour12 === h
                        return (
                          <button
                            key={h}
                            type="button"
                            onClick={() => handleHourClick(h)}
                            className={cn(
                              'w-full h-7 rounded-md flex items-center justify-center text-xs transition-colors',
                              active
                                ? 'bg-violet-600 text-white font-bold shadow-sm'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            )}
                          >
                            {h}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  {/* Minutes */}
                  <div className="flex-1">
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mb-1 text-center">Min</div>
                    <div className="h-28 overflow-y-auto scrollbar-thin rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 p-1 space-y-0.5">
                      {Array.from({ length: 12 }, (_, i) => i * 5).map(m => {
                        const active = minute === m
                        return (
                          <button
                            key={m}
                            type="button"
                            onClick={() => handleMinuteClick(m)}
                            className={cn(
                              'w-full h-7 rounded-md flex items-center justify-center text-xs transition-colors',
                              active
                                ? 'bg-violet-600 text-white font-bold shadow-sm'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            )}
                          >
                            {String(m).padStart(2, '0')}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  {/* AM/PM */}
                  <div className="w-14">
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mb-1 text-center">&nbsp;</div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 p-1 space-y-1">
                      {(['AM', 'PM'] as const).map(ap => (
                        <button
                          key={ap}
                          type="button"
                          onClick={() => handleAmPmClick(ap)}
                          className={cn(
                            'w-full h-11 rounded-md flex items-center justify-center text-xs font-bold transition-colors',
                            ampm === ap
                              ? 'bg-violet-600 text-white shadow-sm'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                          )}
                        >
                          {ap}
                        </button>
                      ))}
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
