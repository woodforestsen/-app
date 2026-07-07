import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock localStorage — 每次测试前重置
const mockStore = new Map<string, string>()

beforeEach(() => {
  mockStore.clear()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => mockStore.get(key) ?? null,
    setItem: (key: string, value: string) => { mockStore.set(key, value) },
    removeItem: (key: string) => { mockStore.delete(key) },
  })
})

// 每次测试前重新导入，确保使用干净的 mock
import {
  addExpense,
  deleteExpense,
  getExpenses,
  getMonthlyStats,
  getRecordedMonths,
  loadCustomCategories,
  saveCustomCategories,
  getMergedCategories,
  getMergedMainCategories,
  getMergedSubCategories,
  addCustomSubCategory,
  addCustomMainCategory,
  updateCustomCategory,
  deleteCustomCategory,
} from './storage'

// ===== 辅助函数：快速创建测试数据 =====
function seedExpense(overrides: Record<string, unknown> = {}) {
  return addExpense({
    type: 'expense',
    amount: 100,
    date: '2026-07-01',
    category: '🍜 餐饮饮食',
    subCategory: '午餐',
    ...overrides,
  } as Parameters<typeof addExpense>[0])
}

function seedIncome(overrides: Record<string, unknown> = {}) {
  return addExpense({
    type: 'income',
    amount: 5000,
    date: '2026-07-01',
    category: '💼 工资薪水',
    subCategory: '月薪',
    ...overrides,
  } as Parameters<typeof addExpense>[0])
}

// ===== addExpense 测试 =====

describe('addExpense', () => {
  it('添加一笔支出后，返回的 id 应该是数字', () => {
    const result = seedExpense()
    expect(typeof result.id).toBe('number')
    expect(result.id).toBeGreaterThan(0)
  })

  it('添加一笔支出后，getExpenses 应该能查到', () => {
    seedExpense()
    const records = getExpenses()
    expect(records.length).toBe(1)
    expect(records[0].amount).toBe(100)
    expect(records[0].category).toBe('🍜 餐饮饮食')
    expect(records[0].subCategory).toBe('午餐')
  })

  it('多笔记录的 ID 应该自动递增不重复', () => {
    const r1 = seedExpense()
    const r2 = seedExpense()
    const r3 = seedExpense()
    expect(r1.id).not.toBe(r2.id)
    expect(r2.id).not.toBe(r3.id)
    expect(r1.id).not.toBe(r3.id)
  })

  it('金额应该支持小数', () => {
    seedExpense({ amount: 12.5 })
    const records = getExpenses()
    expect(records[0].amount).toBe(12.5)
  })

  it('备注为空时应该存储为空字符串', () => {
    seedExpense({ note: undefined })
    const records = getExpenses()
    expect(records[0].note).toBe('')
  })

  it('备注有内容时应该正确保存', () => {
    seedExpense({ note: '中午吃了个汉堡' })
    const records = getExpenses()
    expect(records[0].note).toBe('中午吃了个汉堡')
  })

  it('添加收入记录应该正确保存类型', () => {
    seedIncome()
    const records = getExpenses()
    expect(records[0].type).toBe('income')
  })

  it('空数据库时第一笔记录的 ID 应该是 1', () => {
    const result = seedExpense()
    expect(result.id).toBe(1)
  })

  it('每条记录应该自动生成 createdAt 时间戳', () => {
    seedExpense()
    const records = getExpenses()
    expect(records[0].createdAt).toBeTruthy()
    // 应该是合法的 ISO 日期格式
    expect(() => new Date(records[0].createdAt)).not.toThrow()
  })
})

// ===== deleteExpense 测试 =====

