"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";
import { addMonths, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from "date-fns";

interface CalendarProps {
  currentDate: Date;
  onDateChange?: (date: Date) => void;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  selectedDate: Date | null;
  events?: Array<{
    date: Date;
    type: "meeting" | "training";
  }>;
}

export function CustomCalendar({ 
  currentDate, 
  onDateChange, 
  onPrevMonth, 
  onNextMonth, 
  selectedDate,
  events = []
}: CalendarProps) {
  const startDate = startOfMonth(currentDate);
  const endDate = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  // Get the day names
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Calculate padding days for the first week
  const firstDayOfMonth = startDate.getDay();
  const prevMonthPaddingDays = Array.from({ length: firstDayOfMonth }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(-firstDayOfMonth + i + 1);
    return d;
  });

  // Calculate padding days for the last week
  const lastDayOfMonth = endDate.getDay();
  const nextMonthPaddingDays = Array.from({ length: 6 - lastDayOfMonth }, (_, i) => {
    const d = new Date(endDate);
    d.setDate(endDate.getDate() + i + 1);
    return d;
  });

  const allDays = [...prevMonthPaddingDays, ...days, ...nextMonthPaddingDays];

  // Split days into weeks
  const weeks = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7));
  }

  // Check if a day has events
  const hasEvents = (date: Date) => {
    return events.some(event => isSameDay(event.date, date));
  };

  return (
    <div className="w-full bg-[#0F0F0F] rounded-xl p-6 bg-dark-800/30 backdrop-blur-md rounded-2xl p-6 border border-white/10">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-2xl font-medium">
          {format(currentDate, "MMMM yyyy")}
        </div>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrevMonth}
            className="text-white hover:bg-[#2F2F2F] transition-colors w-8 h-8"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onNextMonth}
            className="text-white hover:bg-[#2F2F2F] transition-colors w-8 h-8"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Day Names */}
        {dayNames.map((day) => (
          <div
            key={day}
            className="h-8 flex items-center justify-center text-sm md:text-lg text-white "
          >
            {day}
          </div>
        ))}

        {/* Calendar Days */}
        {weeks.map((week, weekIndex) => (
          <React.Fragment key={weekIndex}>
            {week.map((day, dayIndex) => {
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isCurrentDay = isToday(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const dayHasEvents = hasEvents(day);

              return (
                <button
                  key={dayIndex}
                  onClick={() => onDateChange?.(day)}
                  className={`
                    aspect-square rounded-md flex flex-col items-center justify-center
                    transition-all 
                    ${!isCurrentMonth 
                      ? "text-gray-600 bg-[#1A1A1A]" 
                      : "bg-[#1A1A1A] hover:bg-[#2F2F2F]"
                    }
                    ${isSelected 
                      ? "!bg-[#2F2F2F] ring-1 ring-[#FF6B00]" 
                      : ""
                    }
                  `}
                >
                  <span className={`
                    text-sm text-sm md:text-xl font-medium
                    ${isSelected ? "text-[#FF6B00]" : ""}
                    ${!isCurrentMonth ? "opacity-40" : ""}
                  `}>
                    {format(day, "d")}
                  </span>
                  {dayHasEvents && isCurrentMonth && (
                    <div className="mt-1 w-1 h-1 rounded-full bg-[#FF6B00]" />
                  )}
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}