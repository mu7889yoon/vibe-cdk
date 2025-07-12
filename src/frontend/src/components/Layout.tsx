import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Settings, Database, Zap, Clock, Activity } from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation()

  const navigation = [
    { name: 'シナリオ一覧', href: '/scenarios', icon: Database },
    { name: 'FIS ダッシュボード', href: '/fis', icon: Zap },
    { name: '実行履歴', href: '/executions', icon: Clock },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-primary mr-3" />
              <h1 className="text-2xl font-bold text-foreground">Chaos Engineering</h1>
            </div>
            <nav className="flex space-x-4">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.href || 
                  (item.href === '/scenarios' && location.pathname === '/')
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-card rounded-lg shadow-sm border border-border">
          <div className="p-6">
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <p>© 2024 Chaos Engineering Platform</p>
            <div className="flex items-center space-x-4">
              <span className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                システム稼働中
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout 