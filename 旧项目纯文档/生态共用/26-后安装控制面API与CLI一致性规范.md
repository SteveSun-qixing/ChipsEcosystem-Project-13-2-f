# 26-后安装控制面 API 与 CLI 一致性规范

**版本**：1.0.0  
**更新时间**：2026-02-19  
**状态**：生效

---

## 1. 目的

本规范用于约束“后安装管理”场景下的控制能力暴露方式，确保：

1. 底层控制面 API 为唯一能力源。
2. CLI 与 GUI 共享同一能力与权限模型。
3. 设置操作可自动化、可回归、可审计。

---

## 2. 分层与调用路径

统一调用路径：

- GUI：`window.chips.invoke(...) -> kernel.router.invoke(...)`
- CLI：`chips ... -> Socket JSON-RPC -> kernel.router.invoke(...)`

禁止：

1. GUI 直接实现底层业务逻辑。
2. CLI 绕过 Router 直接调用内部模块。
3. 同一设置项出现“仅 GUI 可用”或“仅 CLI 可用”。

---

## 3. 统一能力域

首批纳入一致性范围的能力域：

1. `runtime.*`
2. `i18n.*`
3. `theme.*`
4. `plugin.*`
5. `bundle.*`
6. `workspace.*`

每个域必须同时具备：

- 路由协议定义
- 权限 scope 定义
- CLI 命令映射
- 错误码定义

---

## 4. 映射规范

### 4.1 命令映射

每个 GUI 操作必须落地为至少一个 CLI 命令，且指向同一条路由。

示例：

- GUI：切换主题  
- CLI：`chips theme apply --id <themeId>`  
- Route：`theme.apply`

### 4.2 参数一致性

1. CLI 参数命名与 route schema 语义一致。
2. GUI 参数组装不得引入 CLI 不支持的隐式字段。
3. 默认值策略在 API 层定义，不在 UI 层私自兜底。

---

## 5. 错误与返回规范

统一错误结构：

```json
{
  "code": "PERMISSION_DENIED",
  "message": "permission denied for route 'plugin.list'",
  "traceId": "...",
  "details": {}
}
```

约束：

1. API、CLI、GUI 共享同一错误码集合。
2. CLI 必须返回非零退出码。
3. GUI 必须展示用户可读提示，并允许查看技术详情。

---

## 6. 权限与审计

1. 每条路由声明最小权限 scope。
2. CLI 会话鉴权失败时必须阻断执行。
3. 高风险操作（卸载、重启、修复）必须写审计日志。
4. 审计日志至少包含：操作者、动作、目标、结果、traceId、时间。

---

## 7. 测试要求

1. 路由注册测试。
2. GUI↔CLI 等价行为测试。
3. 权限拒绝测试。
4. 参数校验与错误码测试。
5. 审计日志完整性测试。

---

## 8. 生效与优先级

当本规范与旧版设置面板协作文档存在冲突时，以本规范为准。
