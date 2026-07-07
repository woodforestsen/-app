import { describe, it, expect } from 'vitest'
import {
  getPresetCategories,
  isPresetCategory,
  getSubCategories,
  EXPENSE_PRESET_CATEGORIES,
  INCOME_PRESET_CATEGORIES,
  MAIN_CATEGORIES,
} from './types'

// ===== 预置分类常量测试 =====

describe('EXPENSE_PRESET_CATEGORIES', () => {
  it('应该包含10个一级大类', () => {
    const keys = Object.keys(EXPENSE_PRESET_CATEGORIES)
    expect(keys.length).toBe(10)
  })

  it('每个一级大类下至少有一个二级小类', () => {
    for (const [main, subs] of Object.entries(EXPENSE_PRESET_CATEGORIES)) {
      expect(subs.length).toBeGreaterThan(0)
    }
  })

  it('每个一级大类名称应该包含 emoji', () => {
    for (const key of Object.keys(EXPENSE_PRESET_CATEGORIES)) {
      // emoji 通常不是纯 ASCII 字符
      expect(key).toMatch(/[^\x00-\x7F]/)
    }
  })
})

describe('INCOME_PRESET_CATEGORIES', () => {
  it('应该包含6个一级大类', () => {
    const keys = Object.keys(INCOME_PRESET_CATEGORIES)
    expect(keys.length).toBe(6)
  })

  it('每个一级大类下至少有一个二级小类', () => {
    for (const [main, subs] of Object.entries(INCOME_PRESET_CATEGORIES)) {
      expect(subs.length).toBeGreaterThan(0)
    }
  })
})

// ===== getPresetCategories 测试 =====

describe('getPresetCategories', () => {
  it('传入 expense 应该返回支出预置分类', () => {
    const result = getPresetCategories('expense')
    expect(result).toBe(EXPENSE_PRESET_CATEGORIES)
    expect(Object.keys(result)).toContain('🍜 餐饮饮食')
  })

  it('传入 income 应该返回收入预置分类', () => {
    const result = getPresetCategories('income')
    expect(result).toBe(INCOME_PRESET_CATEGORIES)
    expect(Object.keys(result)).toContain('💼 工资薪水')
  })
})

// ===== isPresetCategory 测试 =====

describe('isPresetCategory', () => {
  it('预置的一级分类应该返回 true', () => {
    expect(isPresetCategory('expense', '🍜 餐饮饮食')).toBe(true)
    expect(isPresetCategory('expense', '🚗 交通出行')).toBe(true)
    expect(isPresetCategory('income', '💼 工资薪水')).toBe(true)
  })

  it('预置的二级分类应该返回 true', () => {
    expect(isPresetCategory('expense', '🍜 餐饮饮食', '午餐')).toBe(true)
    expect(isPresetCategory('expense', '🚗 交通出行', '打车')).toBe(true)
    expect(isPresetCategory('income', '💼 工资薪水', '月薪')).toBe(true)
  })

  it('不存在的分类应该返回 false', () => {
    expect(isPresetCategory('expense', '🏀 运动')).toBe(false)
  })

  it('不存在的一级分类下的二级分类应该返回 false', () => {
    expect(isPresetCategory('expense', '🏀 运动', '篮球')).toBe(false)
  })

  it('存在的一级分类下不存在的二级分类应该返回 false', () => {
    expect(isPresetCategory('expense', '🍜 餐饮饮食', '火锅自助')).toBe(false)
  })

  it('收入类型的分类在支出里应该返回 false（除非同时存在于两者）', () => {
    // 收入独有的分类
    expect(isPresetCategory('expense', '💼 工资薪水')).toBe(false)
  })
})

// ===== 向后兼容函数测试 =====

describe('MAIN_CATEGORIES', () => {
  it('应该等于支出预置分类的一级列表', () => {
    expect(MAIN_CATEGORIES).toEqual(Object.keys(EXPENSE_PRESET_CATEGORIES))
  })
})

describe('getSubCategories', () => {
  it('传入存在的一级分类应该返回对应的二级小类列表', () => {
    const subs = getSubCategories('🍜 餐饮饮食')
    expect(subs).toContain('早餐')
    expect(subs).toContain('午餐')
    expect(subs).toContain('晚餐')
    expect(subs.length).toBe(6)
  })

  it('传入不存在的一级分类应该返回空数组', () => {
    const subs = getSubCategories('不存在的分类')
    expect(subs).toEqual([])
  })
})