describe('deleteExpense', () => {
  it('删除一条存在的记录后，getExpenses 应该少一条', () => {
    const { id } = seedExpense()
    expect(getExpenses().length).toBe(1)
    deleteExpense(id)
    expect(getExpenses().length).toBe(0)
  })

  it('删除不存在的 ID 不应该影响其他记录', () => {
    seedExpense()
    seedExpense()
    expect(getExpenses().length).toBe(2)
    deleteExpense(999)
    expect(getExpenses().length).toBe(2)
  })

  it('删除后，被删记录不应该再出现在列表中', () => {
    seedExpense({ amount: 50 })
    const { id } = seedExpense({ amount: 100 })
    deleteExpense(id)
    const records = getExpenses()
    expect(records.length).toBe(1)
    expect(records[0].amount).toBe(50)
  })
})

// ===== getExpenses 测试 =====

describe('getExpenses', () => {
  it('空数据库应该返回空数组', () => {
    expect(getExpenses()).toEqual([])
  })

  it('无筛选条件时应该返回全部记录，按日期倒序排列', () => {
    seedExpense({ amount: 10, date: '2026-07-01' })
    seedExpense({ amount: 20, date: '2026-07-02' })
    seedExpense({ amount: 30, date: '2026-07-03' })

    const records = getExpenses()
    expect(records.length).toBe(3)
    // 日期倒序：最新的在前
    expect(records[0].date).toBe('2026-07-03')
    expect(records[2].date).toBe('2026-07-01')
  })

  it('按 type 筛选 — 只显示支出', () => {
    seedExpense({ amount: 10 })
    seedIncome({ amount: 5000 })

    const expenses = getExpenses({ type: 'expense' })
    expect(expenses.length).toBe(1)
    expect(expenses[0].amount).toBe(10)
    expect(expenses[0].type).toBe('expense')
  })

  it('按 type 筛选 — 只显示收入', () => {
    seedExpense({ amount: 10 })
    seedIncome({ amount: 5000 })

    const incomes = getExpenses({ type: 'income' })
    expect(incomes.length).toBe(1)
    expect(incomes[0].amount).toBe(5000)
  })

  it('按 category 筛选', () => {
    seedExpense({ amount: 10, category: '🍜 餐饮饮食' })
    seedExpense({ amount: 20, category: '🚗 交通出行' })

    const food = getExpenses({ category: '🍜 餐饮饮食' })
    expect(food.length).toBe(1)
    expect(food[0].amount).toBe(10)
  })

  it('按 subCategory 筛选', () => {
    seedExpense({ amount: 10, category: '🍜 餐饮饮食', subCategory: '午餐' })
    seedExpense({ amount: 20, category: '🍜 餐饮饮食', subCategory: '晚餐' })

    const lunch = getExpenses({ subCategory: '午餐' })
    expect(lunch.length).toBe(1)
    expect(lunch[0].amount).toBe(10)
  })

  it('按 yearMonth 筛选', () => {
    seedExpense({ amount: 10, date: '2026-06-15' })
    seedExpense({ amount: 20, date: '2026-07-01' })
    seedExpense({ amount: 30, date: '2026-07-20' })

    const july = getExpenses({ yearMonth: '2026-07' })
    expect(july.length).toBe(2)
    const amounts = july.map((r) => r.amount)
    expect(amounts).toContain(20)
    expect(amounts).toContain(30)
  })

  it('多条件组合筛选', () => {
    seedExpense({ amount: 10, type: 'expense', category: '🍜 餐饮饮食', date: '2026-07-01' })
    seedIncome({ amount: 5000, type: 'income', category: '💼 工资薪水', date: '2026-07-01' })
    seedExpense({ amount: 20, type: 'expense', category: '🚗 交通出行', date: '2026-07-02' })

    const result = getExpenses({
      type: 'expense',
      yearMonth: '2026-07',
    })
    expect(result.length).toBe(2)
    result.forEach((r) => expect(r.type).toBe('expense'))
  })

  it('同日期的记录应该按 ID 倒序排列', () => {
    const r1 = seedExpense({ amount: 10, date: '2026-07-01' })
    const r2 = seedExpense({ amount: 20, date: '2026-07-01' })

    const records = getExpenses()
    // ID 大的在前（后添加的在前）
    expect(records[0].id).toBe(r2.id)
    expect(records[1].id).toBe(r1.id)
  })
})

