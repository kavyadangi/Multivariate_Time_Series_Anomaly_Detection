const API_BASE_URL = 'http://localhost:5000/api'

export interface AnalysisResults {
  data: any[]
  summary: {
    totalRows: number
    scoreRange: { min: number; max: number }
    scoreDistribution: {
      normal: number
      slight: number
      moderate: number
      significant: number
      severe: number
    }
    trainingPeriodStats: { mean: number; max: number }
    topFeatures: Array<{ feature: string; count: number }>
  }
  processingTime: number
}

export interface AnalysisParams {
  contamination: number
  randomState: number
}

/** Helper: Sanitize numbers before JSON.stringify (NaN/Infinity → null) */
const safeJSON = (obj: any) =>
  JSON.stringify(obj, (_, value) =>
    typeof value === 'number' && !isFinite(value) ? null : value
  )

/** Helper: Recursively sanitize backend response (NaN/Infinity → null) */
const sanitizeData = (obj: any): any => {
  if (Array.isArray(obj)) return obj.map(sanitizeData)
  if (obj !== null && typeof obj === 'object') {
    const result: any = {}
    for (const key in obj) {
      result[key] = sanitizeData(obj[key])
    }
    return result
  }
  if (typeof obj === 'number' && !isFinite(obj)) return null
  return obj
}

export const api = {
  // System info
  async getSystemInfo() {
    const res = await fetch(`${API_BASE_URL}/info`)
    if (!res.ok) throw new Error('Failed to get system info')
    return sanitizeData(await res.json())
  },

  // Health check
  async healthCheck() {
    const res = await fetch(`${API_BASE_URL}/health`)
    if (!res.ok) throw new Error('Health check failed')
    return sanitizeData(await res.json())
  },

  // Upload file
  async uploadFile(file: File) {
    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData
    })

    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.message || 'Upload failed')
    }

    return sanitizeData(await res.json())
  },

  // Analyze data
  async analyzeData(filename: string, params: AnalysisParams) {
    const res = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: safeJSON({ filename, ...params })
    })

    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.message || 'Analysis failed')
    }

    return sanitizeData(await res.json()) as AnalysisResults
  },

  // Upload and analyze in one request
  async uploadAndAnalyze(file: File, params: AnalysisParams): Promise<AnalysisResults> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('contamination', params.contamination.toString())
    formData.append('randomState', params.randomState.toString())

    const res = await fetch(`${API_BASE_URL}/upload-and-analyze`, {
      method: 'POST',
      body: formData
    })

    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.message || 'Upload and analysis failed')
    }

    return sanitizeData(await res.json()) as AnalysisResults
  },

  // Upload and analyze (summary only)
  async uploadAndAnalyzeSummary(file: File, params: AnalysisParams) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('contamination', params.contamination.toString())
    formData.append('randomState', params.randomState.toString())

    const res = await fetch(`${API_BASE_URL}/upload-and-analyze-summary`, {
      method: 'POST',
      body: formData
    })

    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.message || 'Upload and analysis failed')
    }

    return sanitizeData(await res.json())
  },

  // Download results
  async downloadResults(filename: string) {
    const res = await fetch(`${API_BASE_URL}/download/${filename}`)
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.message || 'Download failed')
    }
    return res.blob()
  },

  // Get job status
  async getJobStatus(jobId: string) {
    const res = await fetch(`${API_BASE_URL}/status/${jobId}`)
    if (!res.ok) throw new Error('Failed to get job status')
    return sanitizeData(await res.json())
  }
}

export default api;
export { sanitizeData };
