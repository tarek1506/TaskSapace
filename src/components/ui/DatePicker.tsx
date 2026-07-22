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
  const [timeStr, setTimeStr] = React.useState("09:00")
  const [open, setOpen] = React.useState(false)
  const [viewDate, setViewDate] = React.useState(() => {
    const parsed = parseIsoDate(value)
    return parsed || new Date()
  })

  // 12-hour helpers
  const to12 = (h24: number) => {
    const h = h24 % 12 || 12
    return h
  }
  const toAmPm = (h24: number) => (h24 >= 12 ? 'PM' : 'AM')
  const to24 = (h12: number, ampm: string) => {
    if (ampm === 'AM') return h12 === 12 ? 0 : h12
    return h12 === 12 ? 12 : h12 + 12
  }

  const getDisplayHour = () => to12(parseInt(timeStr.split(':')[0] || '9', 10))
  const getDisplayAmPm = () => toAmPm(parseInt(timeStr.split(':')[0] || '9', 10))

  React.useEffect(() => {
    if (value) {
      const d = parseIsoDate(value)
      if (d) {
        setDate(d)
        setViewDate(d)
        if (showTime) {
          setTimeStr(format(d, "HH:mm"))
        }
      }
    } else {
      setDate(undefined)
      if (showTime) setTimeStr("09:00")
    }
  }, [value, showTime])

  const emitChange = (selectedDate: Date, time: string) => {
    const y = selectedDate.getFullYear()
    const mo = selectedDate.getMonth()
    const da = selectedDate.getDate()
    if (showTime) {
      const [h, m] = (time || '09:00').split(':').map(Number)
      const d = new Date(y, mo, da, h || 0, m || 0, 0)
      onChange(format(d, "yyyy-MM-dd'T'HH:mm"))
    } else {
      const d = new Date(y, mo, da, 12, 0, 0)
      onChange(format(d, "yyyy-MM-dd"))
    }
  }

  const set12Hour = (h12: number, ampm: string) => {
    const h24 = to24(h12, ampm)
    const newTime = `${String(h24).padStart(2, '0')}:${timeStr.split(':')[1] || '00'}`
    setTimeStr(newTime)
    if (date) emitChange(date, newTime)
  }

  const setAmPm = (ampm: string) => {
    const h24 = parseInt(timeStr.split(':')[0] || '9', 10)
    const h12 = to12(h24)
    const newH24 = to24(h12, ampm)
    const newTime = `${String(newH24).padStart(2, '0')}:${timeStr.split(':')[1] || '00'}`
    setTimeStr(newTime)
    if (date) emitChange(date, newTime)
  }

  const handleSelect = (selectedDate: Date) => {
    setDate(selectedDate)
    emitChange(selectedDate, timeStr)
    if (!showTime) {
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
            className="w-full justify-between text-left font-normal h-10 px-3 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 text-gray-900 dark:text-gray-100"
            disabled={disabled}
            id={id}
          >
            <span className={date ? "text-gray-900" : "text-gray-400"}>
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
                onClick={goToPrevMonth}
                className="h-7 w-7 p-0 bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {monthName} {year}
              </span>
              <button
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
                    onClick={() => !past && handleSelect(new Date(viewDate.getFullYear(), viewDate.getMonth(), day))}
                    disabled={past}
                    className={`
                      h-8 w-8 p-0 flex items-center justify-center text-sm rounded-lg transition-colors
                      ${selected 
                        ? "bg-violet-600 text-white hover:bg-violet-700" 
                        : today 
                          ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100" 
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
              <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Time</span>
                  <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                    {getDisplayHour()}:{(timeStr.split(':')[1] || '00')} {getDisplayAmPm()}
                  </span>
                </div>
                <div className="flex gap-2">
                  {/* Hours 1-12 */}
                  <div className="flex-1">
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mb-0.5 text-center">Hour</div>
                    <div className="h-24 overflow-y-auto scrollbar-thin rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/50">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(h => {
                        const active = getDisplayHour() === h
                        return (
                          <button
                            key={h}
                            type="button"
                            onClick={() => set12Hour(h, getDisplayAmPm())}
                            className={cn(
                              'w-full h-7 flex items-center justify-center text-[11px] transition-colors',
                              active
                                ? 'bg-violet-600 text-white font-semibold'
                                : 'text-gray-600 hover:bg-gray-100'
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
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mb-0.5 text-center">Min</div>
                    <div className="h-24 overflow-y-auto scrollbar-thin rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/50">
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
                  {/* AM/PM */}
                  <div className="w-12">
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mb-0.5 text-center">&nbsp;</div>
                    <div className="rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/50 overflow-hidden">
                      {['AM', 'PM'].map(ap => (
                        <button
                          key={ap}
                          type="button"
                          onClick={() => setAmPm(ap)}
                          className={cn(
                            'w-full h-[48px] flex items-center justify-center text-[11px] font-medium transition-colors',
                            getDisplayAmPm() === ap
                              ? 'bg-violet-600 text-white font-semibold'
                              : 'text-gray-600 hover:bg-gray-100'
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
