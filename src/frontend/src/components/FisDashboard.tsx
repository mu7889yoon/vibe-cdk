import React, { useState, useEffect } from 'react'
import { Zap, Play, Pause, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'
import { useApi } from '../contexts/ApiContext'

interface FisExperiment {
  id: string
  state: {
    status: string
    reason?: string
  }
  creation_time: string | null
  tags: Record<string, string>
}

interface FisExperimentDetail {
  id: string
  experiment: any
  logs: Array<{
    timestamp: string
    message: string
    stream: string
  }>
}

interface FisExperimentsResponse {
  experiments: FisExperiment[]
  total: number
}

const FisDashboard: React.FC = () => {
  const [experiments, setExperiments] = useState<FisExperiment[]>([])
  const [selectedExperiment, setSelectedExperiment] = useState<string | null>(null)
  const [experimentDetail, setExperimentDetail] = useState<FisExperimentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { api } = useApi()

  const fetchExperiments = async () => {
    try {
      setLoading(true)
      const response = await api.get<FisExperimentsResponse>('/fis/experiments')
      setExperiments(response.data.experiments)
      setError(null)
    } catch (err) {
      setError('FIS実験の取得に失敗しました')
      console.error('Error fetching experiments:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchExperimentDetail = async (experimentId: string) => {
    try {
      setDetailLoading(true)
      const response = await api.get<FisExperimentDetail>(`/fis/experiments/${experimentId}`)
      setExperimentDetail(response.data)
    } catch (err) {
      console.error('Error fetching experiment detail:', err)
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => {
    fetchExperiments()
  }, [])

  useEffect(() => {
    if (selectedExperiment) {
      fetchExperimentDetail(selectedExperiment)
    }
  }, [selectedExperiment])

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'running':
        return <Play className="h-4 w-4 text-yellow-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'stopped':
        return <Pause className="h-4 w-4 text-gray-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'running':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'stopped':
        return 'bg-gray-100 text-gray-800'
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
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <Zap className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">FIS ダッシュボード</h2>
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
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
          <Zap className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">FIS ダッシュボード</h2>
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
          <Zap className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">FIS ダッシュボード</h2>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">
            {experiments.length} 実験
          </span>
          <button 
            onClick={fetchExperiments}
            className="btn btn-outline btn-sm"
          >
            更新
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Experiments List */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-foreground">実験一覧</h3>
          <div className="space-y-2">
            {experiments.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">FIS実験がありません</p>
              </div>
            ) : (
              experiments.map((experiment) => (
                <div
                  key={experiment.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedExperiment === experiment.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/20'
                  }`}
                  onClick={() => setSelectedExperiment(experiment.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {getStatusIcon(experiment.state.status)}
                        <span className="font-medium text-foreground truncate">
                          {experiment.id}
                        </span>
                        <span className={`badge badge-outline ${getStatusColor(experiment.state.status)}`}>
                          {experiment.state.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        作成日時: {formatDate(experiment.creation_time)}
                      </p>
                      {experiment.state.reason && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {experiment.state.reason}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Experiment Detail */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-foreground">実験詳細</h3>
          {selectedExperiment ? (
            <div className="border border-border rounded-lg p-4">
              {detailLoading ? (
                <div className="space-y-4">
                  <div className="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
                  <div className="h-3 bg-muted rounded w-1/2 animate-pulse"></div>
                  <div className="h-32 bg-muted rounded animate-pulse"></div>
                </div>
              ) : experimentDetail ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-foreground mb-2">実験ID</h4>
                    <p className="text-sm text-muted-foreground font-mono">
                      {experimentDetail.id}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-foreground mb-2">実験設定</h4>
                    <pre className="bg-background border border-border rounded p-3 text-xs overflow-x-auto">
                      <code>{JSON.stringify(experimentDetail.experiment, null, 2)}</code>
                    </pre>
                  </div>

                  {experimentDetail.logs && experimentDetail.logs.length > 0 && (
                    <div>
                      <h4 className="font-medium text-foreground mb-2">ログ</h4>
                      <div className="bg-background border border-border rounded p-3 max-h-64 overflow-y-auto">
                        {experimentDetail.logs.map((log, index) => (
                          <div key={index} className="text-xs mb-2">
                            <span className="text-muted-foreground">
                              {new Date(log.timestamp).toLocaleTimeString('ja-JP')}
                            </span>
                            <span className="text-muted-foreground ml-2">
                              [{log.stream}]
                            </span>
                            <br />
                            <span className="text-foreground">{log.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">実験詳細の読み込みに失敗しました</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 border border-border rounded-lg">
              <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">実験を選択してください</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default FisDashboard 