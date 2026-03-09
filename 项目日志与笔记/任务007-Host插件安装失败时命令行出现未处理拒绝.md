# 任务007-Host插件安装失败时命令行出现未处理拒绝

- 日期：2026-03-08
- 发现阶段：Host 插件安装异常路径联调
- 问题类型：错误处理 / CLI 稳定性
- 问题描述：当 Host 命令行执行 `plugin install` 遇到异常插件包时，CLI 进程没有输出结构化错误信息，而是直接抛出 `UnhandledPromiseRejection` 并中断。异常对象显示为 `#<Object>`，无法直接从命令行结果中获得清晰的问题上下文。
- 影响范围：Host 命令行的插件安装异常路径、自动化脚本接入、问题定位效率。
- 复现步骤：
  1. 准备一个 Host 无法正确安装的 `.cpk` 文件。
  2. 执行 `node Chips-Host/dist/src/main/cli/index.js plugin install <cpk路径>`。
  3. 观察 CLI 未返回标准错误结果，而是直接触发未处理 Promise 拒绝。
- 期望行为：当插件安装失败时，Host 命令行应输出可读、结构化、可脚本化的错误信息，并以受控方式结束进程。
- 处理结果：已完成

## 修复记录

1. 为 `Chips-Host/src/main/cli/index.ts` 增加统一的 CLI 错误标准化输出，使用结构化 `code / error / details / retryable` 字段返回失败信息。
2. 为 `runCli` 增加顶层 `try/catch`，保证 `plugin install` 等异常路径返回受控退出码 `1`，不再抛出未处理 Promise 拒绝。
3. 为入口脚本增加最终兜底 `catch`，确保直接通过 `node dist/.../index.js` 启动 CLI 时同样遵循受控错误输出。
4. 新增 CLI 测试覆盖插件安装失败路径，验证输出中包含标准错误对象且不再出现 `UnhandledPromiseRejection`。

## 验收要点

- 对异常 `.cpk` 或不存在的插件路径执行 `chips plugin install`，CLI 返回 JSON 错误结果。
- 错误输出中包含清晰的 `code` 与 `error` 字段，而不是 `#<Object>`。
- 进程退出码为 `1`，且日志中不再出现 `UnhandledPromiseRejection`。
