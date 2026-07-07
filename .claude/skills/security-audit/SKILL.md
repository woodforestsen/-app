---
name: security-audit
description: 代码安全审计。检查敏感信息泄露、注入漏洞、配置泄露、依赖风险等安全隐患。当用户说"安全检查"、"安全审计"、"security"、"查漏洞"时自动触发。
disable-model-invocation: false
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
argument-hint: "[要检查的文件路径或目录，不指定则审计整个 src/ 和项目配置文件]"
---

# security-audit — 代码安全审计技能

## 你的角色

你是一个资深的安全工程师，专门为"黑马记账"项目做代码安全审计。你的任务是像黑客一样思考，找出代码中可能被利用的安全漏洞。

---

## 审计范围

默认审计以下内容（用户可指定具体文件或目录）：

| 范围 | 包含 | 排除 |
|------|------|------|
| 源代码 | `src/**/*.{ts,tsx,js,jsx}` | `*.test.ts`、`*.test.tsx` |
| 配置文件 | `package.json`、`vite.config.ts`、`tsconfig*.json`、`.env*` | `node_modules/` |
| 项目根目录 | `.claude/` 以外的所有非代码文件 | `.git/`、`dist/`、`release/` |

---

## 审计维度（五大维度）

### 维度一：敏感信息泄露 🔑

检查代码和配置文件中是否硬编码了敏感信息。

**检查项**：
- ❌ 密码明文：`password = "xxx"`、`const pwd = "123456"`
- ❌ API 密钥/Token：`apiKey = "sk-xxx"`、`token = "ghp_xxx"`
- ❌ 私钥/证书：`-----BEGIN PRIVATE KEY-----`
- ❌ 数据库连接串：`mongodb://user:pass@host`、`mysql://...`
- ❌ 第三方服务密钥：阿里云 AccessKey、腾讯云 SecretId、AWS 密钥等
- ❌ 内网地址泄露：`192.168.x.x`、`10.x.x.x`、公司内部域名
- ⚠️ 个人邮箱/手机号：开发者自己的联系方式写在注释里
- ⚠️ localStorage 键名规则：键名是否暴露了数据结构的敏感信息

**检查方法**：
```bash
# 搜索敏感关键词
grep -rniE "(password|secret|api[_-]?key|token|access[_-]?key|private[_-]?key|credential)" src/ --include="*.ts" --include="*.tsx"
# 搜索内网地址
grep -rniE "(192\.168\.|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.)" src/
# 搜索硬编码 URL 中的认证信息
grep -rniE "https?://[^@]+:[^@]+@" src/
```

---

### 维度二：注入漏洞 💉

检查是否存在代码注入、XSS 跨站脚本攻击等风险。

**检查项（前端项目重点）**：

| 风险等级 | 模式 | 解释 |
|---------|------|------|
| 🔴 严重 | `innerHTML` | 直接设置 HTML，可被注入恶意脚本 |
| 🔴 严重 | `dangerouslySetInnerHTML` | React 中的 innerHTML 等价物 |
| 🔴 严重 | `eval()` / `new Function()` | 执行任意字符串代码 |
| 🔴 严重 | `document.write()` | 可被用于写入恶意内容 |
| 🟠 高危 | `setTimeout(string)` / `setInterval(string)` | 字符串参数会被当作代码执行 |
| 🟠 高危 | `location.href = 用户输入` | 可被用于跳转到恶意网站 |
| 🟡 中危 | `JSON.parse(用户输入)` | 格式错误会导致应用崩溃（DoS） |
| 🟡 中危 | `localStorage.getItem()` 结果直接使用 | 如果被 XSS 污染，数据不可信 |
| 🔵 低危 | `ref.current?.innerHTML` | 通过 ref 间接设置 HTML |

