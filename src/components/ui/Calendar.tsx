import * as React from "react"
import { DayPicker } from "react-day-picker"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  styles,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={className}
      styles={styles}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
