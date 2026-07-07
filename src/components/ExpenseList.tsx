import { useState, useEffect, useCallback } from 'react'
import type { Expense, ExpenseType } from '../types'
import { getExpenses, deleteExpense, getMergedMainCategories, getMergedSubCategories } from '../storage'

interface Props {
  refreshTrigger?: number
}

/** 格式化日期为 "M月D日 周X" 的中文显示 */
function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  const weekDay = weekDays[d.getDay()]
  return `${month}月${day}日 周${weekDay}`
}

export default function ExpenseList({ refreshTrigger }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [filterType, setFilterType] = useState<ExpenseType | ''>('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterSubCategory, setFilterSubCategory] = useState('')

  const loadExpenses = useCallback(() => {
    const filter: Record<string, string> = {}
    if (filterType) filter.type = filterType
    if (filterCategory) filter.category = filterCategory
    if (filterSubCategory) filter.subCategory = filterSubCategory

    const data = getExpenses(
      Object.keys(filter).length > 0 ? filter : undefined
    )
    setExpenses(data)
  }, [filterType, filterCategory, filterSubCategory])

  useEffect(() => {
    loadExpenses()
  }, [loadExpenses, refreshTrigger])

  function handleDelete(id: number) {
    if (!confirm('确定要删除这条记录吗？')) return
    deleteExpense(id)
    loadExpenses()
  }

  // 筛选用的分类：根据已选类型显示对应分类
  const effectiveType = filterType || 'expense'
  const mainCategories = getMergedMainCategories(effectiveType)
  const subCategories = filterCategory
    ? getMergedSubCategories(effectiveType, filterCategory)
    : []

  return (
    <div className="expense-list">
      <h2>明细列表</h2>

      <div className="filter-bar">
        <select
          className="filter-select"
          value={filterType}
          onChange={(e) => {
            setFilterType(e.target.value as ExpenseType | '')
            setFilterCategory('')
            setFilterSubCategory('')
          }}
        >
          <option value="">全部类型</option>
          <option value="expense">支出</option>
          <option value="income">收入</option>
        </select>

        <select
          className="filter-select"
          value={filterCategory}
          onChange={(e) => {
            setFilterCategory(e.target.value)
            setFilterSubCategory('')
          }}
        >
          <option value="">全部类别</option>
          {mainCategories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        {subCategories.length > 0 && (
          <select
            className="filter-select"
            value={filterSubCategory}
            onChange={(e) => setFilterSubCategory(e.target.value)}
          >
            <option value="">全部小类</option>
            {subCategories.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        )}

        {(filterType || filterCategory || filterSubCategory) && (
          <button
            className="clear-filter-btn"
            onClick={() => {
              setFilterType('')
              setFilterCategory('')
              setFilterSubCategory('')
            }}
          >
            清除筛选
          </button>
        )}
      </div>

      {expenses.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📝</span>
          <p>还没有记录</p>
          <p className="empty-hint">去「记账」页面添加第一笔记录吧</p>
        </div>
      ) : (
        <div className="expense-items">
          {expenses.map((item) => {
            const isIncome = item.type === 'income'
            return (
              <div key={item.id} className={`expense-item ${isIncome ? 'income-item' : ''}`}>
                <div className="expense-left">
                  <span className="expense-category">
                    {isIncome ? '💰' : ''} {item.category}
                  </span>
                  <span className="expense-sub">{item.subCategory}</span>
                  {item.note && <span className="expense-note">{item.note}</span>}
                </div>
                <div className="expense-right">
                  <span className={`expense-amount ${isIncome ? 'income' : ''}`}>
                    {isIncome ? '+' : '-'}¥{item.amount.toFixed(2)}
                  </span>
                  <span className="expense-date">{formatDate(item.date)}</span>
                </div>
                <button
                  className="delete-btn"
                  onClick={() => handleDelete(item.id)}
                  title="删除"
                >
                  🗑
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
