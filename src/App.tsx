import { useState } from 'react'
import AddExpense from './components/AddExpense'
import ExpenseList from './components/ExpenseList'
import MonthlyStats from './components/MonthlyStats'
import CategoryManager from './components/CategoryManager'
import SnakeGame from './components/SnakeGame'

type Tab = 'add' | 'list' | 'stats' | 'categories' | 'snake'

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('add')
  // 用于触发列表刷新
  const [refreshKey, setRefreshKey] = useState(0)

  const handleExpenseAdded = () => {
    setRefreshKey((k) => k + 1)
    setActiveTab('list')
  }

  const handleCategoriesChanged = () => {
    setRefreshKey((k) => k + 1)
  }

  const tabs: Array<{ key: Tab; label: string; icon: string }> = [
    { key: 'add', label: '记账', icon: '✏️' },
    { key: 'list', label: '明细', icon: '📋' },
    { key: 'stats', label: '统计', icon: '📊' },
    { key: 'categories', label: '分类', icon: '🏷️' },
    { key: 'snake', label: '贪吃蛇', icon: '🐍' }
  ]

  return (
    <div className="app">
      <header className="app-header">
        <h1>🐴 黑马记账</h1>
      </header>

      <nav className="tab-bar">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </nav>

      <main className="app-main">
        {activeTab === 'add' && <AddExpense onSuccess={handleExpenseAdded} />}
        {activeTab === 'list' && <ExpenseList key={refreshKey} />}
        {activeTab === 'stats' && <MonthlyStats key={refreshKey} />}
        {activeTab === 'categories' && (
          <CategoryManager key={refreshKey} onCategoriesChanged={handleCategoriesChanged} />
        )}
        {activeTab === 'snake' && <SnakeGame />}
      </main>
    </div>
  )
}
