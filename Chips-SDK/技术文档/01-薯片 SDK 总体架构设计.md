# 薯片 SDK 总体架构设计

> 文档状态：设计基线稿  
> 适用阶段：阶段18及后续 `Chips-SDK` 实施阶段

---

## 1. 架构定位与分层关系

### 1.1 在 12 层架构中的位置

根据《薯片生态前端 vNext 架构设计手册》：

- Host 内置实现 L1–L9：PAL、Kernel、Host Services、Plugin Runtime、Bridge Transport、Runtime Client、UI Hooks、声明式 UI、统一渲染。
- 组件库负责 L10：无头组件（状态机、结构、a11y）。
- Theme Runtime 与 App/Page Domain 分别位于 L11 与 L12。
- SDK 不直接对应某一层，而作为“开发者工具包”，横向围绕 L5–L9 提供类型化封装和工具能力。

SDK 的职责边界：

- 只消费 Host 对外接口与 Bridge API，不实现内部路由或渲染逻辑。
- 向上为插件与薯片生态内部应用提供统一、易用、类型安全的调用接口。
- 为测试与集成提供契约校验与调试辅助工具。

### 1.2 依赖关系白名单

- SDK 允许依赖：
  - Host 对外接口（通过 `window.chips.*`，以及经生态共用文档明确的其他接口）。
  - 生态共用契约与路由清单（只读）。
  - TypeScript、自身工具链与经批准的基础类库（如 `node:events` 等标准库）。
- SDK 禁止依赖：
  - Host 内部实现模块（`Chips-Host/kernel/`, `services/` 等）。
  - 组件库内部实现细节（仅通过公开契约消费）。
  - 未在技术选型中列出的第三方库。

---

## 2. SDK 内部分层

从实现视角，将 SDK 内部划分为三层：

1. **Core Client Layer（核心客户端层）**
   - 提供 `createClient` 工厂与核心调用 `invoke`。
   - 完成环境探测、Bridge 适配、错误归一与重试策略。
2. **Domain Wrapper Layer（能力域封装层）**
   - 按能力域划分模块：`file`, `card`, `box`, `resource`, `theme`, `config`, `i18n`, `plugin`, `module`, `window`, `platform` 等。
   - 每个模块只依赖 Core Client，不直接依赖 Bridge 或 Host。
3. **Tooling & Contracts Layer（工具与契约层）**
   - `contracts/`：路由清单、接口契约快照。
   - `tooling/`：契约校验脚本、调试工具、示例集成辅助。
   - `types/`：公共类型定义与导出。

依赖方向：

- Domain Wrapper Layer → Core Client Layer → Bridge/Host
- Tooling & Contracts Layer → Core Client Layer（部分）与生态共用契约（只读）

---

## 3. 调用链路总览

### 3.1 典型调用链（插件环境）

1. 插件代码调用 `client.card.render(cardFile, options)`。
2. Domain Wrapper 构造 `card.render` 调用载荷并执行前置校验。
3. Core Client 将动作名与载荷交给 Bridge 适配器。
4. Bridge 适配器调用 `window.chips.invoke('card', 'render', payload)` 或统一动作名 `card.render`。
5. Host Runtime Client 与路由执行链路处理请求，返回渲染结果或错误。
6. Core Client 归一错误对象，将结果返回给 Domain Wrapper。
7. Domain Wrapper 将结果转换为 SDK 公开类型并返回给调用者。

### 3.2 典型调用链（生态内部 Node 工具环境）

1. 生态内部工具通过 `createClient` 创建客户端实例（具体 Transport 形态需与 Host 接口规范保持一致）。
2. Core Client 根据运行环境与配置选择合适的 Transport（仅限生态正式支持的模式）。
3. 后续调用链与插件环境基本相同，只是 Transport 不同。

### 3.3 错误链路

错误来源包括：

- Bridge 层：通道不可用、超时、载荷非法（`BRIDGE_*`）。
- Service 层：文件不存在、权限不足等（`SERVICE_*`）。
- Runtime 层：重试耗尽、熔断开启等（`RUNTIME_*`）。

SDK 必须统一为 `StandardError`，并在必要时附带 `requestId/traceId` 与 Host 返回的 `details`。

---

## 4. 仓库角色与对外包设计

### 4.1 仓库角色

`Chips-SDK` 仓库承担：

- 源码与构建配置（TS → CJS/ESM 产物）。
- 类型定义与 `.d.ts` 产物。
- 契约快照与测试脚本。
- 文档与开发计划。

不承担：

- 单独的命令行工具二进制（未来 `Chips-Dev` 或 CLI 仓库承担）。
- 组件库代码或 UI 资源。

### 4.2 对外包划分（建议）

对 npm 生态，建议至少划分以下包（本轮仅设计，不创建项目骨架）：

- `chips-sdk`：主入口包，导出 `createClient` 与所有能力域封装。
- （可选）`chips-sdk/node`：面向 Node 环境的入口，默认采用 IPC/HTTP 适配器。
- （可选）`chips-sdk/browser`：面向浏览器环境的入口，默认依赖 `window.chips`。

分包策略将在《02-SDK 包结构与目录设计》中细化。

---

## 5. 与 Host / 组件库的协作边界

### 5.1 与 Host 的协作

- SDK 只通过以下方式与 Host 协作：
  - Bridge API：`window.chips.invoke/on/once/emit` 与子域 API。
  - Host 对外接口基线中定义的动作与事件。
- Host 负责：
  - 路由实现与服务语义；
  - 错误码定义与稳定性；
  - 路由清单与契约快照导出（供 SDK 消费）。

### 5.2 与组件库的协作

- 组件库通过统一显示链路消费 SDK 能力：
  - `client.card.coverFrame.render` → `CardCoverFrame` 组件。
  - `client.card.compositeWindow.render` → `CompositeCardWindow` 组件。
- 组件库负责：
  - iframe 容器与状态机；
  - UI 结构与 a11y；
  - 对事件协议与 origin 白名单的消费与校验。
- SDK 负责：
  - 调用 Host 渲染链路；
  - 事件协议的派发与订阅工具；
  - origin 信息的输出。

---

## 6. 风险与阻塞项

> 本节仅记录架构级风险，具体问题需在《项目日志与笔记/问题工单.md》中登记。

- 风险 R1：Host 对外接口与 Bridge API 仍有口径调整风险。
  - 应对：在 SDK 内部引入轻量兼容层，并通过契约测试脚本监控漂移。
- 风险 R2：统一卡片显示链路依赖 Host 渲染运行时与组件库适配，存在联调阻断风险。
  - 应对：依托既有工单 `工单001-SDK-UNIFIED-CARD-DISPLAY-API`，在正式实现前保持适配器契约同步。
- 风险 R3：多环境支持（插件 + 浏览器 + Node）可能引入复杂条件分支。
  - 应对：通过适配器模式封装 Transport，实现环境无关的核心客户端。

---

## 7. 结论

本总体架构设计明确了 `Chips-SDK` 在生态中的角色、与 Host/组件库的边界以及内部分层结构。后续实现必须严格遵守本设计以及生态共用文档中的接口规范，任何架构级偏离都需要通过项目层决策与工单流程处理，不得在实现阶段临时变更。
