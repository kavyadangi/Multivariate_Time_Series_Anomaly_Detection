import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Download, BarChart3, TrendingUp, Clock, AlertTriangle, CheckCircle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import { AnalysisResults } from '@/lib/api'
import { api } from '@/lib/api'

interface ResultsProps {
  results: AnalysisResults
  filename?: string
}

const SEVERITY_COLORS = {
  normal: '#22c55e',
  slight: '#eab308', 
  moderate: '#f97316',
  significant: '#ef4444',
  severe: '#dc2626'
}

export function Results({ results, filename }: ResultsProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    if (!filename) return
    
    setIsDownloading(true)
    try {
      const blob = await api.downloadResults(`results_${filename}`)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `anomaly_results_${filename}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download failed:', error)
    } finally {
      setIsDownloading(false)
    }
  }

  // Prepare chart data
  const timeSeriesData = results.data.slice(0, 500).map((row, index) => ({
    index,
    time: row.Time,
    score: row.Abnormality_score,
    isAnomaly: row.Abnormality_score > 50
  }))

  const distributionData = Object.entries(results.summary.scoreDistribution).map(([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value,
    color: SEVERITY_COLORS[key as keyof typeof SEVERITY_COLORS]
  }))

  const topFeaturesData = results.summary.topFeatures.slice(0, 10)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-success/30 bg-success/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm text-muted-foreground">Total Rows</p>
                <p className="text-2xl font-bold">{results.summary.totalRows.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Score Range</p>
                <p className="text-lg font-bold">
                  {results.summary.scoreRange.min.toFixed(1)} - {results.summary.scoreRange.max.toFixed(1)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-accent" />
              <div>
                <p className="text-sm text-muted-foreground">Anomalies Found</p>
                <p className="text-2xl font-bold">
                  {(results.summary.scoreDistribution.moderate + 
                    results.summary.scoreDistribution.significant + 
                    results.summary.scoreDistribution.severe).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-muted bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Processing Time</p>
                <p className="text-2xl font-bold">{results.processingTime.toFixed(1)}s</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Results */}
      <Card className="border-muted bg-gradient-glass backdrop-blur-sm shadow-elegant">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Analysis Results
            </span>
          </CardTitle>
          <Button 
            onClick={handleDownload}
            disabled={isDownloading || !filename}
            className="bg-gradient-primary hover:opacity-90"
          >
            <Download className="h-4 w-4 mr-2" />
            {isDownloading ? 'Downloading...' : 'Download CSV'}
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="timeseries">Time Series</TabsTrigger>
              <TabsTrigger value="features">Top Features</TabsTrigger>
              <TabsTrigger value="data">Raw Data</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Score Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Anomaly Score Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={distributionData}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, value, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                        >
                          {distributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Severity Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Severity Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(results.summary.scoreDistribution).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: SEVERITY_COLORS[key as keyof typeof SEVERITY_COLORS] }}
                          />
                          <span className="capitalize font-medium">{key}</span>
                        </div>
                        <Badge variant="outline">{value.toLocaleString()}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="timeseries">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Anomaly Scores Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="index" />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => `Data Point: ${value}`}
                        formatter={(value: number) => [value.toFixed(2), 'Anomaly Score']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="score" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={1}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="features">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Contributing Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={topFeaturesData} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="feature" type="category" width={100} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="data">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Detailed Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] w-full">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>Anomaly Score</TableHead>
                          <TableHead>Top Feature 1</TableHead>
                          <TableHead>Top Feature 2</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.data.slice(0, 100).map((row, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono text-xs">{row.Time}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={row.Abnormality_score > 50 ? "destructive" : "outline"}
                                className="font-mono"
                              >
                                {row.Abnormality_score.toFixed(2)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">{row.top_feature_1 || '-'}</TableCell>
                            <TableCell className="text-xs">{row.top_feature_2 || '-'}</TableCell>
                            <TableCell>
                              {row.Abnormality_score > 50 ? (
                                <Badge variant="destructive" className="text-xs">Anomaly</Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">Normal</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}