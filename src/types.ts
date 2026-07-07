// 记录类型：支出 or 收入
export type ExpenseType = 'expense' | 'income'

// 花销/收入记录类型
export interface Expense {
  id: number
  type: ExpenseType // 支出还是收入
  amount: number // 金额（元），支持小数
  date: string // 日期 YYYY-MM-DD
  category: string // 一级分类名称
  subCategory: string // 二级分类名称
  note: string // 备注（可选）
  createdAt: string // 创建时间 ISO string
}

// ===== 支出预置分类 =====
export const EXPENSE_PRESET_CATEGORIES: Record<string, string[]> = {
  '🍜 餐饮饮食': ['早餐', '午餐', '晚餐', '零食饮料', '外卖', '聚餐'],
  '🚗 交通出行': ['公交地铁', '打车', '加油', '停车费', '火车机票'],
  '🛒 购物消费': ['日用品', '电子产品', '服饰鞋包', '美妆护肤', '家居用品'],
  '🏠 住房居住': ['房租', '水电费', '物业费', '维修', '宽带网费'],
  '🎮 娱乐休闲': ['电影', '游戏', '旅游度假', '运动健身', 'KTV酒吧'],
  '💊 医疗健康': ['看病买药', '体检', '牙科', '保健品'],
  '📚 教育学习': ['书籍', '课程培训', '考试报名', '文具'],
  '🎁 人情往来': ['送礼', '红包', '聚餐AA', '捐款'],
  '💰 投资理财': ['股票基金', '保险', '储蓄'],
  '📦 其他支出': ['快递', '手续费', '其他']
}

// ===== 收入预置分类 =====
export const INCOME_PRESET_CATEGORIES: Record<string, string[]> = {
  '💼 工资薪水': ['月薪', '年终奖', '绩效奖金', '加班费'],
  '📈 投资理财': ['股票基金', '利息', '分红', '租金收入'],
  '💻 兼职副业': ['接外包', '自媒体', '稿费', '咨询'],
  '🎁 红包礼金': ['节日红包', '生日礼金', '结婚礼金', '压岁钱'],
  '↩️ 退款报销': ['购物退款', '报销款', '押金退回'],
  '📦 其他收入': ['二手转让', '零花钱', '其他']
}

// 根据类型获取预置分类
export function getPresetCategories(type: ExpenseType): Record<string, string[]> {
  return type === 'expense' ? EXPENSE_PRESET_CATEGORIES : INCOME_PRESET_CATEGORIES
}

// 自定义分类在 localStorage 中的键名
export const CUSTOM_CATEGORIES_KEY = 'heimajizhang_custom_categories_v2'

// 判断某分类是否为预置分类
export function isPresetCategory(type: ExpenseType, mainCategory: string, subCategory?: string): boolean {
  const preset = getPresetCategories(type)
  if (!preset[mainCategory]) return false
  if (!subCategory) return true
  return preset[mainCategory].includes(subCategory)
}

// 向后兼容
export const CATEGORIES = EXPENSE_PRESET_CATEGORIES
export const MAIN_CATEGORIES = Object.keys(EXPENSE_PRESET_CATEGORIES)
export function getSubCategories(mainCategory: string): string[] {
  return EXPENSE_PRESET_CATEGORIES[mainCategory] || []
}

// 月度统计数据结构
export interface MonthlyStats {
  totalExpense: number // 总支出
  totalIncome: number // 总收入
  balance: number // 结余（收入 - 支出）
  byExpenseCategory: Array<{
    category: string
    amount: number
    percent: number
  }>
  byIncomeCategory: Array<{
    category: string
    amount: number
    percent: number
  }>
}
