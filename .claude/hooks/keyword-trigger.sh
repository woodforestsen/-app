#!/bin/bash
# Claude Code UserPromptSubmit Hook — 关键词自动触发
# 检测用户输入中的关键词，注入上下文引导 Claude 调用对应的 agent/skill

INPUT=$(cat)

# 提取 prompt 字段（用 python3 解析 JSON，因为 Windows bash 没有 jq）
PROMPT=$(echo "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('prompt',''))" 2>/dev/null || echo "")

# === 提交代码 → gitcommit-agent ===
if echo "$PROMPT" | grep -qiE "提交代码|commit|gitcommit|推送代码"; then
  echo ""
  echo "=== 关键词触发：提交代码 ==="
  echo "用户想要提交代码。你必须调用 Agent 工具，subagent_type 设为 \"gitcommit-agent\"，prompt 设为用户的原话。"
  echo "不要直接执行 git add/commit/push 命令。让 gitcommit-agent 走门禁流程（测试+审查通过后才提交）。"
  echo "==========================="
  echo ""
fi

# === 测试相关 → tester agent ===
if echo "$PROMPT" | grep -qiE "写测试|加测试|测试一下|跑测试|单元测试|测试覆盖率|vitest"; then
  echo ""
  echo "=== 关键词触发：单元测试 ==="
  echo "用户需要写测试或跑测试。你必须调用 Agent 工具，subagent_type 设为 \"tester\"。"
  echo "==========================="
  echo ""
fi

# === 质量检查 → quality-engineer ===
if echo "$PROMPT" | grep -qiE "质量检查|代码审查|quality|全面检查|代码质量"; then
  echo ""
  echo "=== 关键词触发：代码质量检查 ==="
  echo "用户需要代码审查/质量检查。你必须调用 Agent 工具，subagent_type 设为 \"quality-engineer\"。"
  echo "==========================="
  echo ""
fi

# === 安全检查 → security-audit skill ===
if echo "$PROMPT" | grep -qiE "安全检查|安全审计|security|查漏洞|安全漏洞"; then
  echo ""
  echo "=== 关键词触发：安全审计 ==="
  echo "用户需要安全检查。你必须调用 Skill 工具，skill 设为 \"security-audit\"。"
  echo "==========================="
  echo ""
fi

# === 注释检查 → comments-check skill ===
if echo "$PROMPT" | grep -qiE "检查注释|注释检查|comments-check"; then
  echo ""
  echo "=== 关键词触发：注释检查 ==="
  echo "用户需要注释检查。你必须调用 Skill 工具，skill 设为 \"comments-check\"。"
  echo "==========================="
  echo ""
fi

exit 0
