import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Papa from 'papaparse'

interface FileUploadProps {
  onFileLoad: (data: any[], headers: string[]) => void
  onFileSelect: (file: File) => void
}

export function FileUpload({ onFileLoad, onFileSelect }: FileUploadProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  const processFile = useCallback((file: File) => {
    setIsLoading(true)
    setError(null)
    setUploadedFile(file)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(`Parse error: ${results.errors[0].message}`)
          setIsLoading(false)
          return
        }

        const data = results.data as any[]
        const headers = results.meta.fields || []
        
        if (data.length === 0) {
          setError('No data found in the CSV file')
          setIsLoading(false)
          return
        }

        onFileLoad(data, headers)
        onFileSelect(file)
        setIsLoading(false)
      },
      error: (error) => {
        setError(`File processing error: ${error.message}`)
        setIsLoading(false)
      }
    })
  }, [onFileLoad])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      processFile(file)
    }
  }, [processFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    maxFiles: 1,
    multiple: false
  })

  return (
    <Card className="relative overflow-hidden border-muted bg-gradient-glass backdrop-blur-sm shadow-elegant transition-all duration-300 hover:shadow-glow">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-xl font-semibold bg-gradient-primary bg-clip-text text-transparent">
          <FileText className="h-6 w-6 text-primary" />
          Upload Dataset
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          {...getRootProps()}
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-300
            ${isDragActive 
              ? 'border-primary bg-primary/5 shadow-data' 
              : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30'
            }
            ${isLoading ? 'pointer-events-none opacity-60' : ''}
          `}
        >
          <input {...getInputProps()} />
          
          <div className="flex flex-col items-center gap-4">
            <div className={`
              p-4 rounded-full bg-primary/10 transition-all duration-300
              ${isDragActive ? 'scale-110 bg-primary/20' : ''}
              ${isLoading ? 'animate-pulse-glow' : ''}
            `}>
              <Upload className={`h-8 w-8 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            
            <div className="space-y-2">
              <p className="text-lg font-medium">
                {isDragActive ? 'Drop your CSV file here' : 'Upload your CSV dataset'}
              </p>
              <p className="text-sm text-muted-foreground">
                Drag and drop your CSV file here, or click to browse
              </p>
            </div>
            
            {!isDragActive && (
              <Button variant="outline" className="mt-2">
                Browse Files
              </Button>
            )}
          </div>
          
          {uploadedFile && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg border">
              <p className="text-sm font-medium text-foreground">
                📄 {uploadedFile.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          )}
        </div>

        {error && (
          <Alert className="mt-4 border-destructive/50 bg-destructive/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-destructive">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {isLoading && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Processing your CSV file...
          </div>
        )}
      </CardContent>
    </Card>
  )
}