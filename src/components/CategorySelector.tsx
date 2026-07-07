import type { ExpenseType } from '../types'
import { getMergedMainCategories, getMergedSubCategories } from '../storage'

interface Props {
  type: ExpenseType
  mainCategory: string
  subCategory: string
  onMainChange: (main: string) => void
  onSubChange: (sub: string) => void
}

export default function CategorySelector({
  type,
  mainCategory,
  subCategory,
  onMainChange,
  onSubChange
}: Props) {
  const mainCategories = getMergedMainCategories(type)
  const subCategories = getMergedSubCategories(type, mainCategory)

  return (
    <div className="category-selector">
      <select
        className="category-select"
        value={mainCategory}
        onChange={(e) => onMainChange(e.target.value)}
      >
        {mainCategories.map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>

      <span className="category-arrow">→</span>

      <select
        className="category-select sub"
        value={subCategory}
        onChange={(e) => onSubChange(e.target.value)}
      >
        {subCategories.map((sub) => (
          <option key={sub} value={sub}>
            {sub}
          </option>
        ))}
      </select>
    </div>
  )
}
