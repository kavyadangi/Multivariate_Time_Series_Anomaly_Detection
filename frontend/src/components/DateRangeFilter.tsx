import React, { useState, useMemo } from 'react'
import { format, parseISO, isValid } from 'date-fns'
import { Calendar as CalendarIcon, Filter } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface DateRangeFilterProps {
  data: any[]
  timestampColumn: string | null
  onDateRangeChange: (filteredData: any[], startDate: Date | null, endDate: Date | null) => void
}

export function DateRangeFilter({ data, timestampColumn, onDateRangeChange }: DateRangeFilterProps) {
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)

  // Parse and analyze timestamp data
  const dateInfo = useMemo(() => {
    if (!timestampColumn || !data.length) return null

    const dates = data
      .map(row => {
        const value = row[timestampColumn]
        if (!value) return null
        
        // Try different date parsing approaches
        let date: Date | null = null
        
        // Try parsing as ISO string first
        try {
          date = parseISO(String(value))
          if (!isValid(date)) {
            // Try parsing as a regular Date
            date = new Date(String(value))
            if (!isValid(date)) {
              date = null
            }
          }
        } catch {
          date = null
        }
        
        return date
      })
      .filter((date): date is Date => date !== null && isValid(date))
      .sort((a, b) => a.getTime() - b.getTime())

    if (dates.length === 0) return null

    return {
      minDate: dates[0],
      maxDate: dates[dates.length - 1],
      totalDates: dates.length,
      validDates: dates
    }
  }, [data, timestampColumn])

  // Filter data based on selected date range
  const filteredData = useMemo(() => {
    if (!timestampColumn || !startDate || !endDate || !dateInfo) {
      return data
    }

    return data.filter(row => {
      const value = row[timestampColumn]
      if (!value) return false

      try {
        let date = parseISO(String(value))
        if (!isValid(date)) {
          date = new Date(String(value))
        }
        
        if (!isValid(date)) return false

        return date >= startDate && date <= endDate
      } catch {
        return false
      }
    })
  }, [data, timestampColumn, startDate, endDate, dateInfo])

  // Update parent component when filtered data changes
  React.useEffect(() => {
    onDateRangeChange(filteredData, startDate, endDate)
  }, [filteredData, startDate, endDate, onDateRangeChange])

  const clearDateRange = () => {
    setStartDate(null)
    setEndDate(null)
  }

  const setFullRange = () => {
    if (dateInfo) {
      setStartDate(dateInfo.minDate)
      setEndDate(dateInfo.maxDate)
    }
  }

  if (!timestampColumn) {
    return (
      <Card className="border-muted bg-gradient-glass backdrop-blur-sm shadow-elegant opacity-60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <Filter className="h-5 w-5" />
            Date Range Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Please select a timestamp column to enable date filtering
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!dateInfo) {
    return (
      <Card className="border-muted bg-gradient-glass backdrop-blur-sm shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Filter className="h-5 w-5" />
            Date Range Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            No valid dates found in the selected timestamp column
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-muted bg-gradient-glass backdrop-blur-sm shadow-elegant">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-6 w-6 text-primary" />
            <span className="text-xl font-semibold bg-gradient-primary bg-clip-text text-transparent">
              Date Range Filter
            </span>
          </div>
          <Badge variant="secondary" className="px-3 py-1">
            {timestampColumn}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Date Range Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 rounded-lg bg-muted/30 border">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Available Range</p>
            <p className="text-sm font-medium">
              {format(dateInfo.minDate, 'PPP')} - {format(dateInfo.maxDate, 'PPP')}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Records</p>
            <p className="text-sm font-medium">{dateInfo.totalDates.toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-lg bg-success/10 border border-success/20">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Filtered Records</p>
            <p className="text-sm font-medium text-success-foreground">
              {filteredData.length.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Date Pickers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Start Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : "Select start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate || undefined}
                  onSelect={(date) => setStartDate(date || null)}
                  fromDate={dateInfo.minDate}
                  toDate={endDate || dateInfo.maxDate}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">End Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : "Select end date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate || undefined}
                  onSelect={(date) => setEndDate(date || null)}
                  fromDate={startDate || dateInfo.minDate}
                  toDate={dateInfo.maxDate}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={setFullRange} variant="outline" size="sm">
            Select Full Range
          </Button>
          <Button onClick={clearDateRange} variant="outline" size="sm">
            Clear Selection
          </Button>
        </div>

        {/* Filter Status */}
        {(startDate || endDate) && (
          <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
            <p className="text-sm">
              <span className="font-medium text-accent-foreground">Active Filter:</span>{' '}
              {startDate && endDate ? (
                <>Showing data from {format(startDate, 'PPP')} to {format(endDate, 'PPP')}</>
              ) : startDate ? (
                <>Showing data from {format(startDate, 'PPP')} onwards</>
              ) : endDate ? (
                <>Showing data until {format(endDate, 'PPP')}</>
              ) : null}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}