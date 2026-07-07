import { useState } from 'react'
import type { ExpenseType } from '../types'
import { addExpense, getMergedMainCategories, getMergedSubCategories } from '../storage'
import CategorySelector from './CategorySelector'

interface Props {
  onSuccess: () => void
}

export default function AddExpensePanel({ onSuccess }: Props) {
  const today = new Date().toISOString().slice(0, 10)

  const [recordType, setRecordType] = useState<ExpenseType>('expense')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today)
  const [category, setCategory] = useState(getMergedMainCategories('expense')[0])
  const [subCategory, setSubCategory] = useState(getMergedSubCategories('expense', getMergedMainCategories('expense')[0])[0])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const handleTypeChange = (newType: ExpenseType) => {
    setRecordType(newType)
    const mains = getMergedMainCategories(newType)
    const firstMain = mains[0]
    setCategory(firstMain)
    setSubCategory(getMergedSubCategories(newType, firstMain)[0])
  }

  const handleCategoryChange = (mainCat: string) => {
    setCategory(mainCat)
    setSubCategory(getMergedSubCategories(recordType, mainCat)[0])
  }

  const handleSubmit = () => {
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('请输入正确的金额')
      return
    }

    setSaving(true)
    setTimeout(() => {
      addExpense({
        type: recordType,
        amount: Math.round(numAmount * 100) / 100,
        date,
        category,
        subCategory,
        note: note.trim()
      })
      setAmount('')
      setNote('')
      setDate(today)
      setSaving(false)
      onSuccess()
    }, 150)
  }

  return (
    <div className="add-expense">
      <h2>记一笔</h2>

      {/* 收入 / 支出 切换 */}
      <div className="type-toggle">
        <button
          className={`type-btn expense ${recordType === 'expense' ? 'active' : ''}`}
          onClick={() => handleTypeChange('expense')}
        >
          支出
        </button>
        <button
          className={`type-btn income ${recordType === 'income' ? 'active' : ''}`}
          onClick={() => handleTypeChange('income')}
        >
          收入
        </button>
      </div>

      <div className="form-group">
        <label>金额（元）</label>
        <div className="amount-input-wrapper">
          <span className={`currency-symbol ${recordType}`}>
            {recordType === 'expense' ? '¥' : '¥'}
          </span>
          <input
            type="number"
            className="amount-input"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.01"
            min="0"
            autoFocus
          />
        </div>
      </div>

      <div className="form-group">
        <label>日期</label>
        <input
          type="date"
          className="date-input"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>分类</label>
        <CategorySelector
          type={recordType}
          mainCategory={category}
          subCategory={subCategory}
          onMainChange={handleCategoryChange}
          onSubChange={setSubCategory}
        />
      </div>

      <div className="form-group">
        <label>备注（可选）</label>
        <input
          type="text"
          className="note-input"
          placeholder={recordType === 'expense' ? '比如：中午吃了个汉堡' : '比如：这个月工资'}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={100}
        />
      </div>

      <button
        className={`submit-btn ${recordType}`}
        onClick={handleSubmit}
        disabled={saving || !amount}
      >
        {saving ? '保存中...' : recordType === 'expense' ? '✓ 记录支出' : '✓ 记录收入'}
      </button>
    </div>
  )
}
