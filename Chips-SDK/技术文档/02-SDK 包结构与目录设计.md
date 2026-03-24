# SDK 包结构与目录设计

> 文档状态：设计基线稿  
> 适用范围：`Chips-SDK` 仓库目录与内部模块划分

---

## 1. 仓库物理目录规划

结合《薯片生态前端 vNext 架构设计手册》关于包边界的建议，`Chips-SDK` 仓库目录规划如下（仅文档设计，不代表当前已创建）：

```text
Chips-SDK/
  package.json
  tsconfig.json
  src/
    core/              # Core Client Layer：客户端工厂与 Bridge 适配
    api-wrapper/       # Domain Wrapper Layer：按能力域拆分的封装
      file/
      card/
      box/
      resource/
      theme/
      config/
      i18n/
      plugin/
      module/
      window/
      platform/
    types/             # 公共类型定义与导出
    tooling/           # 契约校验、调试工具、测试辅助
    contracts/         # route-manifest 与其他契约快照（只读数据）
  tests/
    core/
    api-wrapper/
    integration/
  技术文档/
  需求文档/
  开发计划/
```

---

## 2. Core Client Layer 目录

`src/core/` 负责：

- 环境探测（`detectEnvironment()`）。
- Bridge 适配（`createBridgeAdapter()`）。
- 客户端工厂（`createClient()`）。
- 错误归一逻辑与重试策略。

建议文件划分：

- `src/core/environment.ts`：环境探测工具。
- `src/core/bridge-adapter.ts`：Bridge/Transport 适配层。
- `src/core/client.ts`：客户端工厂与核心 `invoke` 实现。
- `src/core/errors.ts`：标准错误类型与归一逻辑。

---

## 3. Domain Wrapper Layer 目录

### 3.1 通用约束

- 所有能力域封装仅依赖 `core/client` 导出的调用接口，不直接依赖 `window.chips`。
- 每个能力域一个子目录，导出该域的类型与 API。
- 对外公开 API 须通过顶层入口统一导出（例如 `src/index.ts`）。

### 3.2 能力域子目录示例

- `src/api-wrapper/file/`：
  - `index.ts`：导出 `read/write/list/stat` 封装。
  - `types.ts`：文件相关类型。
  - `__tests__/file.test.ts`：对应单元测试（放在 `tests/api-wrapper/file` 亦可）。

- `src/api-wrapper/card/`：
  - `index.ts`：导出 `parse/validate/render` 与统一显示接口。
  - `display.ts`：`coverFrame/compositeWindow` 显示链路封装。
  - `types.ts`：卡片文档与渲染结果类型。

- 其他能力域（`box/resource/theme/config/i18n/plugin/module/window/platform`）以类似方式组织。

---

## 4. types/ 目录

`src/types/` 存放：

- 公共基础类型：
  - `StandardError`
  - `CardDocument`, `CardRenderView`, `BoxInspectionResult`, `BoxOpenViewResult`, `BoxEntrySnapshot`
  - `ThemeMeta`, `ThemeState`, `ResolvedTheme`, `ThemeContract`
  - `PluginInfo`, `WindowConfig`, `WindowState` 等。
- 环境与客户端配置类型：
  - `SdkEnvironment`
  - `ClientConfig`
  - `BridgeAdapter` 接口等。

类型文件建议：

- `src/types/errors.ts`
- `src/types/card.ts`
- `src/types/box.ts`
- `src/types/theme.ts`
- `src/types/plugin.ts`
- `src/types/client.ts`

顶层入口（`src/index.ts`）统一从 `types/` 再导出公共类型。

---

## 5. tooling/ 目录

`src/tooling/` 主要用于：

- 契约校验与路由清单对齐工具：
  - 解析 `contracts/route-manifest.json`；
  - 检查封装是否存在对未知动作的调用；
  - 检查参数结构是否与契约一致（在测试阶段使用）。
- 调试工具：
  - 调试日志控制与格式统一；
  - 性能采样工具（测量封装层额外开销）。

建议文件：

- `src/tooling/route-manifest.ts`
- `src/tooling/diagnostics.ts`
- `src/tooling/perf-benchmark.ts`

---

## 6. contracts/ 目录

`src/contracts/` 用于存放只读契约快照数据，例如：

- `route-manifest.json`：由 Host 导出，包含公开动作清单与 schema 元信息。
- 其他契约快照（如主题接口契约、数据模型契约等）。

使用原则：

- 数据来源由上游仓库提供（脚本同步或手工更新），SDK 仓不得私自编辑契约内容。
- SDK 只能在测试与工具中消费契约数据，不将其视为运行时配置来源。

---

## 7. 顶层入口设计

顶层入口（`src/index.ts`）职责：

- 导出 `createClient` 与客户端配置类型。
- 导出各能力域命名空间（示意）：

  ```ts
  export { createClient } from './core/client';
  export * from './types';

  export type { Client } from './types/client';
  ```

- 建议客户端实例内部再挂载能力域（`client.card`, `client.file` 等），但也可提供静态工具函数作为补充。

---

## 8. 测试目录规划

`tests/` 建议结构：

```text
tests/
  core/
    client.test.ts
    environment.test.ts
  api-wrapper/
    file.test.ts
    card.test.ts
    card-display.test.ts
    theme.test.ts
    plugin.test.ts
  integration/
    host-bridge-mock.test.ts
    real-host-smoke.test.ts   # 可选：仅在具备 Host 环境时运行
```

测试必须覆盖：

- 正常路径：各能力域 API 在模拟 Host 环境中的基本行为。
- 错误路径：Bridge 不可用、超时、权限拒绝等场景。
- 边界路径：非法参数、空路径、大文件等。

---

## 9. 小结

本文件定义了 `Chips-SDK` 仓库的物理目录与内部模块划分，为后续实现提供统一的结构约束。实际创建目录与文件时必须严格遵守本设计，禁止在实现阶段临时改变结构或引入未规划的模块；若确需调整，应先更新本文件并通过评审。
