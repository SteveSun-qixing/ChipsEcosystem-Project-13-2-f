# 任务003-Host命令行全局入口不可直接执行

- 日期：2026-03-08
- 发现阶段：Host 安装与命令行联调
- 问题类型：工具链 / CLI 入口
- 问题描述：在 `Chips-Host` 仓库执行 `npm link` 后，直接运行 `chips help` 无法正常进入 Host 命令行，而是出现 `use strict: command not found` 和 shell 语法错误，说明当前全局 `chips` 入口未被稳定识别为 Node 可执行命令。
- 影响范围：`chips` 的帮助、状态查询、插件安装、主题管理等所有用户端命令行能力。
- 复现步骤：
  1. 进入 `/Users/sevenstars/Documents/ChipsCard/Develop/Project-13-2-f/Chips-Host`。
  2. 执行 `npm link`。
  3. 在任意目录执行 `chips help`。
  4. 观察命令未输出 Host 帮助信息，而是直接报 shell 解析错误。
- 期望行为：完成 Host 安装后，用户应能直接通过 `chips ...` 调用 Host 命令行，并得到稳定的帮助信息与命令执行结果。
- 处理结果：已完成

## 修复记录

1. 在 `Chips-Host/src/main/cli/index.ts` 增加 Node shebang，确保 `npm link` 后生成的全局入口可被 shell 正确识别为 Node 可执行脚本。
2. 将 Host CLI 正式入口统一收敛为 `chips`，移除 `chips host` 作为正常调用路径；若误用旧写法，CLI 会返回明确迁移提示。
3. 补充 CLI 顶层受控异常处理，避免入口脚本在异常路径直接向 shell 泄露未处理错误。
4. 更新 Host 命令行手册与命令拆分指南，统一文档中的命令格式为 `chips <command>`。

## 验收要点

- `npm link` 后执行 `chips help` 可以正常输出帮助。
- `chips start`、`chips status`、`chips plugin install` 等命令可直接执行。
- 执行旧写法 `chips host help` 时，CLI 返回结构化迁移提示而不是 shell 语法错误。
