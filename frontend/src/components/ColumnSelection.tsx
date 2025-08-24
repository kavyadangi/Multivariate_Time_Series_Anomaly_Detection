import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  CheckSquare, 
  Square, 
  Search, 
  SortAsc, 
  SortDesc, 
  Filter,
  Database
} from 'lucide-react'

interface ColumnSelectionProps {
  headers: string[]
  data: any[]
  timestampColumn: string | null
  onSelectionChange: (selectedColumns: string[]) => void
}

export function ColumnSelection({ headers, data, timestampColumn, onSelectionChange }: ColumnSelectionProps) {
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set(headers))
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'nulls'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [filterType, setFilterType] = useState<string>('all')

  // Analyze columns for type and statistics
  const columnAnalysis = useMemo(() => {
    return headers.map(header => {
      const values = data.map(row => row[header]).filter(val => val !== null && val !== undefined && val !== '')
      const nullCount = data.length - values.length
      const uniqueValues = new Set(values)
      const numericValues = values.filter(val => !isNaN(Number(val)) && val !== '')
      
      // Determine column type
      let type = 'text'
      if (header === timestampColumn) {
        type = 'timestamp'
      } else if (numericValues.length > values.length * 0.8) {
        type = 'numeric'
      } else if (uniqueValues.size < values.length * 0.1 && uniqueValues.size > 1) {
        type = 'categorical'
      }

      return {
        name: header,
        type,
        nullCount,
        nullPercentage: (nullCount / data.length) * 100,
        uniqueCount: uniqueValues.size,
        isSelected: selectedColumns.has(header)
      }
    })
  }, [headers, data, timestampColumn, selectedColumns])

  // Filter and sort columns
  const filteredAndSortedColumns = useMemo(() => {
    let filtered = columnAnalysis.filter(col => {
      const matchesSearch = col.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = filterType === 'all' || col.type === filterType
      return matchesSearch && matchesType
    })

    // Sort columns
    filtered.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'type':
          comparison = a.type.localeCompare(b.type)
          break
        case 'nulls':
          comparison = a.nullPercentage - b.nullPercentage
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [columnAnalysis, searchTerm, sortBy, sortOrder, filterType])

  const toggleColumn = (columnName: string) => {
    const newSelection = new Set(selectedColumns)
    if (newSelection.has(columnName)) {
      newSelection.delete(columnName)
    } else {
      newSelection.add(columnName)
    }
    setSelectedColumns(newSelection)
    onSelectionChange(Array.from(newSelection))
  }

  const selectAll = () => {
    const allColumns = new Set(headers)
    setSelectedColumns(allColumns)
    onSelectionChange(Array.from(allColumns))
  }

  const clearAll = () => {
    setSelectedColumns(new Set())
    onSelectionChange([])
  }

  const toggleSort = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'timestamp': return 'bg-accent text-accent-foreground'
      case 'numeric': return 'bg-success/20 text-success-foreground'
      case 'categorical': return 'bg-warning/20 text-warning-foreground'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <Card className="border-muted bg-gradient-glass backdrop-blur-sm shadow-elegant">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            <span className="text-xl font-semibold bg-gradient-primary bg-clip-text text-transparent">
              Select Training Columns
            </span>
          </div>
          <Badge variant="secondary" className="px-3 py-1">
            {selectedColumns.size} of {headers.length} selected
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search columns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Type Filter */}
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger>
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="numeric">Numeric</SelectItem>
              <SelectItem value="categorical">Categorical</SelectItem>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="timestamp">Timestamp</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Column Name</SelectItem>
              <SelectItem value="type">Data Type</SelectItem>
              <SelectItem value="nulls">Missing Values</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort Order */}
          <Button variant="outline" onClick={toggleSort} className="justify-start">
            {sortOrder === 'asc' ? (
              <SortAsc className="h-4 w-4 mr-2" />
            ) : (
              <SortDesc className="h-4 w-4 mr-2" />
            )}
            {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button onClick={selectAll} variant="outline" size="sm">
            <CheckSquare className="h-4 w-4 mr-2" />
            Select All
          </Button>
          <Button onClick={clearAll} variant="outline" size="sm">
            <Square className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>

        {/* Column List */}
        <div className="border rounded-lg">
          <ScrollArea className="h-[400px]">
            <div className="p-4 space-y-2">
              {filteredAndSortedColumns.map((column) => (
                <div
                  key={column.name}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card/50 hover:bg-card/70 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={column.isSelected}
                      onCheckedChange={() => toggleColumn(column.name)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{column.name}</span>
                        <Badge className={getTypeColor(column.type)} variant="secondary">
                          {column.type}
                        </Badge>
                        {column.name === timestampColumn && (
                          <Badge className="bg-accent/20 text-accent-foreground" variant="secondary">
                            Selected Timestamp
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {column.uniqueCount} unique values • {column.nullPercentage.toFixed(1)}% missing
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Selection Summary */}
        <div className="p-3 rounded-lg bg-muted/30 border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Selected: </span>
              <span className="font-medium">{selectedColumns.size}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Numeric: </span>
              <span className="font-medium">
                {Array.from(selectedColumns).filter(col => 
                  columnAnalysis.find(c => c.name === col)?.type === 'numeric'
                ).length}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Categorical: </span>
              <span className="font-medium">
                {Array.from(selectedColumns).filter(col => 
                  columnAnalysis.find(c => c.name === col)?.type === 'categorical'
                ).length}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Text: </span>
              <span className="font-medium">
                {Array.from(selectedColumns).filter(col => 
                  columnAnalysis.find(c => c.name === col)?.type === 'text'
                ).length}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}