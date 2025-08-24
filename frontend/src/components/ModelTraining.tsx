import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Brain, Settings, Play, AlertCircle } from 'lucide-react'
import { api, AnalysisParams, AnalysisResults } from '@/lib/api'

interface ModelTrainingProps {
  file: File | null
  onTrainingComplete: (results: AnalysisResults) => void
}

export function ModelTraining({ file, onTrainingComplete }: ModelTrainingProps) {
  const [params, setParams] = useState<AnalysisParams>({
    contamination: 0.1,
    randomState: 42
  })
  const [isTraining, setIsTraining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const handleTrain = async () => {
    if (!file) {
      setError('No file selected')
      return
    }

    setIsTraining(true)
    setError(null)
    setProgress(0)

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + Math.random() * 15, 85))
      }, 500)

      const results = await api.uploadAndAnalyze(file, params)
      
      clearInterval(progressInterval)
      setProgress(100)
      
      setTimeout(() => {
        onTrainingComplete(results)
        setIsTraining(false)
      }, 500)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Training failed')
      setIsTraining(false)
      setProgress(0)
    }
  }

  return (
    <Card className="border-muted bg-gradient-glass backdrop-blur-sm shadow-elegant">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-6 w-6 text-accent" />
          <span className="bg-gradient-accent bg-clip-text text-transparent">
            Anomaly Detection Model
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Model Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Contamination Rate
              </Label>
              <div className="px-3">
                <Slider
                  value={[params.contamination]}
                  onValueChange={([value]) => setParams(prev => ({ ...prev, contamination: value }))}
                  min={0.01}
                  max={0.5}
                  step={0.01}
                  className="w-full"
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1%</span>
                <span className="font-medium">{(params.contamination * 100).toFixed(1)}%</span>
                <span>50%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Expected proportion of anomalies in the dataset
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="random-state">Random State</Label>
              <Input
                id="random-state"
                type="number"
                value={params.randomState}
                onChange={(e) => setParams(prev => ({ ...prev, randomState: parseInt(e.target.value) || 42 }))}
                min={0}
                max={999999}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Seed for reproducible results
              </p>
            </div>
          </div>
        </div>

        {/* Model Information */}
        <div className="p-4 bg-muted/30 rounded-lg border border-muted">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Isolation Forest Algorithm
          </h4>
          <p className="text-sm text-muted-foreground">
            This model uses an ensemble of isolation trees to detect anomalies by measuring 
            how easy it is to isolate data points. Anomalies are easier to isolate and thus 
            have shorter path lengths in the trees.
          </p>
        </div>

        {/* Training Progress */}
        {isTraining && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Training Progress</span>
              <span className="text-sm text-muted-foreground">{progress.toFixed(0)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
            <p className="text-xs text-muted-foreground text-center">
              Processing data and training model...
            </p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert className="border-destructive/50 bg-destructive/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-destructive">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Training Button */}
        <div className="flex justify-center pt-4">
          <Button 
            onClick={handleTrain}
            disabled={!file || isTraining}
            size="lg"
            className="bg-gradient-primary hover:opacity-90 transition-opacity"
          >
            <Play className="h-4 w-4 mr-2" />
            {isTraining ? 'Training Model...' : 'Start Training'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}