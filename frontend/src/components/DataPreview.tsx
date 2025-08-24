import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Database, Info, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DataPreviewProps {
  data: any[]
  headers: string[]
  onTimestampColumn?: (column: string) => void
  selectedTimestampColumn?: string
}

export function DataPreview({ data, headers, onTimestampColumn, selectedTimestampColumn }: DataPreviewProps) {
  const [showFullData, setShowFullData] = useState(false)
  
  const previewData = useMemo(() => {
    return showFullData ? data : data.slice(0, 10)
  }, [data, showFullData])

  const columnStats = useMemo(() => {
    return headers.map(header => {
      const values = data.map(row => row[header]).filter(val => val !== null && val !== undefined && val !== '')
      const uniqueValues = new Set(values)
      const numericValues = values.filter(val => !isNaN(Number(val)) && val !== '')
      
      // Check if column might be a timestamp
      const isTimestamp = values.some(val => {
        if (!val) return false
        const str = String(val)
        // Check for common date/time patterns
        return /^\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/.test(str) || 
               /^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}/.test(str) ||
               /\d{1,2}:\d{2}/.test(str)
      })

      return {
        name: header,
        totalCount: data.length,
        nonNullCount: values.length,
        uniqueCount: uniqueValues.size,
        isNumeric: numericValues.length > values.length * 0.8,
        isTimestamp,
        dataType: isTimestamp ? 'timestamp' : 
                 numericValues.length > values.length * 0.8 ? 'numeric' : 
                 uniqueValues.size < values.length * 0.1 ? 'categorical' : 'text'
      }
    })
  }, [data, headers])

  const getColumnTypeColor = (dataType: string) => {
    switch (dataType) {
      case 'timestamp': return 'bg-accent text-accent-foreground'
      case 'numeric': return 'bg-success/20 text-success-foreground'
      case 'categorical': return 'bg-warning/20 text-warning-foreground'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const handleTimestampSelect = (columnName: string) => {
    if (onTimestampColumn) {
      onTimestampColumn(columnName)
    }
  }

  return (
    <Card className="border-muted bg-gradient-glass backdrop-blur-sm shadow-elegant">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            <span className="text-xl font-semibold bg-gradient-primary bg-clip-text text-transparent">
              Data Preview
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-3 py-1">
              {data.length.toLocaleString()} rows
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              {headers.length} columns
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Column Statistics */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Column Information
          </h4>
          <div className="grid gap-3">
            {columnStats.map((stat) => (
              <div 
                key={stat.name}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border transition-all duration-200",
                  stat.isTimestamp 
                    ? "border-accent/50 bg-accent/10 hover:border-accent cursor-pointer" 
                    : "border-muted bg-muted/20 hover:bg-muted/30",
                  selectedTimestampColumn === stat.name && "ring-2 ring-accent shadow-data"
                )}
                onClick={() => stat.isTimestamp && handleTimestampSelect(stat.name)}
              >
                <div className="flex items-center gap-3">
                  <div className="font-medium text-foreground">{stat.name}</div>
                  <Badge className={getColumnTypeColor(stat.dataType)} variant="secondary">
                    {stat.dataType}
                  </Badge>
                  {stat.isTimestamp && (
                    <Badge className="bg-accent/20 text-accent-foreground">
                      Timestamp Column
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{stat.nonNullCount}/{stat.totalCount} values</span>
                  <span>{stat.uniqueCount} unique</span>
                  {stat.isTimestamp && (
                    <Button
                      size="sm"
                      variant={selectedTimestampColumn === stat.name ? "default" : "outline"}
                      className="h-6 px-2 text-xs"
                    >
                      {selectedTimestampColumn === stat.name ? 'Selected' : 'Select'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Data Sample
            </h4>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFullData(!showFullData)}
              className="text-xs"
            >
              {showFullData ? (
                <>
                  <EyeOff className="h-3 w-3 mr-1" />
                  Show Less
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3 mr-1" />
                  Show All ({data.length} rows)
                </>
              )}
            </Button>
          </div>
          
          <div className="rounded-lg border border-muted bg-card/50 backdrop-blur-sm">
            <ScrollArea className="h-[400px] w-full">
              <Table>
                <TableHeader>
                  <TableRow className="border-muted hover:bg-muted/50">
                    {headers.map((header) => (
                      <TableHead 
                        key={header} 
                        className={cn(
                          "font-semibold text-foreground border-r border-muted last:border-r-0 min-w-[120px]",
                          selectedTimestampColumn === header && "bg-accent/20"
                        )}
                      >
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, index) => (
                    <TableRow key={index} className="border-muted hover:bg-muted/30">
                      {headers.map((header) => (
                        <TableCell 
                          key={`${index}-${header}`} 
                          className={cn(
                            "border-r border-muted last:border-r-0 text-sm",
                            selectedTimestampColumn === header && "bg-accent/10"
                          )}
                        >
                          <div className="truncate max-w-[200px]" title={String(row[header])}>
                            {String(row[header] || '')}
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </div>

        {!showFullData && data.length > 10 && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Showing first 10 rows of {data.length.toLocaleString()} total rows
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}