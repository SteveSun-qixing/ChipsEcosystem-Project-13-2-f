# SDK使用指南

## 概述

薯片SDK让第三方开发者可以将薯片能力集成到自己的软件中。SDK提供程序化的接口访问生态的核心功能，包括文件操作、内容渲染、插件管理、主题能力等。

> 架构归属声明（2026-03-06）：Host 主责 L1-L9 运行时链路（含 Runtime Client 与渲染层）；SDK 仅提供开发封装与调用入口，不承载运行时主实现。

## 安装

SDK通过npm安装。在Node.js项目中使用npm install chips-sdk安装。在浏览器项目中可以使用CDN引入或打包工具导入。

安装后导入SDK模块。ES Module导入方式使用import * as Chips from 'chips-sdk'。CommonJS导入方式使用const Chips = require('chips-sdk')。

## 初始化

使用SDK前需要初始化。创建客户端实例，传入配置选项如服务器地址、认证信息等。初始化会建立与服务的连接。

客户端实例是 SDK 的核心入口，通过实例调用各种功能方法。

## 文件操作

SDK提供卡片文件的读写能力。

解析卡片使用 `client.card.parse()` 方法，传入卡片文件路径或卡片ID。返回卡片对象，包含元数据、内容列表等。方法签名：

```typescript
client.card.parse(cardPath: string): Promise<CardDocument>
```

验证卡片使用 `client.card.validate()` 方法，验证卡片结构是否符合规范。方法签名：

```typescript
client.card.validate(cardDoc: CardDocument): Promise<ValidationResult>
```

渲染卡片使用 `client.card.render()` 方法，传入卡片配置。返回渲染后的视图对象。方法签名：

```typescript
client.card.render(cardDoc: CardDocument, options?: RenderOptions): Promise<CardView>
```

> 注意：旧版 `cards.read`、`cards.create`、`cards.update`、`cards.delete` 方法已归档，请使用 `card.parse/render/validate` 接口。

## 内容渲染

SDK提供 Host 渲染能力的调用封装。

渲染卡片通过 `client.render.card` 或统一显示窗口接口触发 Host 内置渲染运行时。SDK 不直接承载渲染引擎主实现。

模板策略由 Host 渲染运行时统一管理，SDK 只负责参数封装与调用链路。

### card.render（统一渲染入口）推荐封装

SDK 推荐直接封装 Host `card.render`，暴露以下参数：

```typescript
client.card.render({
  cardFile: string,
  options?: {
    target?: 'app-root' | 'card-iframe' | 'module-slot' | 'offscreen-render',
    viewport?: { width?: number; height?: number; scrollTop?: number; scrollLeft?: number },
    verifyConsistency?: boolean
  }
}): Promise<{
  view: {
    title: string;
    body: string;
    contentFiles: string[];
    target: string;
    semanticHash: string;
    diagnostics?: Array<{
      nodeId: string;
      stage: string;
      code: string;
      message: string;
      details?: unknown;
    }>;
    consistency?: {
      consistent: boolean;
      hashByTarget: Record<string, string>;
      mismatches: string[];
    };
  };
}>
```

说明：

- `target` 默认建议为 `card-iframe`。
- `verifyConsistency=true` 适用于测试/验收环境，不建议默认在生产场景全量开启。
- `semanticHash` 可用于跨目标渲染一致性对比与缓存键管理。
- SDK 调用前应做参数预校验；若透传到 Host 后触发 schema 校验失败，错误码为 `SCHEMA_VALIDATION_FAILED`。

### 卡片显示窗口（vNext 统一接口）

在需要展示卡片的应用中，统一使用 SDK 显示窗口接口：

```typescript
client.card.coverFrame.render({
  cardFile: string,
  cardName?: string
}): Promise<IframeWindow>

client.card.compositeWindow.render({
  cardFile: string,
  mode?: 'view' | 'preview'
}): Promise<IframeWindow>
```

说明：

- `coverFrame` 返回卡片封面 iframe（下方显示卡片名称）。
- `compositeWindow` 返回复合卡片 iframe 窗口。
- `compositeWindow.mode` 只允许 `view | preview`。
- 基础卡片分发、模板编译、iframe 拼接由 Host 内置渲染运行时完成；SDK 仅封装调用入口。

## 插件管理

SDK提供插件管理能力。

列出插件使用client.plugins.list方法，返回已安装插件列表。

安装插件使用client.plugins.install方法，传入插件包路径或URL。返回安装结果。

卸载插件使用client.plugins.uninstall方法，传入插件ID。返回卸载结果。

## 主题能力

SDK提供主题相关能力。主题系统遵循五层 token 架构（ref/sys/comp/motion/layout），支持作用域链覆盖。

获取主题列表使用 `client.theme.list()` 方法，返回可用主题列表。方法签名：

```typescript
client.theme.list(publisher?: string): Promise<ThemeInfo[]>
```

获取当前主题使用 `client.theme.getCurrent()` 方法，返回当前活动主题配置。方法签名：

```typescript
client.theme.getCurrent(appId?: string, pluginId?: string): Promise<ThemeInfo>
```

获取主题 CSS 使用 `client.theme.getAllCss()` 方法，传入主题ID，返回主题的完整 CSS 代码。方法签名：

```typescript
client.theme.getAllCss(themeId: string): Promise<string>
```

应用主题使用 `client.theme.apply()` 方法，传入主题ID，切换系统主题。方法签名：

```typescript
client.theme.apply(themeId: string): Promise<void>
```

获取主题契约使用 `client.theme.contract.get()` 方法，获取主题接口点定义。方法签名：

```typescript
client.theme.contract.get(component?: string): Promise<ThemeContract>
```

解析主题链使用 `client.theme.resolve()` 方法，解析多层主题叠加。方法签名：

```typescript
client.theme.resolve(chain: string[]): Promise<ResolvedTheme>
```

## 认证授权

需要认证的接口需要处理授权。

登录接口获取访问令牌。传入用户名和密码，返回访问令牌和刷新令牌。

在后续请求中携带访问令牌。通常通过配置客户端实例的auth选项自动处理令牌刷新。

## 错误处理

SDK方法返回Promise，错误通过Promise reject传递。

错误对象包含code错误码、message错误描述、details详细信息。常见错误包括认证失败、权限不足、资源不存在等。

建议使用try-catch捕获错误，并向用户提供友好的错误提示。

## TypeScript支持

SDK提供完整的TypeScript类型定义。类型定义包含所有方法的参数和返回值类型。

建议使用TypeScript开发以获得类型安全保障。编辑器会提示类型错误，减少运行时问题。

## 性能优化

使用批量操作减少网络请求。SDK支持批量读取、批量写入等方法。

使用缓存避免重复请求。SDK内部会缓存一些常用数据。

合理设置超时时间。根据网络状况和业务需求调整超时配置。

## 安全考虑

令牌安全管理。SDK不存储明文令牌，会加密存储在本地。

敏感操作二次确认。某些敏感操作需要用户确认后才能执行。

遵循最小权限原则。只请求实际需要的接口权限。

## 离线支持

SDK支持离线模式。缓存常用数据到本地，网络恢复后同步。

离线队列将请求存入队列，网络恢复后自动发送。确保离线时的操作不会丢失。

## 最佳实践

封装SDK调用为业务方法。简化业务代码，提高复用性。

使用配置管理不同环境。开发环境、测试环境、生产环境使用不同配置。

记录SDK调用日志。便于问题排查和性能分析。

优雅处理网络异常。提供友好的用户体验。
