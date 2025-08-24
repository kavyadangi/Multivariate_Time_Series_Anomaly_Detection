import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { FileUpload } from '@/components/FileUpload'
import { DataPreview } from '@/components/DataPreview'
import { DateRangeFilter } from '@/components/DateRangeFilter'
import { ColumnSelection } from '@/components/ColumnSelection'
import { TrendingUp, Brain, Clock, Target } from 'lucide-react'
import heroImage from '@/assets/hero-data-analysis.jpg'
import { ModelTraining } from '@/components/ModelTraining'
import { Results } from '@/components/Results'
import { AnalysisResults,sanitizeData } from '@/lib/api'

interface DataState {
  originalData: any[]
  filteredData: any[]
  headers: string[]
  timestampColumn: string | null
  selectedColumns: string[]
  dateRange: {
    start: Date | null
    end: Date | null
  }
  selectedFile: File | null
  analysisResults: AnalysisResults | null
}

const Index = () => {
  // Initialize with dark theme
  React.useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  const [dataState, setDataState] = useState<DataState>({
    originalData: [],
    filteredData: [],
    headers: [],
    timestampColumn: null,
    selectedColumns: [],
    dateRange: { start: null, end: null },
    selectedFile: null,
    analysisResults: null
  })

  const [currentStep, setCurrentStep] = useState(1)

  const handleFileLoad = (data: any[], headers: string[]) => {
    setDataState(prev => ({
      ...prev,
      originalData: data,
      filteredData: data,
      headers,
      selectedColumns: headers
    }))
    setCurrentStep(2)
  }

  const handleTimestampColumn = (column: string) => {
    setDataState(prev => ({
      ...prev,
      timestampColumn: column
    }))
    setCurrentStep(3)
  }

  const handleDateRangeChange = (filteredData: any[], startDate: Date | null, endDate: Date | null) => {
    setDataState(prev => ({
      ...prev,
      filteredData,
      dateRange: { start: startDate, end: endDate }
    }))
    if (startDate && endDate) {
      setCurrentStep(4)
      setCurrentStep(5)
      setCurrentStep(6)


    }
  }

  const handleFileSelect = (file: File) => {
    setDataState(prev => ({
      ...prev,
      selectedFile: file
    }))
  }

  const handleColumnSelection = (selectedColumns: any) => {
    const columnsArray = Array.isArray(selectedColumns) ? selectedColumns : [];

    setDataState(prev => ({
      ...prev,
      selectedColumns: columnsArray
    }));
  };

  const handleTrainingComplete = (results: AnalysisResults) => {
  // Sanitize the results before updating state
    const sanitizedResults = sanitizeData(results) as AnalysisResults

    setDataState(prev => ({
      ...prev,
      analysisResults: sanitizedResults
    }))

  }

  const steps = [
    { number: 1, title: 'Upload Dataset', description: 'Upload your CSV file with time series data', completed: dataState.originalData.length > 0 },
    { number: 2, title: 'Data Preview', description: 'Review your data and select timestamp column', completed: dataState.headers.length > 0 },
    { number: 3, title: 'Date Range', description: 'Filter data by date range', completed: dataState.timestampColumn !== null },
    { number: 4, title: 'Column Selection', description: 'Choose features for training', completed: dataState.dateRange.start !== null },
    { number: 5, title: 'Model Training', description: 'Configure and train anomaly detection model', completed: false },
    { number: 6, title: 'Results', description: 'View results and download output', completed: false }
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-muted bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-primary">
                <TrendingUp className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  Time Anomaly Insight
                </h1>
                <p className="text-sm text-muted-foreground">
                  Advanced Time Series Anomaly Detection Platform
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      {dataState.originalData.length === 0 && (
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <img 
              src={heroImage} 
              alt="Time series data visualization" 
              className="w-full h-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/60" />
          </div>
          <div className="relative container mx-auto px-4 py-16 text-center">
            <div className="max-w-4xl mx-auto space-y-6">
              <Badge className="bg-accent/20 text-accent-foreground border-accent/30" variant="outline">
                Professional Data Analysis
              </Badge>
              <h2 className="text-4xl md:text-6xl font-bold">
                Detect Anomalies in{' '}
                <span className="bg-gradient-data bg-clip-text text-transparent">
                  Time Series Data
                </span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Upload your CSV data, configure intelligent models, and discover temporal anomalies 
                with advanced machine learning algorithms and beautiful visualizations.
              </p>
              <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-accent" />
                  <span>Multiple ML Models</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>Real-time Processing</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-success" />
                  <span>High Accuracy</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Progress Steps */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          {steps.map((step, index) => (
            <Card 
              key={step.number}
              className={`
                relative overflow-hidden transition-all duration-300
                ${step.completed 
                  ? 'border-success bg-success/10' 
                  : currentStep === step.number 
                    ? 'border-primary bg-primary/10 shadow-glow' 
                    : 'border-muted bg-card/50'
                }
              `}
            >
              <CardContent className="p-4 text-center">
                <div className={`
                  w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center text-sm font-bold
                  ${step.completed 
                    ? 'bg-success text-success-foreground' 
                    : currentStep === step.number 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }
                `}>
                  {step.number}
                </div>
                <h3 className="font-semibold text-sm mb-1">{step.title}</h3>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {/* Step 1: File Upload */}
          {currentStep >= 1 && (
            <FileUpload 
              onFileLoad={handleFileLoad} 
              onFileSelect={handleFileSelect}
            />
          )}

          {/* Step 2: Data Preview */}
          {currentStep >= 2 && dataState.originalData.length > 0 && (
            <DataPreview 
              data={dataState.originalData}
              headers={dataState.headers}
              onTimestampColumn={handleTimestampColumn}
              selectedTimestampColumn={dataState.timestampColumn}
            />
          )}

          {/* Step 3: Date Range Filter */}
          {currentStep >= 3 && dataState.timestampColumn && (
            <DateRangeFilter 
              data={dataState.originalData}
              timestampColumn={dataState.timestampColumn}
              onDateRangeChange={handleDateRangeChange}
            />
          )}

          {/* Step 4: Column Selection */}
          {currentStep >= 4 && dataState.filteredData.length > 0 && (
            <ColumnSelection 
              headers={dataState.headers}
              data={dataState.filteredData}
              timestampColumn={dataState.timestampColumn}
              onSelectionChange={handleColumnSelection}
            />
          )}

          {/* Step 5: Model Training */}
          {currentStep >= 4 && !dataState.analysisResults && (
            <ModelTraining 
              file={dataState.selectedFile}
              onTrainingComplete={handleTrainingComplete}
            />
          )}

          {/* Step 6: Results */}
          {currentStep >= 6 && dataState.analysisResults && (
            <Results 
              results={dataState.analysisResults}
              filename={dataState.selectedFile?.name}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default Index
