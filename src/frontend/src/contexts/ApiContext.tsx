import React, { createContext, useContext, useEffect, useState } from 'react'
import axios, { AxiosInstance } from 'axios'

interface ApiContextType {
  api: AxiosInstance
  loading: boolean
  error: string | null
  apiUrl: string
}

const ApiContext = createContext<ApiContextType | undefined>(undefined)

export const useApi = () => {
  const context = useContext(ApiContext)
  if (context === undefined) {
    throw new Error('useApi must be used within an ApiProvider')
  }
  return context
}

interface ApiProviderProps {
  children: React.ReactNode
}

export const ApiProvider: React.FC<ApiProviderProps> = ({ children }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // API Gateway のURL（環境変数から取得）
  const apiUrl = import.meta.env.VITE_API_URL || '/api'
  
  // Axios インスタンスの作成
  const api = axios.create({
    baseURL: apiUrl,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // レスポンスインターセプターの設定
  api.interceptors.response.use(
    (response) => {
      setError(null)
      return response
    },
    (error) => {
      setError(error.message || 'API Error')
      return Promise.reject(error)
    }
  )

  // リクエストインターセプターの設定
  api.interceptors.request.use(
    (config) => {
      setLoading(true)
      return config
    },
    (error) => {
      setLoading(false)
      return Promise.reject(error)
    }
  )

  // レスポンス後にローディングを終了
  useEffect(() => {
    const responseInterceptor = api.interceptors.response.use(
      (response) => {
        setLoading(false)
        return response
      },
      (error) => {
        setLoading(false)
        return Promise.reject(error)
      }
    )

    return () => {
      api.interceptors.response.eject(responseInterceptor)
    }
  }, [api])

  const value = {
    api,
    loading,
    error,
    apiUrl,
  }

  return (
    <ApiContext.Provider value={value}>
      {children}
    </ApiContext.Provider>
  )
} 