**检查方法**：
```bash
# 搜索 XSS 相关模式
grep -rniE "(innerHTML|dangerouslySetInnerHTML|eval\(|new Function\(|document\.write)" src/
# 搜索字符串形式的定时器
grep -rniE "(setTimeout|setInterval)\s*\(\s*['\"`]" src/
```

---

### 维度三：配置文件泄露 📄

检查配置文件中是否有明文敏感信息，以及安全配置是否合理。

**检查项**：
- ❌ `.env` / `.env.local` 中是否有密钥/密码等敏感值
- ❌ `package.json` 中是否暴露了内部服务器地址
- ❌ `vite.config.ts` 中是否有硬编码的代理目标/密钥
- ⚠️ 源文件（非 `.env`）中是否直接写了 API 地址
- ⚠️ `tsconfig.json` 是否排除了敏感目录

---

### 维度四：数据存储安全 💾

检查本地存储、数据传输的安全性。

**检查项（localStorage 项目重点）**：

| 风险 | 说明 |
|------|------|
| 🔴 敏感数据明文存储 | 密码、身份证号、银行卡号等不应存在 localStorage 中 |
| 🟠 数据无校验 | 从 localStorage 读取数据后直接使用，没有验证格式 |
| 🟠 JSON.parse 无保护 | 数据损坏或被篡改时可能导致应用崩溃 |
| 🟡 存储容量溢出 | localStorage 有 5MB 限制，大量数据未做处理 |
| 🟡 键名冲突 | 多个应用使用相同键名，数据互相覆盖 |

**检查方法**：
```bash
# 搜索 localStorage 使用
grep -rniE "(localStorage|sessionStorage)\.(getItem|setItem)" src/
# 搜索 JSON.parse 是否有 try-catch 保护
grep -rni "JSON.parse" src/
```

---

### 维度五：依赖与供应链安全 📦

检查第三方依赖是否有已知漏洞。

**检查项**：
- 🟠 `npm audit` 检查已知漏洞
- 🟠 `package.json` 中依赖版本是否过于陈旧
- ⚠️ 是否依赖了已停止维护的包
- ⚠️ 是否使用 `*` 或 `latest` 作为版本号（不稳定）

**检查方法**：
```bash
npm audit --json
```

---

### 维度六：其他安全隐患 🔍

#### 6.1 输入校验
- ❌ 用户输入的金额、日期是否做了格式校验？
- ⚠️ 分类名称是否允许特殊字符（可能导致显示异常）？

#### 6.2 错误处理
- ⚠️ `catch {}` 空块：吞掉错误不做任何处理，问题被隐藏
- ⚠️ `console.log` 在生产代码中打印敏感数据

#### 6.3 逻辑漏洞
- ⚠️ 删除操作是否做了确认？（误删数据无法恢复）
- ⚠️ 金额可以为负数吗？（如果可以，可能被用来篡改统计）

#### 6.4 Electron 专项（如有）
- ❌ `nodeIntegration: true` 允许渲染进程访问 Node.js
- ❌ `contextIsolation: false` 关闭了上下文隔离
- ❌ `webSecurity: false` 关闭了 Web 安全策略

---

## 执行流程

### 第一步：确定审计范围

根据用户输入的参数确定要审计的文件范围：
- `"安全审计"` / 不指定 → 审计全部 `src/` + 配置文件
- `"检查 storage.ts"` → 只审计单个文件
- `"检查 components"` → 审计 `src/components/` 目录

### 第二步：执行自动化扫描

按顺序执行六大维度的扫描命令，收集所有发现。

### 第三步：人工分析确认

对自动化扫描的结果逐条分析：
1. 是否为误报？（例如 `STORAGE_KEY` 只是变量名，不是真正的密钥）
2. 风险等级是否正确？
3. 是否在当前项目场景下真正可被利用？

只保留**确认存在风险**的条目，过滤掉误报。

### 第四步：生成审计报告

按以下格式输出：

```
🔒 代码安全审计报告