// ===== getMonthlyStats 测试 =====

describe('getMonthlyStats', () => {
  it('空月份应该返回全部为 0 的统计数据', () => {
    const stats = getMonthlyStats('2026-07')
    expect(stats.totalExpense).toBe(0)
    expect(stats.totalIncome).toBe(0)
    expect(stats.balance).toBe(0)
    expect(stats.byExpenseCategory).toEqual([])
    expect(stats.byIncomeCategory).toEqual([])
  })

  it('应该正确计算总支出', () => {
    seedExpense({ amount: 100, date: '2026-07-01' })
    seedExpense({ amount: 200, date: '2026-07-15' })
    seedExpense({ amount: 50, date: '2026-06-01' }) // 不同月份，不计入

    const stats = getMonthlyStats('2026-07')
    expect(stats.totalExpense).toBe(300)
  })

  it('应该正确计算总收入和结余', () => {
    seedIncome({ amount: 5000, date: '2026-07-01' })
    seedExpense({ amount: 300, date: '2026-07-01' })

    const stats = getMonthlyStats('2026-07')
    expect(stats.totalIncome).toBe(5000)
    expect(stats.totalExpense).toBe(300)
    expect(stats.balance).toBe(4700)
  })

  it('支出分类汇总额应该正确', () => {
    seedExpense({ amount: 100, category: '🍜 餐饮饮食', date: '2026-07-01' })
    seedExpense({ amount: 200, category: '🍜 餐饮饮食', date: '2026-07-02' })
    seedExpense({ amount: 50, category: '🚗 交通出行', date: '2026-07-01' })

    const stats = getMonthlyStats('2026-07')
    expect(stats.byExpenseCategory.length).toBe(2)

    const food = stats.byExpenseCategory.find((c) => c.category === '🍜 餐饮饮食')
    expect(food?.amount).toBe(300)
    expect(food?.percent).toBe(85.7) // 300/350 ≈ 85.7%

    const transport = stats.byExpenseCategory.find((c) => c.category === '🚗 交通出行')
    expect(transport?.amount).toBe(50)
  })

  it('分类百分比总和应该接近 100%', () => {
    seedExpense({ amount: 30, category: '🍜 餐饮饮食', date: '2026-07-01' })
    seedExpense({ amount: 30, category: '🚗 交通出行', date: '2026-07-01' })
    seedExpense({ amount: 40, category: '🛒 购物消费', date: '2026-07-01' })

    const stats = getMonthlyStats('2026-07')
    const totalPercent = stats.byExpenseCategory.reduce((sum, c) => sum + c.percent, 0)
    expect(totalPercent).toBeGreaterThanOrEqual(99)
    expect(totalPercent).toBeLessThanOrEqual(101)
  })

  it('金额应该四舍五入到两位小数', () => {
    seedExpense({ amount: 10.126, date: '2026-07-01' })
    seedExpense({ amount: 10.124, date: '2026-07-01' })

    const stats = getMonthlyStats('2026-07')
    expect(stats.totalExpense).toBe(20.25)
  })

  it('跨月份的数据不应该被混入', () => {
    seedExpense({ amount: 100, date: '2026-06-30' })
    seedExpense({ amount: 200, date: '2026-07-01' })
    seedExpense({ amount: 300, date: '2026-08-01' })

    const stats = getMonthlyStats('2026-07')
    expect(stats.totalExpense).toBe(200)
  })
})

// ===== getRecordedMonths 测试 =====

describe('getRecordedMonths', () => {
  it('空数据库应该返回空数组', () => {
    expect(getRecordedMonths()).toEqual([])
  })

  it('应该返回所有有记录的月份，按倒序排列', () => {
    seedExpense({ date: '2026-05-10' })
    seedExpense({ date: '2026-07-01' })
    seedExpense({ date: '2026-06-15' })

    const months = getRecordedMonths()
    expect(months).toEqual(['2026-07', '2026-06', '2026-05'])
  })

  it('同一月份的多次记录只应该返回一次', () => {
    seedExpense({ date: '2026-07-01' })
    seedExpense({ date: '2026-07-15' })
    seedExpense({ date: '2026-07-30' })

    const months = getRecordedMonths()
    expect(months).toEqual(['2026-07'])
  })
})

