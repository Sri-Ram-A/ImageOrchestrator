// @/components/date-picker-with-range.tsx
"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { type DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DatePickerProps {
    className?: string;
    onChange: (range: DateRange | undefined) => void;
}

export function DatePickerWithRange({ className, onChange }: DatePickerProps) {
    const [date, setDate] = React.useState<DateRange | undefined>()

    const handleSelect = (selectedRange: DateRange | undefined) => {
        setDate(selectedRange);
        onChange(selectedRange); // Notify parent page of selection change
    };

    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        id="date-picker-range"
                        className="w-[260px] justify-start text-left font-normal bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800"
                    >
                        <CalendarIcon className="mr-2 h-4 w-4 text-stone-500" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(date.from, "LLL dd, y")
                            )
                        ) : (
                            <span className="text-stone-400">Filter by date range</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={handleSelect}
                        numberOfMonths={2}
                        captionLayout="dropdown"
                    />
                </PopoverContent>
            </Popover>
        </div>
    )
}