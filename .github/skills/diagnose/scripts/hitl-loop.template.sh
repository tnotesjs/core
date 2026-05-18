#!/usr/bin/env bash
# 人在回路中的复现脚本模板。
# 复制本文件，编辑下面的步骤，然后执行它。
# agent 负责运行脚本，用户按照终端提示逐步操作。
#
# 用法：
#   bash hitl-loop.template.sh
#
# 两个辅助函数：
#   step "<instruction>"          → 展示指令，并等待用户按下 Enter
#   capture VAR "<question>"      → 提问，并把回答写入变量 VAR
#
# 结尾会把采集到的值打印成 KEY=VALUE，方便 agent 继续解析。

set -euo pipefail

step() {
  printf '\n>>> %s\n' "$1"
  read -r -p "    [完成后按 Enter] " _
}

capture() {
  local var="$1" question="$2" answer
  printf '\n>>> %s\n' "$question"
  read -r -p "    > " answer
  printf -v "$var" '%s' "$answer"
}

# --- edit below ---------------------------------------------------------

step "打开 http://localhost:3000 并完成登录。"

capture ERRORED "点击“导出”按钮。是否出现报错？(y/n)"

capture ERROR_MSG "粘贴错误信息（如果没有就填 'none'）："

# --- edit above ---------------------------------------------------------

printf '\n--- Captured ---\n'
printf 'ERRORED=%s\n' "$ERRORED"
printf 'ERROR_MSG=%s\n' "$ERROR_MSG"
