import React, { useState, useEffect } from 'react'
import { Clock, CheckCircle, XCircle, Play, Pause, AlertTriangle } from 'lucide-react'
import { useApi } from '../contexts/ApiContext'

interface StepFunctionExecution {
  execution_arn: string
  name: string
  status: string
  start_date: string | null
  stop_date: string | null
}

interface ExecutionHistoryResponse {
  executions: StepFunctionExecution[]
  total: number
}

const ExecutionHistory: React.FC = () => {
  const [executions, setExecutions] = useState<StepFunctionExecution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { api } = useApi()

  const fetchExecutions = async () => {
    try {
      setLoading(true)
      const response = await api.get<ExecutionHistoryResponse>('/executions')
      setExecutions(response.data.executions)
      setError(null)
    } catch (err) {
      setError('実行履歴の取得に失敗しました')
      console.error('Error fetching executions:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExecutions()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'running':
        return <Play className="h-4 w-4 text-yellow-500" />
      case 'succeeded':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'stopped':
        return <Pause className="h-4 w-4 text-gray-500" />
      case 'timed_out':
        return <Clock className="h-4 w-4 text-orange-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'running':
        return 'bg-yellow-100 text-yellow-800'
      case 'succeeded':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'stopped':
        return 'bg-gray-100 text-gray-800'
      case 'timed_out':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const calculateDuration = (startDate: string | null, stopDate: string | null) => {
    if (!startDate) return 'N/A'
    
    const start = new Date(startDate)
    const end = stopDate ? new Date(stopDate) : new Date()
    const durationMs = end.getTime() - start.getTime()
    
    const seconds = Math.floor(durationMs / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  const getExecutionId = (executionArn: string) => {
    return executionArn.split(':').pop() || executionArn
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <Clock className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">実行履歴</h2>
        </div>
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 border border-border rounded-lg animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <Clock className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">実行履歴</h2>
        </div>
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Clock className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">実行履歴</h2>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">
            {executions.length} 実行
          </span>
          <button 
            onClick={fetchExecutions}
            className="btn btn-outline btn-sm"
          >
            更新
          </button>
        </div>
      </div>

      {/* Executions List */}
      <div className="space-y-4">
        {executions.length === 0 ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">実行履歴がありません</p>
          </div>
        ) : (
          <div className="space-y-3">
            {executions.map((execution) => (
              <div
                key={execution.execution_arn}
                className="p-4 border border-border rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getStatusIcon(execution.status)}
                      <span className="font-medium text-foreground">
                        {execution.name}
                      </span>
                      <span className={`badge badge-outline ${getStatusColor(execution.status)}`}>
                        {execution.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <dt className="text-muted-foreground">実行ID</dt>
                        <dd className="text-foreground font-mono text-xs">
                          {getExecutionId(execution.execution_arn)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">開始時刻</dt>
                        <dd className="text-foreground">
                          {formatDate(execution.start_date)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">終了時刻</dt>
                        <dd className="text-foreground">
                          {formatDate(execution.stop_date)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">実行時間</dt>
                        <dd className="text-foreground">
                          {calculateDuration(execution.start_date, execution.stop_date)}
                        </dd>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ExecutionHistory 