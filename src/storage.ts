import type { Expense, ExpenseType } from './types'
import { getPresetCategories, CUSTOM_CATEGORIES_KEY } from './types'

const STORAGE_KEY = 'heimajizhang_expenses'
const CUSTOM_CAT_KEY = CUSTOM_CATEGORIES_KEY

// 自定义分类存储格式：{ expense: {...}, income: {...} }
interface CustomCategoriesStore {
  expense: Record<string, string[]>
  income: Record<string, string[]>
}

// 从 localStorage 读取所有记录
function readAll(): Expense[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

// 保存所有记录到 localStorage
function saveAll(expenses: Expense[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses))
}

// 生成自增 ID
function getNextId(): number {
  const all = readAll()
  if (all.length === 0) return 1
  return Math.max(...all.map((e) => e.id)) + 1
}

// ===== 记录 CRUD =====

// 添加一笔记录
export function addExpense(data: {
  type: ExpenseType
  amount: number
  date: string
  category: string
  subCategory: string
  note?: string
}): { id: number } {
  const all = readAll()
  const newExpense: Expense = {
    id: getNextId(),
    type: data.type,
    amount: data.amount,
    date: data.date,
    category: data.category,
    subCategory: data.subCategory,
    note: data.note || '',
    createdAt: new Date().toISOString()
  }
  all.push(newExpense)
  saveAll(all)
  return { id: newExpense.id }
}

// 删除一笔记录
export function deleteExpense(id: number): void {
  const all = readAll().filter((e) => e.id !== id)
  saveAll(all)
}

// 查询记录列表
export function getExpenses(filter?: {
  type?: ExpenseType
  category?: string
  subCategory?: string
  yearMonth?: string
}): Expense[] {
  let all = readAll()

  if (filter?.type) {
    all = all.filter((e) => e.type === filter.type)
  }
  if (filter?.category) {
    all = all.filter((e) => e.category === filter.category)
  }
  if (filter?.subCategory) {
    all = all.filter((e) => e.subCategory === filter.subCategory)
  }
  if (filter?.yearMonth) {
    all = all.filter((e) => e.date.startsWith(filter.yearMonth!))
  }

  // 按日期倒序，同日期按 ID 倒序
  all.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date)
    return b.id - a.id
  })

  return all
}

// 获取月度统计
export function getMonthlyStats(yearMonth: string): {
  totalExpense: number
  totalIncome: number
  balance: number
  byExpenseCategory: Array<{ category: string; amount: number; percent: number }>
  byIncomeCategory: Array<{ category: string; amount: number; percent: number }>
} {
  const records = readAll().filter((e) => e.date.startsWith(yearMonth))
  const expenses = records.filter((e) => e.type === 'expense')
  const incomes = records.filter((e) => e.type === 'income')

  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0)
  const totalIncome = incomes.reduce((sum, e) => sum + e.amount, 0)

  function aggregateByCategory(items: Expense[]): Array<{ category: string; amount: number; percent: number }> {
    const total = items.reduce((sum, e) => sum + e.amount, 0)
    const byCat = new Map<string, number>()
    for (const item of items) {
      byCat.set(item.category, (byCat.get(item.category) || 0) + item.amount)
    }
    return Array.from(byCat.entries())
      .map(([category, amount]) => ({
        category,
        amount: Math.round(amount * 100) / 100,
        percent: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0
      }))
      .sort((a, b) => b.amount - a.amount)
  }

  return {
    totalExpense: Math.round(totalExpense * 100) / 100,
    totalIncome: Math.round(totalIncome * 100) / 100,
    balance: Math.round((totalIncome - totalExpense) * 100) / 100,
    byExpenseCategory: aggregateByCategory(expenses),
    byIncomeCategory: aggregateByCategory(incomes)
  }
}

// 获取所有有记录的月份
export function getRecordedMonths(): string[] {
  const months = new Set<string>()
  for (const e of readAll()) {
    months.add(e.date.slice(0, 7))
  }
  return Array.from(months).sort().reverse()
}

// ===== 自定义分类管理 =====

// 读取用户自定义分类
export function loadCustomCategories(): CustomCategoriesStore {
  try {
    const raw = localStorage.getItem(CUSTOM_CAT_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      // 兼容旧格式（扁平结构 → 新版本嵌套结构）
      if (data.expense || data.income) {
        return {
          expense: data.expense || {},
          income: data.income || {}
        }
      }
      // 旧格式：全部视为支出自定义分类
      return { expense: data, income: {} }
    }
  } catch { /* ignore */ }
  return { expense: {}, income: {} }
}

