# 任务002-阶段三：SDK 命令行工具 `chipsdev` 实现与集成

## 1. 背景

开发者命令行工具目前仅存在于文档层（《Chips Dev 开发者命令行手册》与若干需求/设计文档），尚未有真正的 CLI 实现仓库。

命令行拆分后，`chipsdev` 将作为“开发者唯一命令行入口”，随 SDK 一起发布，负责：

- 插件/应用工程的创建（脚手架集成）；
- 本地开发服务器与调试；
- 测试、Lint、E2E 与验证；
- 构建与打包 `.cpk`；
- 登录、发布与版本管理。

本阶段目标是在 SDK 侧完成 `chipsdev` 的 CLI 实现与发布形态设计，并与生态现有工程（脚手架、主题包、应用模板等）建立稳定协作关系。

## 2. 目标

1. 在 SDK 体系内实现可独立安装/使用的 `chipsdev` CLI：
   - 以 npm 包形式发布（例如 `@chips/dev-cli`）；
   - 安装后在 PATH 中提供 `chipsdev` 命令；
   - 支持文档中定义的主要开发命令。
2. 与 SDK 本身的模块划分保持清晰边界：
   - CLI 层仅作为“命令解析 + 调用 SDK 能力”的薄壳；
   - 核心逻辑（构建、验证、模板操作等）尽量位于 `Chips-SDK` 的可复用模块中。
3. 为后续生态仓库适配提供稳定接口：
   - 脚手架与样板工程仅依赖 `chipsdev` 公共契约；
   - 不直接依赖 CLI 内部实现细节。

## 3. 范围

### 3.1 在范围内

- 新建或扩展 SDK 内的 CLI 模块：
  - `Chips-SDK/src/cli/*` 或独立 `chipsdev` 仓库与 SDK 的依赖关系设计；
  - TypeScript/Node 实现，支持跨平台运行。
- CLI 主要命令实现：
  - 初始化与创建：`chipsdev init` / `chipsdev create`；
  - 开发与调试：`chipsdev server` / `chipsdev debug`；
  - 质量门禁：`chipsdev test` / `chipsdev lint` / `chipsdev e2e` / `chipsdev validate`；
  - 构建与打包：`chipsdev build` / `chipsdev package`；
  - 发布与版本：`chipsdev login` / `chipsdev publish` / `chipsdev version`。
- 与 `chips.config.mjs` 的集成：
  - 约定配置字段与默认值；
  - 支持不同插件类型（应用插件、卡片插件、布局插件、模块插件、主题插件等）。

### 3.2 不在范围内

- 实际插件市场后端服务与认证实现（可通过 stub 或模拟服务完成 CLI 流程验证）；
- Host 侧 CLI `chips` 的任何功能（在阶段二处理）。

## 4. 产出物

1. `chipsdev` CLI 实现：
   - TypeScript 源码与构建脚本；
   - npm 包配置（`package.json` 的 `bin` 字段，指向编译后的 CLI 入口脚本）。
2. CLI 使用文档（技术层）：
   - 放置在 `Chips-SDK/技术文档` 下，描述各命令的行为与参数；
   - 作为《Chips Dev 开发者命令行手册》的实现参考。
3. 自动化测试：
   - 针对核心命令的集成测试（使用子进程调用 `chipsdev`）；
   - 配置文件解析与错误处理测试。

## 5. 任务拆解

### 5.1 仓库与包结构设计

- 决定 `chipsdev` 的物理归属：
  - 方案 A：在 `Chips-SDK` 仓库内新增 `packages/chipsdev-cli` 子包；
  - 方案 B：新建独立仓库 `chips-dev-cli`，作为 SDK 的“官方 CLI”，通过依赖 `Chips-SDK` 模块实现功能。
- 确定 npm 包命名与发布策略：
  - 包名（如 `@chips/dev-cli`）；
  - Node 版本要求；
  - 安装方式（全局安装/项目内安装均可使用）。

### 5.2 命令解析与基础框架

- 选择或实现命令行解析库（如自研轻量 parser 或使用 `commander` 等）；
- 建立统一的 CLI 入口：
  - 支持 `chipsdev <command> [options]` 形式；
  - 提供 `chipsdev help` 与 `chipsdev <command> --help`。
- 设计统一的错误处理与输出格式：
  - 人类可读输出；
  - 机读模式（如 `--json`），返回结构化结果。

### 5.3 与构建/测试工具链的集成

- 对接现有生态标准工具：
  - 构建：Vite/Rollup/esbuild 等（按当前生态设计）；
  - 测试：Vitest；
  - Lint：ESLint；
  - E2E：Playwright 等。
- 为每个命令定义清晰行为：
  - `chipsdev build`：读取 `chips.config.mjs`，调用底层构建工具，产出 `.cpk`；
  - `chipsdev test`：调用 Vitest，传递必要配置；
  - `chipsdev validate`：执行硬编码检查、配置验证、契约校验等。

### 5.4 与脚手架/模板的集成接口

- 定义脚手架调用接口：
  - `chipsdev create` 通过模板元数据（位于 `Chips-Scaffold` 仓库）生成工程；
  - 支持不同类型（app/card/layout/module/theme/i18n 等）。
- 约定模板仓库需要提供的能力：
  - 模板列表 API；
  - 模板生成 API（或文件描述）。
- 预留与 Host 的协作点（供后续阶段使用）：
  - `chipsdev` 在构建完成后可输出建议的 Host 安装命令（如 `chips plugin install ...`），但不直接调用 Host CLI。

### 5.5 测试与示例工程

- 在 SDK 或单独仓库中添加示例工程：
  - 使用 `chipsdev create` 生成；
  - 通过 `chipsdev build/test/lint/validate` 完整跑通；
  - 用于 CI 中验证 CLI 行为。
- 为核心命令添加自动化测试：
  - 子进程级别调用；
  - 覆盖常见错误场景（配置缺失、参数错误等）。

## 6. 验收标准

- 在本地安装 `chipsdev` 后，可以完成以下最小闭环：
  - `chipsdev init` 初始化开发配置（如有）；
  - `chipsdev create demo-app --type app` 创建一个应用工程；
  - 在该工程目录运行 `chipsdev build/test/lint/validate` 均成功；
  - 生成 `.cpk` 文件，可供 Host 安装使用。
- CLI 帮助信息完整且与规范一致；
- 自动化测试覆盖所有核心命令，SDK/CLI 仓库 CI 全绿；
- 不依赖 Host CLI 即可独立工作。