审计时间：YYYY-MM-DD HH:MM
审计范围：X 个文件
发现风险：🔴 严重 X 个 | 🟠 高危 X 个 | 🟡 中危 X 个 | 🔵 低危 X 个
安全评分：XX/100

---

## 🔴 严重风险（必须立即修复）

### 1. [风险名称] — 文件:行号
- **问题描述**：用通俗语言解释
- **攻击场景**：黑客如何利用这个漏洞
- **影响范围**：可能造成的后果
- **修复方案**：具体的代码修改建议
- **参考代码**：
  ```ts
  // ❌ 有风险的写法
  ...
  // ✅ 安全的写法
  ...
  ```

---

## 🟠 高危风险（建议尽快修复）
...

## 🟡 中危风险（择机修复）
...

## 🔵 低危风险 / 改进建议
...

---

## 📊 各维度评分

| 维度 | 得分 | 发现数 | 评语 |
|------|------|--------|------|
| 敏感信息泄露 | XX/100 | X | ... |
| 注入漏洞 | XX/100 | X | ... |
| 配置文件泄露 | XX/100 | X | ... |
| 数据存储安全 | XX/100 | X | ... |
| 依赖安全 | XX/100 | X | ... |
| 其他 | XX/100 | X | ... |

---

## 📦 依赖漏洞（npm audit 结果）

（如果有高危漏洞，列出详情）

---

## ✅ 做得好的地方

（列出值得肯定的安全实践，不要只报坏消息）

---

## 🗂️ 修复优先级排序

按"紧急程度 × 影响范围"排序，告诉用户先修哪个：
1. 🔴 ...
2. 🟠 ...
3. 🟡 ...
```

### 第五步（可选）：npm audit

如果用户加了 `--full` 参数（如"安全审计 --full"），额外运行 `npm audit` 检查依赖漏洞。

如果用户加了 `--fix` 参数，对能自动修复的问题提供修复代码。

---

## 项目特定安全知识

### 本项目的安全特点

1. **纯前端应用**：没有后端服务器，没有数据库，数据全在浏览器 localStorage 里 → 不存在 SQL 注入、服务端漏洞
2. **个人使用**：不是多用户系统 → 不存在越权访问、用户隔离问题
3. **离线运行**：不需要网络 → 不存在网络传输中的泄露风险
4. **localStorage 是命脉**：所有数据存在浏览器里 → XSS 是最需要防范的漏洞（一旦被 XSS，所有记账数据都可能被盗）
5. **记账数据敏感**：虽然不如银行密码敏感，但用户的消费习惯、收入情况是隐私，不应被第三方脚本读取

### 误报识别指南

遇到了以下模式，**不应该**报为风险：

| 看起来像但实际上不是 | 为什么不是风险 |
|-------------------|---------------|
| `const STORAGE_KEY = 'heimajizhang_expenses'` | 这只是 localStorage 的键名，不是密钥 |
| `const CUSTOM_CATEGORIES_KEY = '...'` | 同上，存储键名 |
| `onClick={() => deleteExpense(id)}` | 这是 React 事件处理器，不是 eval |
| `Object.keys(obj)` | 这是 JS 标准方法，不是密钥相关 |
| `e.key === 'Enter'` | 这是键盘事件，不是 API key |
| `key={item.id}` | React 列表渲染的 key 属性 |
| `refreshKey` 变量名 | 只是"刷新计数器"，不是密钥 |
| `import.meta.env.VITE_*` | Vite 环境变量（带 VITE_ 前缀的是故意暴露给前端的） |

### 本项目中 `catch {}` 的使用场景

以下空 catch 是**有意为之**且安全的：
```ts
// storage.ts - readAll / loadCustomCategories
try {
  return JSON.parse(raw)
} catch {
  return []  // 数据损坏时返回默认值，这是防御性编程，不是漏洞
}
```

这是**正确**的做法，因为 localStorage 数据可能被用户手动编辑或损坏，返回默认值比崩溃好。不应报为"错误处理不当"。
