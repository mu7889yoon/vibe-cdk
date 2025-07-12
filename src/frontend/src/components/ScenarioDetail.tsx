import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Calendar, FileText, Code, Download, Copy, CheckCircle } from 'lucide-react'
import { useApi } from '../contexts/ApiContext'

interface ScenarioDetailResponse {
  id: string
  scenario: any
  cdk_code: string | null
  last_modified: string
}

const ScenarioDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [scenario, setScenario] = useState<ScenarioDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'scenario' | 'cdk'>('scenario')
  const [copied, setCopied] = useState(false)
  const { api } = useApi()

  const fetchScenario = async () => {
    if (!id) return
    
    try {
      setLoading(true)
      const response = await api.get<ScenarioDetailResponse>(`/scenarios/${id}`)
      setScenario(response.data)
      setError(null)
    } catch (err) {
      setError('シナリオの取得に失敗しました')
      console.error('Error fetching scenario:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchScenario()
  }, [id])

  const handleCopyCode = async () => {
    if (!scenario?.cdk_code) return
    
    try {
      await navigator.clipboard.writeText(scenario.cdk_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link to="/scenarios" className="btn btn-outline btn-sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            戻る
          </Link>
          <div className="h-8 bg-muted rounded w-64 animate-pulse"></div>
        </div>
        <div className="grid gap-6">
          <div className="h-48 bg-muted rounded animate-pulse"></div>
          <div className="h-96 bg-muted rounded animate-pulse"></div>
        </div>
      </div>
    )
  }

  if (error || !scenario) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link to="/scenarios" className="btn btn-outline btn-sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            戻る
          </Link>
          <h2 className="text-2xl font-bold text-foreground">シナリオ詳細</h2>
        </div>
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-destructive">{error || 'シナリオが見つかりません'}</p>
        </div>
      </div>
    )
  }

  const scenarioData = scenario.scenario

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/scenarios" className="btn btn-outline btn-sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            戻る
          </Link>
          <h2 className="text-2xl font-bold text-foreground">
            {scenarioData.name || `シナリオ ${scenario.id}`}
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">
            最終更新: {formatDate(scenario.last_modified)}
          </span>
        </div>
      </div>

      {/* Scenario Info */}
      <div className="grid gap-6">
        <div className="p-4 bg-muted/20 rounded-lg">
          <div className="flex items-center space-x-2 mb-3">
            <FileText className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-medium text-foreground">シナリオ情報</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">ID</dt>
              <dd className="text-sm text-foreground">{scenario.id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">タイプ</dt>
              <dd className="text-sm text-foreground">{scenarioData.type || 'Unknown'}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-sm font-medium text-muted-foreground">説明</dt>
              <dd className="text-sm text-foreground">{scenarioData.description || 'No description'}</dd>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div>
          <div className="flex space-x-1 mb-4">
            <button
              className={`btn btn-sm ${activeTab === 'scenario' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('scenario')}
            >
              <FileText className="h-4 w-4 mr-2" />
              シナリオ詳細
            </button>
            <button
              className={`btn btn-sm ${activeTab === 'cdk' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('cdk')}
              disabled={!scenario.cdk_code}
            >
              <Code className="h-4 w-4 mr-2" />
              CDK コード
            </button>
          </div>

          {/* Tab Content */}
          <div className="bg-muted/20 rounded-lg p-4">
            {activeTab === 'scenario' && (
              <div className="space-y-4">
                <h4 className="font-medium text-foreground">シナリオ設定</h4>
                <pre className="bg-background border border-border rounded p-4 text-sm overflow-x-auto">
                  <code>{JSON.stringify(scenarioData, null, 2)}</code>
                </pre>
              </div>
            )}

            {activeTab === 'cdk' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-foreground">CDK TypeScript コード</h4>
                  {scenario.cdk_code && (
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={handleCopyCode}
                    >
                      {copied ? (
                        <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4 mr-2" />
                      )}
                      {copied ? 'コピー済み' : 'コピー'}
                    </button>
                  )}
                </div>
                {scenario.cdk_code ? (
                  <pre className="bg-background border border-border rounded p-4 text-sm overflow-x-auto">
                    <code>{scenario.cdk_code}</code>
                  </pre>
                ) : (
                  <div className="text-center py-8">
                    <Code className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">CDKコードが生成されていません</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ScenarioDetail 