# Bridge API使用指南

## 概述

Bridge API是插件访问系统能力的标准接口。本文介绍如何在插件开发中高效使用Bridge API。

## 初始化

在使用Bridge API前，需要确认API已正确加载。Bridge API通过window.chips全局对象暴露。

检查API是否可用的代码应该在插件初始化时执行。如果API不可用，应该显示友好的错误提示。

## 调用方式

Bridge API使用统一的调用模式。invoke方法用于发起请求，语法是window.chips.invoke(service, method, payload)。

service参数指定目标服务，如card、box、file、theme等。method参数指定要调用的方法，如read、write、create等。payload参数是请求数据对象。

invoke方法返回Promise对象。建议使用async/await语法处理异步调用，使代码更简洁易读。

## 文件操作

file子域提供文件系统操作能力。

读取文件使用file.read方法，传入文件路径。返回文件内容字符串或Buffer。文件不存在时抛出错误。

写入文件使用file.write方法，传入文件路径和内容。文件不存在时会创建文件。写入成功返回操作结果。

文件操作支持配置选项。encoding指定字符编码，默认utf-8。flag指定打开模式，如w写入、a追加等。

## 事件监听

on方法用于订阅系统事件。

事件类型使用命名空间格式，如card.created表示卡片创建事件。回调函数接收事件对象作为参数。

事件监听应该在插件，在初始化时设置插件销毁时取消。取消使用off方法，传入订阅ID。

## 错误处理

所有API调用都可能抛出错误。错误对象采用统一标准格式，包含以下字段：

```typescript
interface StandardError {
  code: string;        // 错误码
  message: string;     // 错误描述
  details?: unknown;   // 详细信息
  retryable?: boolean; // 是否可重试
}
```

### 错误码体系

错误码按层级分类：

**Bridge 层错误 (BRIDGE_*)**：
- `BRIDGE_TIMEOUT`：请求超时
- `BRIDGE_UNAVAILABLE`：Bridge 不可用
- `BRIDGE_INVALID_PAYLOAD`：载荷格式错误

**Service 层错误 (SERVICE_*)**：
- `SERVICE_FILE_NOT_FOUND`：文件不存在
- `SERVICE_FILE_PERMISSION_DENIED`：文件权限被拒绝
- `SERVICE_THEME_NOT_FOUND`：主题不存在
- `SERVICE_I18N_KEY_MISSING`：国际化 key 不存在
- `SERVICE_PLUGIN_INVALID`：插件无效
- `SERVICE_PERMISSION_DENIED`：权限不足

**Runtime 层错误 (RUNTIME_*)**：
- `RUNTIME_RETRY_EXhausted`：重试次数耗尽
- `RUNTIME_CIRCUIT_OPEN`：熔断器开启
- `RUNTIME_ROUTE_TIMEOUT`：路由超时

### 错误处理建议

建议使用 try-catch 捕获错误，并向用户提供友好的错误提示：

```typescript
try {
  const result = await window.chips.invoke('theme', 'apply', { id: 'dark' });
} catch (error) {
  if (error.retryable) {
    // 显示可重试提示
    console.log('操作失败，是否重试？');
  } else {
    // 显示永久错误提示
    console.error(error.message);
  }
  // 记录错误日志
  window.chips.invoke('log', 'write', { level: 'error', error });
}
```

## 性能优化

批量操作减少API调用次数。使用Promise.all并行执行独立的请求。

缓存频繁访问的数据。使用storage API缓存请求结果，避免重复网络请求。

合理设置请求超时。使用timeout选项防止请求无限等待。

## 安全考虑

永远不要将敏感信息存储在客户端。使用系统提供的凭证管理服务。

验证用户输入后再发送给API。防止注入攻击。

遵循最小权限原则。只请求实际需要的权限。

## 调试技巧

使用开发者工具查看API调用日志。日志包含请求参数和响应数据。

使用断点调试跟踪API调用流程。观察数据在各个环节的变化。

模拟API响应进行单元测试。隔离依赖加速测试。

## TypeScript支持

TypeScript项目可以使用类型定义文件获得代码补全。类型定义文件chips.d.ts包含所有API的类型声明。

类型定义包括ChipsBridge接口定义所有可用方法，各服务接口定义具体方法，请求和响应类型定义。

建议在开发时启用严格模式 catches更多潜在问题。

## 最佳实践

封装常用的API调用为工具函数。减少重复代码，提高可维护性。

使用配置对象传递参数而非位置参数。提高代码可读性。

记录API调用的日志。便于问题排查和性能分析。

优雅处理边界情况如网络中断、超时等。提高插件健壮性。