# Bridge 封装与客户端内核设计

> 文档状态：设计基线稿  
> 范围：`src/core/*` 模块设计与 Bridge 适配策略

---

## 1. 目标

- 为所有能力域提供统一的客户端调用入口与错误模型。
- 屏蔽环境差异（插件内、浏览器、Node）与 Transport 差异。
- 避免在各能力域重复编写 `window.chips.invoke` 相关胶水代码。

---

## 2. 客户端配置与类型

### 2.1 客户端配置结构

```ts
interface ClientConfig {
  endpoint?: string; // 远程 Host 地址（Node/浏览器环境可用）
  timeoutMs?: number;
  retries?: 0 | 1 | 2 | 3;
  environment?: 'auto' | 'plugin' | 'browser' | 'node';
  auth?: {
    accessToken?: string;
    refreshToken?: string;
    onRefresh?: (tokens: Tokens) => void;
  };
  logger?: SdkLogger;
}
```

### 2.2 客户端实例接口

```ts
interface Client {
  invoke<I, O>(action: `${string}.${string}`, payload: I): Promise<O>;
  events: {
    on<T>(event: string, handler: (payload: T) => void): () => void;
    once<T>(event: string, handler: (payload: T) => void): void;
    emit<T>(event: string, payload: T): Promise<void>;
  };
  config: Readonly<ClientConfig>;
}
``>

> 实际类型定义以 `src/types/client.ts` 为准，本文件只描述设计。

---

## 3. 环境探测设计

### 3.1 探测流程

1. 若显式传入 `environment`，按照指定模式运行：
   - `plugin`：必须存在 `window.chips`。
   - `browser`：存在 `window`，但不强制 `window.chips`。
   - `node`：无 `window`。
2. 若未指定，按以下顺序自动探测：
   - 存在 `window` 且 `window.chips` → `plugin`。
   - 存在 `window` 且无 `window.chips` → `browser`。
   - 否则 → `node`。

### 3.2 异常处理

- 在 `plugin` 模式缺失 `window.chips` 时：
  - 创建客户端失败，抛出 `BRIDGE_UNAVAILABLE`。
- 在 `browser`/`node` 模式缺失与 Host 的可用 Transport 时：
  - 在首次调用 `invoke` 时抛出 `BRIDGE_UNAVAILABLE`，并在错误信息中附带“如何启动 Host 侧服务”的提示。

---

## 4. Bridge 适配器设计

### 4.1 适配器接口

```ts
interface BridgeAdapter {
  invoke<I, O>(action: `${string}.${string}`, payload: I, config: ClientConfig): Promise<O>;
  on<T>(event: string, handler: (payload: T) => void): () => void;
  once<T>(event: string, handler: (payload: T) => void): void;
  emit<T>(event: string, payload: T): Promise<void>;
}
```

### 4.2 适配器实现

- `PluginBridgeAdapter`：
  - 基于 `window.chips.invoke/on/once/emit` 实现。
  - 直接消费 Bridge API 规范定义的接口。
- `BrowserHttpAdapter`（可选，视 Host 是否提供 HTTP 接口）：
  - 使用 `fetch` 调用 Host HTTP 接口。
  - 仅在明确存在 `endpoint` 时启用。
- `NodeIpcAdapter`（可选）：
  - 通过本地 IPC/Unix Socket 调用 Host 服务。
  - 需要 Host CLI 或服务侧提供相应能力。

> 初始阶段可仅实现 `PluginBridgeAdapter`，在发现明确需求且上游能力就绪后再扩展其他适配器。

---

## 5. 错误归一与重试策略

### 5.1 错误归一逻辑

- Bridge/Host 返回错误对象或抛出异常时，统一转换为：

  ```ts
  interface StandardError {
    code: string;
    message: string;
    details?: unknown;
    retryable?: boolean;
    requestId?: string;
    traceId?: string;
  }
  ```

- 若错误已符合标准结构，直接透传（可补充环境信息）。
- 对于非结构化错误（如字符串、Error 实例），包装为：
  - `code: 'INTERNAL_ERROR'`
  - `details` 中附带原始错误。

### 5.2 重试策略

- 仅当 `retryable=true` 且客户端配置允许重试时才执行自动重试。
- 默认策略：
  - 最大重试次数：`config.retries`（0–3）。
  - 退避：`200ms * 2^n`。
- 不对 Host 内部的重试策略做额外叠加；如 Host 已处理重试，SDK 应将 `retries` 设为 0。

---

## 6. 日志与诊断挂钩

- Core Client 可接受可选 `logger`：

  ```ts
  interface SdkLogger {
    debug(record: SdkLogRecord): void;
    info(record: SdkLogRecord): void;
    warn(record: SdkLogRecord): void;
    error(record: SdkLogRecord): void;
  }
  ```

- 对于以下事件，建议输出调试日志（在调试模式开启时）：
  - Bridge 调用开始与结束（含耗时）。
  - 环境探测结果。
  - 错误归一结果（注意脱敏）。

---

## 7. 小结

本设计为 `Chips-SDK` 提供了稳定、可扩展的客户端内核与 Bridge 适配层，为上层能力域封装提供统一的调用与错误模型。实现时必须严格遵守本设计，不得在能力域内绕过 Core Client 直接访问 `window.chips` 或 Transport。