// ===== 自定义分类管理测试 =====

describe('loadCustomCategories', () => {
  it('空数据库应该返回空结构', () => {
    const result = loadCustomCategories()
    expect(result).toEqual({ expense: {}, income: {} })
  })

  it('应该兼容旧格式（扁平结构）', () => {
    // 模拟旧格式：直接存储一个对象（没有 expense/income 嵌套）
    mockStore.set('heimajizhang_custom_categories_v2', JSON.stringify({
      '🍜 餐饮饮食': ['火锅'],
    }))
    const result = loadCustomCategories()
    expect(result.expense).toHaveProperty('🍜 餐饮饮食')
    expect(result.income).toEqual({})
  })
})

describe('saveCustomCategories & loadCustomCategories', () => {
  it('保存后再读取，数据应该一致', () => {
    const data = {
      expense: { '🍜 餐饮饮食': ['火锅'] },
      income: { '💼 工资薪水': ['兼职'] },
    }
    saveCustomCategories(data)
    const loaded = loadCustomCategories()
    expect(loaded).toEqual(data)
  })
})

// ===== 合并分类测试 =====

describe('getMergedCategories', () => {
  it('没有自定义分类时，应该返回纯预置分类', () => {
    const merged = getMergedCategories('expense')
    // 应该包含所有预置分类
    expect(Object.keys(merged)).toContain('🍜 餐饮饮食')
    expect(Object.keys(merged)).toContain('🚗 交通出行')
  })

  it('自定义二级分类应该合并到预置大类下', () => {
    addCustomSubCategory('expense', '🍜 餐饮饮食', '火锅')
    const merged = getMergedCategories('expense')
    expect(merged['🍜 餐饮饮食']).toContain('火锅')
  })

  it('不重复添加已存在的二级分类', () => {
    addCustomSubCategory('expense', '🍜 餐饮饮食', '午餐') // 已存在
    addCustomSubCategory('expense', '🍜 餐饮饮食', '午餐') // 重复添加
    const merged = getMergedCategories('expense')
    const lunchCount = merged['🍜 餐饮饮食'].filter((s) => s === '午餐').length
    expect(lunchCount).toBe(1)
  })
})

describe('getMergedMainCategories', () => {
  it('应该返回合并后的一级分类列表', () => {
    addCustomMainCategory('expense', '🏀 运动', ['篮球', '足球'])
    const mains = getMergedMainCategories('expense')
    expect(mains).toContain('🏀 运动')
    expect(mains).toContain('🍜 餐饮饮食')
  })
})

describe('getMergedSubCategories', () => {
  it('存在的大类应该返回二级分类列表', () => {
    const subs = getMergedSubCategories('expense', '🍜 餐饮饮食')
    expect(subs.length).toBeGreaterThan(0)
    expect(subs).toContain('午餐')
  })

  it('不存在的大类应该返回空数组', () => {
    const subs = getMergedSubCategories('expense', '不存在的分类')
    expect(subs).toEqual([])
  })
})

// ===== 添加自定义分类测试 =====

describe('addCustomMainCategory', () => {
  it('应该能添加新的一级大类', () => {
    addCustomMainCategory('expense', '🏀 运动', ['篮球', '足球'])
    const merged = getMergedCategories('expense')
    expect(merged['🏀 运动']).toEqual(['篮球', '足球'])
  })

  it('空字符串的子分类应该被过滤掉', () => {
    addCustomMainCategory('expense', '🏀 运动', ['篮球', '', '  '])
    const merged = getMergedCategories('expense')
    expect(merged['🏀 运动']).toEqual(['篮球'])
  })

  it('收入类型和支出类型的自定义分类互不影响', () => {
    addCustomMainCategory('expense', '🏀 运动', ['篮球'])
    addCustomMainCategory('income', '🎵 音乐', ['乐器'])

    const expenseMerged = getMergedCategories('expense')
    const incomeMerged = getMergedCategories('income')

    expect(expenseMerged['🏀 运动']).toBeDefined()
    expect(expenseMerged['🎵 音乐']).toBeUndefined()
    expect(incomeMerged['🎵 音乐']).toBeDefined()
    expect(incomeMerged['🏀 运动']).toBeUndefined()
  })
})

