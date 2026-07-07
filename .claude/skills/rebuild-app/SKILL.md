---
name: rebuild-app
description: 重新打包构建黑马记账应用。先做类型检查，再执行 npm run build，最后报告结果。
disable-model-invocation: true
allowed-tools:
  - Bash
  - Read
  - Glob
---

# rebuild-app — 重新打包应用

## 执行步骤

### 第 1 步：类型检查
先检查代码有没有明显的错误：
```bash
npx tsc --noEmit
```

- ✅ 类型检查通过 → 继续下一步
- ❌ 有错误 → 用通俗语言告诉用户哪里有问题，**停止打包**，不要继续

### 第 2 步：确认 node_modules 存在
快速检查一下 `node_modules` 文件夹在不在：
```bash
ls node_modules/.package-lock.json 2>/dev/null && echo "依赖已安装" || echo "需要安装依赖"
```
如果不存在，先运行 `npm install`。

### 第 3 步：执行打包
```bash
npm run build
```

### 第 4 步：报告结果
- ✅ 打包成功：告诉用户"打包成功！"，说明输出在 `dist/` 文件夹里，并列出里面的文件
- ❌ 打包失败：用通俗语言解释错误原因，给出解决建议

## 注意事项
- 全程用中文沟通，通俗易懂
- 打包出来的文件在 `dist/` 文件夹，这些就是可以部署到服务器的网页文件
