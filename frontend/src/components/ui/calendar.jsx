import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}) {
  // Dropdown captions reuse caption_label as the visible select display, so it
  // needs the pill styling; the default "buttons" layout uses it as a plain
  // text heading instead.
  const dropdownMode =
    props.captionLayout === "dropdown" ||
    props.captionLayout === "dropdown-buttons";

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-3",
        caption: cn(
          "relative flex items-center justify-center",
          !dropdownMode && "pt-1"
        ),
        caption_dropdowns: "flex items-center gap-1.5",
        dropdown_month: "relative group",
        dropdown_year: "relative group",
        // The native <select> is made invisible but still clickable/keyboard
        // reachable; it overlays the styled caption_label below so only one
        // value (plus the chevron) is shown. Hover/focus states live on the
        // caption_label via group-* so they fire even though the select sits on
        // top and captures the pointer.
        dropdown:
          "absolute inset-0 z-20 cursor-pointer appearance-none border-0 bg-transparent opacity-0",
        caption_label: dropdownMode
          ? "flex h-9 items-center gap-1.5 rounded-lg border border-border bg-transparent px-3 text-sm font-medium text-popover-foreground transition-colors group-hover:bg-muted/60 group-focus-within:ring-2 group-focus-within:ring-ring group-focus-within:ring-offset-1 group-focus-within:ring-offset-popover"
          : "text-sm font-medium",
        dropdown_icon: "h-3.5 w-3.5 text-muted-foreground",
        nav: dropdownMode
          ? "pointer-events-none absolute inset-0 flex items-center justify-between"
          : "flex items-center gap-1",
        nav_button:
          "pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/70 hover:text-popover-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-popover disabled:pointer-events-none disabled:opacity-40",
        nav_button_previous: dropdownMode ? "" : "absolute left-1",
        nav_button_next: dropdownMode ? "" : "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell:
          "flex h-8 w-9 items-center justify-center rounded-lg text-xs font-medium text-muted-foreground",
        row: "flex w-full",
        cell: "relative h-9 w-9 p-0 text-center text-sm focus-within:relative focus-within:z-20",
        day: cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-normal text-popover-foreground transition-colors",
          "hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-popover",
          // Attribute selectors win over the day_today text color below, so a
          // date that is both today and selected stays filled + readable.
          "aria-selected:bg-primary aria-selected:text-primary-foreground aria-selected:hover:bg-primary"
        ),
        day_selected: "bg-primary text-primary-foreground hover:bg-primary",
        // Today is a subtle accent (no fill) so it is clearly distinct from a
        // selected day even when the two fall on different dates.
        day_today: "text-primary font-semibold",
        day_outside:
          "text-muted-foreground/45 aria-selected:bg-muted aria-selected:text-muted-foreground",
        day_disabled: "text-muted-foreground/40 opacity-60",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("h-4 w-4", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("h-4 w-4", className)} {...props} />
        ),
      }}
      {...props} />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
