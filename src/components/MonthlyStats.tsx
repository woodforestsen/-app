import { useState, useEffect, useCallback } from 'react'
import { getMonthlyStats, getRecordedMonths } from '../storage'
import type { MonthlyStats as MonthlyStatsType } from '../types'

// 支出分类柱状图颜色
const EXPENSE_BAR_COLORS = [
  '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#a855f7'
]

// 收入分类柱状图颜色
const INCOME_BAR_COLORS = [
  '#22c55e', '#16a34a', '#15803d', '#65a30d', '#4d7c0f',
  '#059669', '#047857', '#0d9488', '#0f766e', '#115e59'
]

interface Props {
  refreshTrigger?: number
}

/** 格式化年月为 "YYYY年M月" 的中文显示 */
function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split('-')
  return `${y}年${parseInt(m)}月`
}

export default function MonthlyStats({ refreshTrigger }: Props) {
  const today = new Date()
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [stats, setStats] = useState<MonthlyStatsType | null>(null)
  const [months, setMonths] = useState<string[]>([])

  const loadStats = useCallback(() => {
    setStats(getMonthlyStats(selectedMonth))
  }, [selectedMonth])

  useEffect(() => {
    setMonths(getRecordedMonths())
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats, refreshTrigger])

  function changeMonth(delta: number) {
    const [y, m] = selectedMonth.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    setSelectedMonth(newMonth)
  }

  return (
    <div className="monthly-stats">
      <h2>月度统计</h2>

      <div className="month-picker">
        <button className="month-btn" onClick={() => changeMonth(-1)}>◀</button>
        <span className="month-label">{formatMonthLabel(selectedMonth)}</span>
        <button
          className="month-btn"
          onClick={() => changeMonth(1)}
          disabled={selectedMonth === currentMonth}
        >▶</button>
      </div>

      {!stats || (stats.totalExpense === 0 && stats.totalIncome === 0) ? (
        <div className="empty-state">
          <span className="empty-icon">📊</span>
          <p>{formatMonthLabel(selectedMonth)}还没有记录</p>
        </div>
      ) : (
        <div className="stats-content">
          {/* 收支总览 */}
          <div className="summary-cards">
            <div className="summary-card income-card">
              <span className="summary-label">总收入</span>
              <span className="summary-amount income">+¥{stats.totalIncome.toFixed(2)}</span>
            </div>
            <div className="summary-card expense-card">
              <span className="summary-label">总支出</span>
              <span className="summary-amount expense">-¥{stats.totalExpense.toFixed(2)}</span>
            </div>
            <div className={`summary-card balance-card ${stats.balance >= 0 ? 'positive' : 'negative'}`}>
              <span className="summary-label">结余</span>
              <span className="summary-amount">
                {stats.balance >= 0 ? '+' : ''}¥{stats.balance.toFixed(2)}
              </span>
            </div>
          </div>

          {/* 支出排行 */}
          {stats.byExpenseCategory.length > 0 && (
            <div className="category-chart">
              <h3>📉 支出排行</h3>
              {stats.byExpenseCategory.map((item, idx) => (
                <div key={item.category} className="chart-row">
                  <span className="chart-category">{item.category}</span>
                  <div className="chart-bar-wrapper">
                    <div
                      className="chart-bar expense-bar"
                      style={{
                        width: `${Math.max(item.percent, 3)}%`,
                        backgroundColor: EXPENSE_BAR_COLORS[idx % EXPENSE_BAR_COLORS.length]
                      }}
                    />
                  </div>
                  <span className="chart-amount expense">¥{item.amount.toFixed(2)}</span>
                  <span className="chart-percent">{item.percent}%</span>
                </div>
              ))}
            </div>
          )}

          {/* 收入排行 */}
          {stats.byIncomeCategory.length > 0 && (
            <div className="category-chart">
              <h3>📈 收入排行</h3>
              {stats.byIncomeCategory.map((item, idx) => (
                <div key={item.category} className="chart-row">
                  <span className="chart-category">{item.category}</span>
                  <div className="chart-bar-wrapper">
                    <div
                      className="chart-bar income-bar"
                      style={{
                        width: `${Math.max(item.percent, 3)}%`,
                        backgroundColor: INCOME_BAR_COLORS[idx % INCOME_BAR_COLORS.length]
                      }}
                    />
                  </div>
                  <span className="chart-amount income">¥{item.amount.toFixed(2)}</span>
                  <span className="chart-percent">{item.percent}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
