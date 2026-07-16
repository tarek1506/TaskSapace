"use client"

import * as React from "react"
import { format } from "date-fns"
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover"

interface DatePickerProps {
  value?: string
  onChange: (date: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  className,
  id,
}: DatePickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(undefined)
  const [open, setOpen] = React.useState(false)
  const [viewDate, setViewDate] = React.useState(() => value ? new Date(value) : new Date())

  React.useEffect(() => {
    if (value) {
      setDate(new Date(value))
      setViewDate(new Date(value))
    } else {
      setDate(undefined)
    }
  }, [value])

  const handleSelect = (selectedDate: Date) => {
    setDate(selectedDate)
    onChange(format(selectedDate, "yyyy-MM-dd"))
    setOpen(false)
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
              {date ? format(date, "PPP") : placeholder}
            </span>
            <ChevronDownIcon className="h-4 w-4 text-gray-400" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3 bg-white border border-gray-200 shadow-lg rounded-xl" align="start">
          <div style={{ minWidth: "280px" }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={goToPrevMonth}
                className="h-8 w-8 p-0 bg-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg flex items-center justify-center transition-colors"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium text-gray-900">
                {monthName} {year}
              </span>
              <button
                onClick={goToNextMonth}
                className="h-8 w-8 p-0 bg-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg flex items-center justify-center transition-colors"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-2">
              {weekDays.map((day) => (
                <div key={day} className="h-8 flex items-center justify-center text-xs text-gray-400 uppercase">
                  {day}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="h-9" />
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
                      h-9 w-9 p-0 flex items-center justify-center text-sm rounded-lg transition-colors
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
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
