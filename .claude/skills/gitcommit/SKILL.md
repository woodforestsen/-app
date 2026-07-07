---
name: gitcommit
description: 带门禁的 Git 提交。先跑测试和质量检查，通过后才允许提交推送。
disable-model-invocation: false
allowed-tools:
  - Agent
---

# gitcommit — 门禁式 Git 提交

当用户调用此技能时，使用 Agent 工具启动 `gitcommit-agent`
（subagent_type = "gitcommit-agent"），让它执行完整的门禁提交流程。

不要自己执行任何操作。所有工作委托给 gitcommit-agent。
