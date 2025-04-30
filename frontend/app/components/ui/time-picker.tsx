"use client"

import * as React from "react"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

interface TimePickerProps {
  time?: string
  onSelect?: (time: string) => void
  placeholder?: string
}

export function TimePicker({ time, onSelect, placeholder }: TimePickerProps) {
  const [inputValue, setInputValue] = React.useState(time || "")
  const [isValid, setIsValid] = React.useState(true)

  const validateAndFormatTime = (value: string) => {
    // Remove any non-digit characters
    const digits = value.replace(/\D/g, "")
    
    // Format as HH:mm
    let formatted = ""
    if (digits.length > 0) {
      const hours = digits.substring(0, 2)
      const minutes = digits.substring(2, 4)
      
      if (hours) {
        formatted = hours
        if (minutes) {
          formatted += ":" + minutes
        }
      }
    }

    // Validate the time
    let valid = true
    if (formatted.length === 5) {
      const [hours, minutes] = formatted.split(":")
      const hoursNum = parseInt(hours)
      const minutesNum = parseInt(minutes)
      valid = hoursNum >= 0 && hoursNum < 24 && minutesNum >= 0 && minutesNum < 60
    }

    return { formatted, valid }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const { formatted, valid } = validateAndFormatTime(value)
    
    setInputValue(formatted)
    setIsValid(valid)

    if (valid && formatted.length === 5) {
      onSelect?.(formatted)
    }
  }

  return (
    <div className="relative mb-8">
      <div className="relative">
        <Input
          value={inputValue}
          onChange={handleChange}
          placeholder={placeholder || "00:00"}
          className={cn(
            "pl-10 pr-4 bg-[#1F1F1F] border-gray-800 h-11 transition-colors rounded-xl",
            !isValid && "border-red-500 focus-visible:ring-red-500",
            isValid && "focus-visible:ring-[#FF6B00] focus-visible:border-[#FF6B00]"
          )}
          maxLength={5}
        />
        <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      </div>
      <div className="absolute top-[calc(100%+0.5rem)] left-0 text-xs text-gray-400">
        Format: 24 jam (00:00 - 23:59)
      </div>
    </div>
  )
} 