// ===== 更新自定义分类测试 =====

describe('updateCustomCategory', () => {
  it('应该能重命名一级自定义分类', () => {
    addCustomMainCategory('expense', '🏀 运动', ['篮球'])
    updateCustomCategory('expense', '🏀 运动', '⚽ 球类运动', true)

    const merged = getMergedCategories('expense')
    expect(merged['🏀 运动']).toBeUndefined()
    expect(merged['⚽ 球类运动']).toEqual(['篮球'])
  })

  it('重命名一级分类后，已有记录的分类名也应该更新', () => {
    addCustomMainCategory('expense', '🏀 运动', ['篮球'])
    seedExpense({ category: '🏀 运动', subCategory: '篮球' })

    updateCustomCategory('expense', '🏀 运动', '⚽ 球类运动', true)

    const records = getExpenses()
    expect(records[0].category).toBe('⚽ 球类运动')
  })

  it('应该能重命名二级自定义分类', () => {
    addCustomSubCategory('expense', '🍜 餐饮饮食', '火锅')
    updateCustomCategory('expense', '火锅', '麻辣烫', false, '🍜 餐饮饮食')

    const subs = getMergedSubCategories('expense', '🍜 餐饮饮食')
    expect(subs).toContain('麻辣烫')
    expect(subs).not.toContain('火锅')
  })

  it('重命名二级分类后，已有记录的子分类名也应该更新', () => {
    addCustomSubCategory('expense', '🍜 餐饮饮食', '火锅')
    seedExpense({ category: '🍜 餐饮饮食', subCategory: '火锅' })

    updateCustomCategory('expense', '火锅', '麻辣烫', false, '🍜 餐饮饮食')

    const records = getExpenses()
    expect(records[0].subCategory).toBe('麻辣烫')
  })
})

// ===== 删除自定义分类测试 =====

describe('deleteCustomCategory', () => {
  it('删除一级自定义分类后，合并分类中应该不再包含', () => {
    addCustomMainCategory('expense', '🏀 运动', ['篮球'])
    deleteCustomCategory('expense', '🏀 运动', true)

    const merged = getMergedCategories('expense')
    expect(merged['🏀 运动']).toBeUndefined()
  })

  it('删除一级分类后，该分类下的记录应该迁移到默认分类', () => {
    addCustomMainCategory('expense', '🏀 运动', ['篮球'])
    seedExpense({ category: '🏀 运动', subCategory: '篮球' })

    deleteCustomCategory('expense', '🏀 运动', true)

    const records = getExpenses()
    expect(records[0].category).toBe('📦 其他支出')
    expect(records[0].subCategory).toBe('其他')
  })

  it('删除二级自定义分类后，记录也应该迁移到默认分类', () => {
    addCustomSubCategory('expense', '🍜 餐饮饮食', '火锅')
    seedExpense({ category: '🍜 餐饮饮食', subCategory: '火锅' })

    deleteCustomCategory('expense', '火锅', false, '🍜 餐饮饮食')

    const records = getExpenses()
    expect(records[0].category).toBe('📦 其他支出')
    expect(records[0].subCategory).toBe('其他')
  })

  it('删除二级分类后如果该大类下没有自定义分类了，大类条目也应该清理', () => {
    addCustomSubCategory('expense', '🍜 餐饮饮食', '火锅')
    deleteCustomCategory('expense', '火锅', false, '🍜 餐饮饮食')

    // 预置分类不受影响
    const merged = getMergedCategories('expense')
    expect(merged['🍜 餐饮饮食']).toBeDefined()
  })
})
