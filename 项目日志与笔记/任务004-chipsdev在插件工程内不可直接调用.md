# 任务004-chipsdev在插件工程内不可直接调用

- 日期：2026-03-08
- 发现阶段：SDK 命令行联调 / 插件构建
- 问题类型：工具链 / CLI 集成
- 问题描述：在 `Chips-SDK` 仓库执行 `npm link` 后，`chipsdev` 在仓库根目录可以显示帮助信息，但进入具体插件工程后执行 `chipsdev build`，终端返回 `Volta error: Could not locate executable chipsdev in your project`，导致开发者命令行无法按照文档描述在插件工程中直接使用。
- 影响范围：应用插件、卡片插件、布局插件等工程内的 `build`、`test`、`lint`、`package`、`validate`、`run` 等开发命令。
- 复现步骤：
  1. 进入 `/Users/sevenstars/Documents/ChipsCard/Develop/Project-13-2-f/Chips-SDK`。
  2. 执行 `npm link`。
  3. 进入 `/Users/sevenstars/Documents/ChipsCard/Develop/Project-13-2-f/Chips-CardViewer`。
  4. 执行 `chipsdev build`。
  5. 观察命令未进入构建流程，而是直接报找不到可执行命令。
- 期望行为：完成 `chipsdev` 安装后，开发者应能在任意符合规范的插件工程目录内直接执行 `chipsdev build` 等命令。
- 处理结果：已完成

## 修复记录

1. 为现有插件工程补齐项目级 `chips-sdk` 开发依赖，使 `chipsdev` 可以作为工程内本地二进制稳定解析。
2. 为应用插件工程补齐本地 `@chips/component-library` 工作区依赖，解决 `npm install` 与 `chipsdev build` 在生态仓库内的依赖解析问题。
3. 在 `Chips-SDK/cli/index.js` 中增强生态根目录解析逻辑，使本地安装在插件工程中的 `chipsdev` 仍能正确找到 `Chips-Host`、`Chips-Scaffold` 等兄弟仓库。
4. 在 `chipsdev create` 后自动适配当前生态工作区依赖，避免新建工程再次出现“工程内无法直接调用 chipsdev”的问题。
5. 更新开发环境指南、开发者命令行手册、命令拆分指南，明确“插件工程内需安装项目级 `chips-sdk` 依赖后直接调用 `chipsdev`”的规范。

## 验收要点

- 在 `Chips-CardViewer` 工程执行 `npm install` 后，可直接运行 `chipsdev help` 与 `chipsdev build`。
- `chipsdev run` 在插件工程内可继续按工作区结构定位 `Chips-Host`。
- 新通过 `chipsdev create` 创建的工程会自动写入当前工作区可用的本地依赖配置。
