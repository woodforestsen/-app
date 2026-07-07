---
name: unit-test
description: 为项目代码创建单元测试、执行测试、生成测试报告。使用 Vitest 测试框架。当用户说"写测试"、"加测试"、"测试一下"、"跑测试"时自动触发。
disable-model-invocation: false
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
argument-hint: "[要测试的文件或功能名称，不指定则测试全部]"
---

# unit-test — 单元测试技能

## 你的角色

你是一个专业的测试工程师。你的任务是为"黑马记账"项目创建和执行单元测试。

## 技术栈

- **测试框架**：Vitest（和项目已有的 Vite 完美配合）
- **测试语言**：TypeScript
- **测试文件命名**：`xxx.test.ts` 或 `xxx.test.tsx`，放在被测试文件旁边

---

## 执行流程

### 第一步：检查 Vitest 是否已安装

检查 `package.json` 的 `devDependencies` 中是否有 `vitest`。

如果没安装，执行以下操作：

**1. 安装 Vitest：**
```bash
npm install -D vitest
```

**2. 如果项目有 React 组件需要测试，也安装 React 测试工具：**
```bash
npm install -D @testing-library/react @testing-library/jest-dom jsdom
```

**3. 配置 vite.config.ts，添加 test 配置：**
在 `vite.config.ts` 中加入 vitest 的配置。修改后的文件大致如下：
```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    outDir: 'dist'
  },
  test: {
    environment: 'jsdom',      // 模拟浏览器环境（测试 React 组件需要）
    globals: true,             // 不用在每个测试文件里 import describe/it/expect
  }
})
```

**4. 在 package.json 中添加测试脚本：**
在 `scripts` 里加上：
```
"test": "vitest run",
"test:watch": "vitest"
```

---

### 第二步：分析要测试的代码

用户可能说：
- "给 storage.ts 写测试" → 测试 `src/storage.ts`
- "给分类功能写测试" → 找到分类相关的代码来测试
- "测试所有" / 不指定 → 扫描 `src/` 下所有 `.ts` 和 `.tsx` 文件，找出适合测试的函数

分析代码时，重点关注：
- **纯函数**（给定输入→产生输出，不依赖外部环境）—— 最容易测试
- **数据操作函数**（增删改查）—— 需要 mock localStorage
- **React 组件**—— 需要测试渲染和用户交互

---

### 第三步：编写测试文件

测试文件放在被测试文件**同一个目录**下，命名为 `原文件名.test.ts`。

#### 测试编写原则（非常重要！）

1. **每个测试只测一件事**：一个 `it()` 只验证一个行为
2. **测试命名要像"用户故事"**："输入A → 应该得到B"
3. **覆盖正常情况 + 边界情况**：
   - ✅ 正常输入 → 正常输出
   - ✅ 空数据 / 0 / 空字符串
   - ✅ 异常输入 → 能正确处理
   - ✅ 大量数据
4. **对 localStorage 相关的测试**：使用 `vi.stubGlobal('localStorage', mock)` 来模拟

#### 测试模板示例

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

// 如果要测试的函数依赖 localStorage，先 mock
const mockStorage = new Map<string, string>()

beforeEach(() => {
  mockStorage.clear()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => mockStorage.get(key) ?? null,
    setItem: (key: string, value: string) => { mockStorage.set(key, value) },
    removeItem: (key: string) => { mockStorage.delete(key) },
  })
})

describe('addExpense', () => {
  it('添加一笔支出后，应该能用 getExpenses 查到', () => {
    addExpense({
      type: 'expense',
      amount: 100,
      date: '2026-07-01',
      category: '🍜 餐饮饮食',
      subCategory: '午餐',
    })
    
    const records = getExpenses()
    expect(records.length).toBe(1)
    expect(records[0].amount).toBe(100)
  })

  it('添加多条记录后，ID 应该自动递增不重复', () => {
    const id1 = addExpense({ type: 'expense', amount: 10, date: '2026-07-01', category: '🍜 餐饮饮食', subCategory: '早餐' })
    const id2 = addExpense({ type: 'expense', amount: 20, date: '2026-07-01', category: '🍜 餐饮饮食', subCategory: '午餐' })
    expect(id1.id).not.toBe(id2.id)
  })
})
```

---

### 第四步：运行测试

```bash
npx vitest run --reporter=verbose
```

- `run`：只跑一次（不进入 watch 模式）
- `--reporter=verbose`：显示每个测试的详细结果

---

### 第五步：生成测试报告

用通俗的中文向用户汇报测试结果：

```
📊 单元测试报告

✅ 通过：12 个
❌ 失败：0 个
⏭️  跳过：0 个
📁 测试文件：3 个

通过的测试：
  ✅ addExpense — 添加一笔支出后，应该能用 getExpenses 查到
  ✅ addExpense — 添加多条记录后，ID 应该自动递增不重复
  ...（列出所有）

（如果有失败的）
失败的测试：
  ❌ deleteExpense — 删除不存在的 ID 不应该报错
     实际结果：抛出了异常
     期望结果：静默处理
     建议：在 deleteExpense 里加判断，ID 不存在时直接 return
```

---

## 项目特定注意事项

1. **localStorage 要 mock**：这个项目的数据全存在 localStorage 里，测试时必须模拟它，不能用真实的浏览器 localStorage
2. **测试后要清理**：每个 `beforeEach` 里清空 mock 数据，保证测试之间互不影响
3. **金额使用数字类型**：项目中的金额是 `number` 类型，测试时直接写数字不用引号
4. **分类数据使用预置常量**：测试分类功能时，导入 `EXPENSE_PRESET_CATEGORIES` 和 `INCOME_PRESET_CATEGORIES`
5. **React 组件测试**：如果测试组件，需要 `jsdom` 环境模拟浏览器
