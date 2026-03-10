# 任务002-阶段二：Host 命令行工具重构与 `chips` 发布

## 1. 背景

Host 侧目前已有一套 CLI 实现雏形（`Chips-Host/src/main/cli/index.ts`），用于模拟《Chips Host 命令行使用手册》中描述的行为（start/stop/status/config/logs/plugin/theme/update/doctor/open 等）。

命令行拆分后，`chips` 将成为“用户端/运维端唯一命令行入口”，负责本地主机实例的管理，不再承载任何开发构建能力。

本阶段目标是在 Host 仓库中完成 `chips` CLI 的落地与对外发布，使其行为与共用文档一致，并为后续生态适配提供稳定基础。

## 2. 目标

1. 在 `Chips-Host` 仓库中实现稳定的 `chips` 命令行工具：
   - 支持文档中定义的所有 Host 命令；
   - 在本地开发环境中通过 `npm scripts` 可方便调用；
   - 在最终发布形态中作为 Host 安装包的一部分提供给用户。
2. 清理 Host 侧与开发命令相关的历史痕迹：
   - 保证 Host CLI 不再暴露任何 `dev` 相关命令；
   - 不依赖 `chipsdev` 的存在即可独立工作。
3. 与《Chips Host 命令行使用手册》保持一致：
   - 文档中的命令示例可以直接在真实环境中执行；
   - Host CLI 的行为（包括错误信息与退出码）与文档的预期一致。

## 3. 范围

### 3.1 在范围内

- `Chips-Host` 仓库：
  - CLI 实现（`src/main/cli/index.ts`）的功能完善与重构；
  - package.json 中 CLI 相关脚本与 `bin` 字段配置；
  - 与 Host CLI 相关的测试与脚本；
  - Host 侧工作区文件结构（state/config/plugins 等）。
- 生态共用文档中 Host CLI 的实现约束：
  - `chips` 系列命令；
  - 是否保留任何历史二级入口提示，以及最终帮助信息的对外口径。

### 3.2 不在范围内

- 开发命令行工具（`chipsdev`）的实现与发布；
- 脚手架/主题包/插件工程模板对 CLI 的调用（放在阶段四处理）。

## 4. 产出物

1. 完整的 Host CLI 实现：
   - `chips start/stop/status/config/logs/plugin/theme/update/doctor/open` 等命令；
   - 如有约定的别名或附加命令，同步实现。
2. 更新后的 `Chips-Host/package.json`：
   - 定义 `bin` 字段（例如 `"chips": "dist/src/main/cli/index.js"`）；
   - 提供开发脚本（如 `npm run cli -- ...`）便于本地调试。
3. Host CLI 自动化测试：
   - 基础行为测试（启动/停止/状态查询）；
   - 配置读写测试；
   - 插件管理与主题管理命令的契约测试。
4. 与生态共用文档的一致性确认记录：
   - 至少覆盖《Chips Host 命令行使用手册》和《Chips-Host 对外接口基线》中提到的命令。

## 5. 任务拆解

### 5.1 CLI 实现补全与重构

- 对照《Chips Host 命令行使用手册》，逐条核对现有实现：
  - 确认已经实现的命令：start / stop / status / config / logs / plugin / theme / update / doctor / open；
  - 补齐文档中存在但实现缺失的子命令或选项；
  - 移除任何与开发相关的命令（如曾假设的 `chips dev` 等）。
- 统一参数解析与帮助信息：
  - 提供 `chips help` 等帮助入口；
  - 统一错误输出格式（简单人类可读 + 可选 JSON 模式）。

### 5.2 打包与发布形式设计

- 确定 Host CLI 的发布形式：
  - Node/npm 形式（供开发环境使用）；
  - Electron/桌面安装器中附带的 CLI 可执行文件。
- 更新 `Chips-Host/package.json`：
  - 添加 `bin` 字段导出 `chips`；
  - 确认 `build` 产物目录与 CLI 入口路径一致。
- 在开发环境中验证：
  - `npm install` 后可通过 `npx chips ...` 或 `npm run cli -- ...` 调用；
  - 生成的桌面应用安装后，系统 PATH 中可找到 `chips`（视最终安装器方案而定，可在本阶段先定义接口，细节在安装器侧实现）。

### 5.3 工作区与配置文件

- 确认 Host 工作区路径策略：
  - 默认使用 `~/.chips-host`；可由环境变量（如 `CHIPS_HOME`）覆盖；
  - 在文档中明确该行为；
  - 保持与现有实现（如 `stateFile` / `pluginFile` 等）一致或按新设计调整。
- 对 CLI 命令涉及的文件读写操作添加错误处理与合理的错误信息：
  - 工作区不存在/不可写；
  - 配置文件损坏；
  - 插件列表文件缺失。

### 5.4 测试与工具支持

- 在 `Chips-Host/tests` 中添加 CLI 层面的集成测试：
  - 使用 Node 子进程调用 `chips` 可执行文件；
  - 覆盖常见命令路径；
  - 确认退出码与输出符合预期。
- 为后续阶段预留 CI 钩子：
  - 在 Host 仓库 CI 中新增“CLI 冒烟测试”步骤；
  - 将命令行测试纳入必过门禁。

## 6. 验收标准

- 在本地开发环境中，通过以下最小例子验证：
  - `chips start` → 返回运行状态，写入 state 文件；
  - `chips status` → 返回正确状态；
  - `chips config list/set/reset` → 正常读写配置；
  - `chips plugin list/install/uninstall/enable/disable` → 可正常操作虚拟或真实插件；
  - `chips theme list/current/validate` → 行为符合文档； 
  - `chips logs` / `chips doctor` / `chips open` → 返回合理结果。
- Host 仓库 CI 中新增的 CLI 测试全部通过；
- 生态共用文档中关于 Host CLI 的示例命令在实际环境下可运行且行为一致。
