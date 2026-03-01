# SDK使用指南

## 概述

薯片SDK让第三方开发者可以将薯片能力集成到自己的软件中。SDK提供程序化的接口访问生态的核心功能，包括文件操作、内容渲染、插件管理、主题能力等。

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

SDK提供内容渲染能力。

渲染卡片使用client.render.card方法，传入卡片配置。返回渲染后的HTML字符串或组件。

渲染器支持自定义模板。可以传入自定义模板覆盖默认模板，实现特定设计需求。

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