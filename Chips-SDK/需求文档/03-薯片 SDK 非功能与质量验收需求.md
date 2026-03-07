# 薯片 SDK 非功能与质量验收需求

> 文档状态：质量基线稿  
> 说明：用于定义 SDK 发布与合并门禁，未达标不得合并至 `develop`。

---

## 1. 性能需求（NFR-SDK-PERF）

> 说明：SDK 自身为轻量封装层，性能指标主要约束“额外开销”而非 Host 内部执行时间。

| 指标 | 目标阈值 | 适用范围 |
|---|---|---|
| SDK 调用包装开销 p95 | <= 2ms | 单次 `client.invoke` 封装层 |
| 卡片显示接口包装开销 p95 | <= 5ms | `client.card.*.render` 参数准备与消息派发 |
| 事件订阅/取消开销 p95 | <= 1ms | `client.events.on/once` 与取消函数 |

### NFR-SDK-PERF-001 性能基线与回归

- 必须提供基础性能基线脚本，对关键 API 的包装开销进行采样与记录。
- 每次重要改动必须跑性能基线脚本，确保未突破阈值；突破视为发布阻断。

---

## 2. 可靠性与鲁棒性需求（NFR-SDK-REL）

### NFR-SDK-REL-001 错误隔离

- SDK 不得在封装层吞掉错误；所有 Host/Bridge 错误必须转换为标准错误对象抛出。
- 单次调用失败不得影响客户端实例其他能力域的正常调用。

### NFR-SDK-REL-002 重试与超时

- 可重试错误（`retryable=true`）才允许在 SDK 内部执行自动重试。
- 默认重试策略应遵循 Host 与 Bridge 规范（指数退避，最多 3 次），并允许通过配置关闭。
- 超时错误必须明确标记为 `BRIDGE_TIMEOUT` 或 `RUNTIME_ROUTE_TIMEOUT`，不得自造错误码。

### NFR-SDK-REL-003 降级与回退

- 在环境能力不足（如缺失 `window.chips`）时，SDK 必须：
  - 提供清晰错误信息（包括如何启用 Host 支持）；
  - 禁止尝试“猜测性” fallback（例如调用不受支持的本地实现）。

---

## 3. 安全需求（NFR-SDK-SEC）

### NFR-SDK-SEC-001 权限边界尊重

- SDK 不得绕过 Host 权限模型；所有敏感能力必须走 Host 侧权限校验。
- 对权限不足错误（如 `PERMISSION_DENIED` / `SERVICE_PERMISSION_DENIED`）必须原样暴露给调用者。

### NFR-SDK-SEC-002 敏感信息处理

- SDK 不得在明文日志中输出访问令牌、刷新令牌或其他敏感信息。
- SDK 内部持久化（如在未来引入本地缓存）必须遵守最小信息原则与加密要求（具体实现届时在技术文档中定义）。

### NFR-SDK-SEC-003 origin 与 iframe 安全

- 卡片显示接口必须：
  - 使用受控的 iframe `sandbox` 配置；
  - 明确暴露 iframe `origin` 并提供辅助工具检查消息来源；
  - 对非白名单来源的消息直接丢弃并可选记录诊断信息。

---

## 4. 可维护性需求（NFR-SDK-MNT）

### NFR-SDK-MNT-001 契约优先

- SDK 新增能力前必须明确其与 Host/Bridge/生态共用文档中的契约映射关系。
- 禁止仅在 SDK 层定义“临时 API”，而未在上游契约中登记。

### NFR-SDK-MNT-002 模块边界清晰

- SDK 内部必须按能力域拆分模块（如 `api-wrapper/`, `types/`, `tooling/`, `contracts/`），避免巨型单文件。
- 模块之间只允许通过公开接口依赖，不得通过相对路径访问内部实现细节。

### NFR-SDK-MNT-003 一致性

- 错误对象、日志字段与动作命名必须与 Host 与 Bridge 规范保持一致。
- 所有公共 API 必须具备 JSDoc/注释，说明用途、参数与错误情况。

---

## 5. 可观测性与调试需求（NFR-SDK-OBS）

### NFR-SDK-OBS-001 日志标准字段

- 若 SDK 暴露调试日志能力，必须使用统一字段：

  ```ts
  interface SdkLogRecord {
    level: 'debug' | 'info' | 'warn' | 'error';
    time: string; // ISO 字符串
    action?: string; // namespace.action
    requestId?: string;
    pluginId?: string;
    details?: unknown;
  }
  ```

### NFR-SDK-OBS-002 调试辅助

- SDK 应提供可选的调试模式，用于：
  - 打印调用参数与返回结果（需注意脱敏）；
  - 打印 Host 错误对象；
  - 在开发环境中辅助定位集成问题。

### NFR-SDK-OBS-003 链路关联

- 在 Host/Bridge 提供 `requestId/traceId` 时，SDK 必须在错误对象中保留这些字段信息，便于跨系统联调。

---

## 6. 测试与发布门禁（NFR-SDK-TEST）

### NFR-SDK-TEST-001 测试层级

- 必须覆盖以下测试层级：
  - 单元测试：能力域内的纯函数与封装逻辑。
  - 契约测试：对 Host 公开动作的封装行为与错误映射。
  - 集成测试：与模拟 Host/Bridge 环境以及真实 Host 的联调测试。

### NFR-SDK-TEST-002 最低覆盖与门禁

- 每个能力模块（如 `file`, `card`, `theme` 封装）至少 8 个单元测试用例。
- 契约测试通过率必须为 100%；发现契约漂移必须先提工单，再决策是否调整代码或更新生态共用文档。

### NFR-SDK-TEST-003 发布阻断条件

以下任一项失败即阻断发布或合并至 `develop`：

- 契约漂移未处理（封装行为与上游契约不一致）。
- 统一卡片显示链路相关测试失败。
- 性能预算（封装层额外开销）超过阈值。
- 高危安全或 origin 相关测试失败。

---

## 7. Git 与交付规范（NFR-SDK-GIT）

### NFR-SDK-GIT-001 分支策略

- 所有 SDK 开发工作必须在 `Chips-SDK` 任务分支进行：
  - 分支名称采用 `codex/*` 前缀；
  - 分支从对应仓库的 `Develop` 分支派生（当前工作树受限时，需在工单中说明情况）。

### NFR-SDK-GIT-002 提交流程

- 先通过本地质量门禁（lint + test）再提交。
- 单次提交应保持语义单一、可回溯，避免“巨型混合提交”。

### NFR-SDK-GIT-003 变更边界

- 不得修改任务范围外文件；如需要跨仓或跨项目改动，必须通过工单协调。
- 不得使用破坏性命令回滚非本任务改动（如 `git reset --hard` 针对已有工作）。