// 保存用户自定义分类
export function saveCustomCategories(data: CustomCategoriesStore): void {
  localStorage.setItem(CUSTOM_CAT_KEY, JSON.stringify(data))
}

// 获取某种类型的自定义分类
function getCustomForType(type: ExpenseType): Record<string, string[]> {
  const all = loadCustomCategories()
  return all[type] || {}
}

// 保存某种类型的自定义分类
function saveCustomForType(type: ExpenseType, data: Record<string, string[]>): void {
  const all = loadCustomCategories()
  all[type] = data
  saveCustomCategories(all)
}

// 获取合并后的完整分类表（预设 + 自定义）
export function getMergedCategories(type: ExpenseType): Record<string, string[]> {
  const preset = getPresetCategories(type)
  const custom = getCustomForType(type)
  const merged: Record<string, string[]> = {}

  for (const [main, subs] of Object.entries(preset)) {
    const customSubs = custom[main] || []
    const allSubs = [...subs]
    for (const cs of customSubs) {
      if (!allSubs.includes(cs)) {
        allSubs.push(cs)
      }
    }
    merged[main] = allSubs
  }

  for (const [main, subs] of Object.entries(custom)) {
    if (!preset[main]) {
      merged[main] = [...subs]
    }
  }

  return merged
}

// 获取合并后的一级分类列表
export function getMergedMainCategories(type: ExpenseType): string[] {
  return Object.keys(getMergedCategories(type))
}

// 获取合并后的二级分类列表
export function getMergedSubCategories(type: ExpenseType, mainCategory: string): string[] {
  return getMergedCategories(type)[mainCategory] || []
}

// 添加自定义二级分类
export function addCustomSubCategory(type: ExpenseType, mainCategory: string, subCategory: string): void {
  const custom = getCustomForType(type)
  if (!custom[mainCategory]) {
    custom[mainCategory] = []
  }
  if (!custom[mainCategory].includes(subCategory)) {
    custom[mainCategory].push(subCategory)
  }
  saveCustomForType(type, custom)
}

// 添加自定义一级大类
export function addCustomMainCategory(type: ExpenseType, mainCategory: string, subCategories: string[]): void {
  const custom = getCustomForType(type)
  custom[mainCategory] = subCategories.filter((s) => s.trim() !== '')
  saveCustomForType(type, custom)
}

// 重命名自定义分类
export function updateCustomCategory(
  type: ExpenseType,
  oldName: string,
  newName: string,
  isMain: boolean,
  parentMain?: string
): void {
  if (isMain) {
    const custom = getCustomForType(type)
    if (custom[oldName]) {
      custom[newName] = custom[oldName]
      delete custom[oldName]
      saveCustomForType(type, custom)

      const all = readAll()
      for (const e of all) {
        if (e.type === type && e.category === oldName) {
          e.category = newName
        }
      }
      saveAll(all)
    }
  } else if (parentMain) {
    const custom = getCustomForType(type)
    if (custom[parentMain]) {
      const idx = custom[parentMain].indexOf(oldName)
      if (idx !== -1) {
        custom[parentMain][idx] = newName
        saveCustomForType(type, custom)

        const all = readAll()
        for (const e of all) {
          if (e.type === type && e.category === parentMain && e.subCategory === oldName) {
            e.subCategory = newName
          }
        }
        saveAll(all)
      }
    }
  }
}

// 删除自定义分类
export function deleteCustomCategory(
  type: ExpenseType,
  name: string,
  isMain: boolean,
  parentMain?: string
): void {
  // 确定回退分类
  const fallbackMain = type === 'expense' ? '📦 其他支出' : '📦 其他收入'
  const fallbackSub = '其他'

  if (isMain) {
    const custom = getCustomForType(type)
    delete custom[name]
    saveCustomForType(type, custom)

    const all = readAll()
    for (const e of all) {
      if (e.type === type && e.category === name) {
        e.category = fallbackMain
        e.subCategory = fallbackSub
      }
    }
    saveAll(all)
  } else if (parentMain) {
    const custom = getCustomForType(type)
    if (custom[parentMain]) {
      custom[parentMain] = custom[parentMain].filter((s) => s !== name)
      if (custom[parentMain].length === 0) {
        delete custom[parentMain]
      }
      saveCustomForType(type, custom)

      const all = readAll()
      for (const e of all) {
        if (e.type === type && e.category === parentMain && e.subCategory === name) {
          e.category = fallbackMain
          e.subCategory = fallbackSub
        }
      }
      saveAll(all)
    }
  }
}

// 向后兼容的无类型参数版本（供 CategoryManager 等使用）
export { getPresetCategories }
