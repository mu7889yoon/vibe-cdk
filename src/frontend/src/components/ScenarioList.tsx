import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, Calendar, FileText, Eye, RefreshCw } from 'lucide-react'
import { useApi } from '../contexts/ApiContext'

interface Scenario {
  id: string
  name: string
  description: string
  created_at: string
  size: number
  type: string
}

interface ScenarioListResponse {
  scenarios: Scenario[]
  total: number
}

const ScenarioList: React.FC = () => {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const { api } = useApi()

  const fetchScenarios = async () => {
    try {
      setLoading(true)
      const response = await api.get<ScenarioListResponse>('/scenarios')
      setScenarios(response.data.scenarios)
      setError(null)
    } catch (err) {
      setError('シナリオの取得に失敗しました')
      console.error('Error fetching scenarios:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchScenarios()
  }, [])

  const filteredScenarios = scenarios.filter(scenario =>
    scenario.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    scenario.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'ec2':
        return 'bg-blue-100 text-blue-800'
      case 'rds':
        return 'bg-green-100 text-green-800'
      case 'lambda':
        return 'bg-yellow-100 text-yellow-800'
      case 'network':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">シナリオ一覧</h2>
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">読み込み中...</span>
          </div>
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
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">シナリオ一覧</h2>
          <button 
            onClick={fetchScenarios}
            className="btn btn-outline btn-sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            再試行
          </button>
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
        <h2 className="text-2xl font-bold text-foreground">シナリオ一覧</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">
            {filteredScenarios.length} / {scenarios.length} シナリオ
          </span>
          <button 
            onClick={fetchScenarios}
            className="btn btn-outline btn-sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            更新
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="シナリオを検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input pl-10 w-full"
        />
      </div>

      {/* Scenario List */}
      <div className="grid gap-4">
        {filteredScenarios.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {searchTerm ? 'シナリオが見つかりません' : 'シナリオがありません'}
            </h3>
            <p className="text-muted-foreground">
              {searchTerm ? '別のキーワードで検索してください' : 'シナリオを生成してください'}
            </p>
          </div>
        ) : (
          filteredScenarios.map((scenario) => (
            <div key={scenario.id} className="p-4 border border-border rounded-lg hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-medium text-foreground">
                      {scenario.name}
                    </h3>
                    <span className={`badge badge-outline ${getTypeColor(scenario.type)}`}>
                      {scenario.type}
                    </span>
                  </div>
                  <p className="text-muted-foreground mb-3 line-clamp-2">
                    {scenario.description}
                  </p>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {formatDate(scenario.created_at)}
                    </div>
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-1" />
                      {formatFileSize(scenario.size)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Link
                    to={`/scenarios/${scenario.id}`}
                    className="btn btn-outline btn-sm"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    詳細
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default ScenarioList 