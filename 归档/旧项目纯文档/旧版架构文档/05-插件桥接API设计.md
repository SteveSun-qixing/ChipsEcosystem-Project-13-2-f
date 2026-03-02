# 插件桥接 API 设计

> 文档状态：阶段01冻结同步稿（2026-02-24）
> 统一口径：12层 vNext、Bridge 三层（`UI Hooks -> Runtime Client -> Bridge Transport`）、主题动作（`theme.list/theme.apply/theme.getCurrent/theme.getAllCss/theme.resolve/theme.contract.get`）、`cpx` + `baseWidth: 1024`。
> 冲突优先级：若与历史描述冲突，以 `生态架构设计/生态重构开发计划/18-阶段18-主题系统组件库前端框架开发/执行计划/阶段01-全量技术文档与标准冻结/` 目录下冻结文档为准。


**编写时间**：2026-02-12
**文档类型**：架构设计

---

## 一、桥接 API 的定位

桥接 API（Bridge API）是插件应用访问系统能力的**唯一通道**。它类似于微信小程序中的 `wx.*` API、浏览器中的 `Web API`。

**核心约束**：
- 插件运行在沙箱化的渲染进程中，`nodeIntegration: false`
- 插件不能直接访问 Node.js API（fs、path、child_process 等）
- 插件不能直接访问 Electron API（BrowserWindow、ipcRenderer 原始接口等）
- 所有系统级操作必须通过 Bridge API 间接完成

**技术实现**：
- 通过 Electron 的 `contextBridge.exposeInMainWorld()` 注入到渲染进程的 `window` 对象
- 底层通过 `ipcRenderer.invoke()` 与主进程通信
- 主进程的 IPC 处理器将请求转交给内核路由器

阶段06模板契约补充：
- 五模板统一 `schemaVersion: "1.0.0"` 与 `compatibility.host`。
- 页面型插件（`app/card/layout/module`）强制 `ui.layout`；`theme` 插件豁免 `ui.layout`。
- 页面能力调用固定链路：`UI Hooks -> Runtime Client -> Bridge Transport`。

---

## 二、API 总览

Bridge API 挂载在 `window.chips` 命名空间下：

```typescript
interface ChipsBridgeAPI {
  // 通用调用接口
  invoke(namespace: string, action: string, params?: any): Promise<any>;

  // 事件系统
  on(event: string, callback: (data: any) => void): () => void;
  once(event: string, callback: (data: any) => void): () => void;
  emit(event: string, data?: any): void;

  // 窗口控制
  window: WindowBridgeAPI;

  // 对话框
  dialog: DialogBridgeAPI;

  // 插件信息
  plugin: PluginBridgeAPI;

  // 剪贴板
  clipboard: ClipboardBridgeAPI;

  // Shell 操作
  shell: ShellBridgeAPI;
}
```

---

## 三、通用调用接口

### 3.1 chips.invoke()

这是最核心的 API，可以调用所有注册在内核上的服务：

```typescript
// 签名
chips.invoke(namespace: string, action: string, params?: any): Promise<any>

// 示例
// 读取文件
const content = await chips.invoke('file', 'read', { path: '/path/to/file.txt' });

// 读取卡片元数据
const metadata = await chips.invoke('card', 'getMetadata', { cardPath: '/path/to/card.card' });

// 获取主题 CSS 分层对象（Host 规范）
const cssLayers = await chips.invoke('theme', 'getAllCss', { appId: 'chips-official.viewer' });

// 解析主题 token
const resolved = await chips.invoke('theme', 'resolve', {
  chain: {
    global: 'chips-official.default-theme',
    app: 'chips-official.macaron-premium',
  },
});

// 翻译文本
const text = await chips.invoke('i18n', 'translate', { key: 'i18n.core.000001' });

// 查询标签
const files = await chips.invoke('tag', 'queryFiles', {
  tags: [
    { key: '月份', value: '三月' },
    { key: '创作者', value: '小明' }
  ]
});
```

**返回值约定**：
- 成功时返回结果数据（可以是任何可序列化的值）
- 失败时抛出错误，错误对象包含 `code`、`message`、`details` 字段

**错误处理**：
```typescript
try {
  const data = await chips.invoke('file', 'read', { path: '/nonexistent' });
} catch (error) {
  console.error(error.code);     // 'FILE_NOT_FOUND'
  console.error(error.message);  // '文件不存在: /nonexistent'
}
```

---

## 四、事件系统 API

### 4.1 chips.on()

订阅事件，返回取消订阅函数：

```typescript
// 监听主题变化
const unsubscribe = chips.on('theme.changed', (newTheme) => {
  apply(newTheme);
});

// 取消订阅
unsubscribe();
```

### 4.2 chips.once()

单次订阅：

```typescript
// 等待系统就绪
chips.once('system.ready', () => {
  initializeApp();
});
```

### 4.3 chips.emit()

发送事件（主要用于插件间通信）：

```typescript
// 通知其他插件某个卡片已更新
chips.emit('card.updated', { cardId: 'a1B2c3D4e5' });
```

### 4.4 常用事件列表

| 事件名 | 触发时机 | 数据 | 实现状态 |
|--------|---------|------|---------|
| system.ready | 系统初始化完成 | 无 | ✅ |
| system.shuttingDown | 系统即将关闭 | 无 | ✅ |
| theme.changed | 全局主题变更（`theme.apply` 后发布） | { themeId } | ✅ 2026-02-27 |
| language.changed | 语言切换（`i18n.setCurrent` 后发布） | { locale } | ✅ |
| config.updated | 配置变更 | { key, value } | ✅ |
| plugin.installed | 插件安装 | { pluginId } | ✅ |
| plugin.uninstalled | 插件卸载 | { pluginId } | ✅ |
| card.opened | 卡片被打开 | { cardPath } | ✅ |
| card.saved | 卡片被保存 | { cardPath } | ✅ |
| card.updated | 卡片内容更新 | { cardId } | ✅ |
| file.changed | 文件系统变化 | { path, type } | ✅ |

> 注：`theme.changed` 事件由 Host `theme-service.ts` 的 `handleApply` 在写配置后通过 `emitThemeChanged()` 发布，`event-forwarder.ts` 自动转发到所有渲染进程。SDK `useTheme().onChanged` 可直接订阅。
> 注：viewer/editor 壳层消费 `theme.getAllCss` 时必须先将分层对象按 `tokens -> components -> animations -> icons` 拼接为 `css: string`，再与 `theme.resolve().mergedTokens` 一并广播给 card iframe；card-runtime `init` 注入面固定为 `{ theme: { css: string, tokens: Record<string,string> } }`。

---

## 五、窗口控制 API

```typescript
interface WindowBridgeAPI {
  // 窗口操作
  close(): void;
  minimize(): void;
  maximize(): void;
  restore(): void;
  setTitle(title: string): void;
  setSize(width: number, height: number): void;
  getSize(): Promise<{ width: number, height: number }>;
  setPosition(x: number, y: number): void;
  getPosition(): Promise<{ x: number, y: number }>;
  setFullScreen(flag: boolean): void;
  isFullScreen(): Promise<boolean>;
  setAlwaysOnTop(flag: boolean): void;

  // 打开其他插件
  openPlugin(pluginId: string, params?: any): Promise<void>;

  // 当前窗口信息
  getInfo(): Promise<{
    pluginId: string;
    windowId: number;
    bounds: { x: number, y: number, width: number, height: number };
  }>;
}
```

使用示例：

```typescript
// 设置窗口标题
chips.window.setTitle('我的卡片 - 薯片编辑引擎');

// 打开查看器插件查看特定卡片
await chips.window.openPlugin('chips-official.viewer', {
  file: '/path/to/card.card'
});

// 全屏切换
const isFS = await chips.window.isFullScreen();
chips.window.setFullScreen(!isFS);
```

---

## 六、对话框 API

```typescript
interface DialogBridgeAPI {
  // 打开文件选择对话框
  showOpenDialog(options: {
    title?: string;
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
    multiSelections?: boolean;
    directory?: boolean;
  }): Promise<string[] | null>;

  // 打开保存对话框
  showSaveDialog(options: {
    title?: string;
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
  }): Promise<string | null>;

  // 消息对话框
  showMessageBox(options: {
    type?: 'info' | 'warning' | 'error' | 'question';
    title?: string;
    message: string;
    detail?: string;
    buttons?: string[];
    defaultId?: number;
  }): Promise<{ response: number }>;
}
```

使用示例：

```typescript
// 选择视频文件
const files = await chips.dialog.showOpenDialog({
  title: '选择视频文件',
  filters: [
    { name: '视频文件', extensions: ['mp4', 'webm', 'mkv'] }
  ]
});

if (files) {
  // 用户选择了文件
  await handleVideoImport(files[0]);
}
```

---

## 七、插件信息 API

```typescript
interface PluginBridgeAPI {
  // 获取当前插件信息
  getSelf(): Promise<{
    id: string;
    version: string;
    type: string;
    installPath: string;
  }>;

  // 查询已安装的插件
  list(filter?: {
    type?: 'app' | 'card' | 'layout' | 'theme';
    capability?: string;
  }): Promise<PluginInfo[]>;

  // 获取指定插件信息
  get(pluginId: string): Promise<PluginInfo | null>;

  // 获取卡片插件（按卡片类型）
  getCardPlugin(cardType: string): Promise<{
    pluginId: string;
    rendererPath: string;
    editorPath: string;
  } | null>;

  // 获取布局插件（按布局类型）
  getLayoutPlugin(layoutType: string): Promise<{
    pluginId: string;
    rendererPath: string;
    editorPath: string;
  } | null>;
}
```

使用示例：

```typescript
// 查找视频卡片的渲染插件
const videoPlugin = await chips.plugin.getCardPlugin('VideoCard');
if (videoPlugin) {
  // 创建 iframe 加载渲染组件
  const iframe = document.createElement('iframe');
  iframe.src = videoPlugin.rendererPath;
  container.appendChild(iframe);
}
```

---

## 八、剪贴板 API

```typescript
interface ClipboardBridgeAPI {
  readText(): Promise<string>;
  writeText(text: string): Promise<void>;
  readHTML(): Promise<string>;
  writeHTML(html: string): Promise<void>;
  readImage(): Promise<string | null>;   // 返回 data URL
  writeImage(dataUrl: string): Promise<void>;
  clear(): Promise<void>;
}
```

---

## 九、Shell API

```typescript
interface ShellBridgeAPI {
  // 用系统默认应用打开文件
  openPath(path: string): Promise<void>;

  // 在文件管理器中显示文件
  showItemInFolder(path: string): Promise<void>;

  // 用系统默认浏览器打开 URL
  openExternal(url: string): Promise<void>;

  // 发出系统提示音
  beep(): void;
}
```

---

## 十、权限控制

### 10.1 API 权限映射

并非所有 Bridge API 都无条件开放。部分 API 需要插件在 manifest.yaml 中声明对应权限：

| API | 需要的权限 | 说明 |
|-----|-----------|------|
| chips.invoke('file', 'read') | file.read | 读取文件 |
| chips.invoke('file', 'write') | file.write | 写入文件 |
| chips.invoke('file', 'delete') | file.delete | 删除文件 |
| chips.invoke('resource', 'fetch') | resource.fetch | 网络请求 |
| chips.invoke('card', 'read*') | card.read | 读取卡片 |
| chips.invoke('card', 'write*') | card.write | 修改卡片 |
| chips.window.openPlugin() | window.create | 创建窗口 |
| chips.shell.openExternal() | shell.openExternal | 打开外部链接 |

### 10.2 权限检查流程

```
1. 插件调用 chips.invoke('file', 'write', {...})
2. Bridge 将请求发送到主进程
3. 主进程 IPC 处理器识别请求来自哪个窗口
4. 查询该窗口对应的插件 ID
5. 从注册表获取该插件的权限列表
6. 检查 'file.write' 是否在权限列表中
7. 如果有权限，转发给路由器执行
8. 如果无权限，返回 PERMISSION_DENIED 错误
```

### 10.3 无需权限的 API

以下 API 对所有插件无条件开放：
- chips.on() / chips.emit()（事件系统）
- chips.window.close/minimize/maximize（窗口基本操作）
- chips.window.setTitle/getSize/getPosition（窗口信息）
- chips.plugin.getSelf()（获取自身信息）
- chips.invoke('i18n', 'translate')（翻译文本）
- chips.invoke('config', 'get')（读取配置，不含敏感项）
- chips.invoke('theme', 'get*')（获取主题）

---

## 十一、SDK 封装

薯片 SDK 是 Bridge API 的高层封装，为插件开发者提供更友好的开发体验：

```typescript
// SDK 封装示例
import { ChipsSDK } from '@chips/sdk';

const sdk = new ChipsSDK();

// SDK 提供类型安全的 API
const metadata = await sdk.card.getMetadata('/path/to/card.card');
// 而不是 chips.invoke('card', 'getMetadata', { cardPath: '...' })

// SDK 提供 Vue/React 集成
const { useTheme } = sdk.composables;
const theme = useTheme(); // 自动响应主题变化

// SDK 提供卡片渲染辅助
const renderer = sdk.createCardRenderer(containerElement);
await renderer.loadCard('/path/to/card.card');
```

SDK 是可选的。插件可以直接使用 `window.chips.*` 原始 API，也可以通过 SDK 获得更好的开发体验。SDK 本身是纯前端代码，运行在渲染进程中，底层仍然通过 Bridge API 与主进程通信。

---

## 十二、性能优化

### 12.1 批量调用

```typescript
// 批量获取多个基础卡片的配置，一次 IPC 调用
const configs = await chips.invoke('card', 'getBaseCardConfigBatch', {
  cardPath: '/path/to/card.card',
  baseCardIds: ['id1', 'id2', 'id3']
});
// 而不是 3 次独立的 chips.invoke()
```

### 12.2 缓存策略

SDK 可以在渲染进程中维护缓存，减少 IPC 调用：
- 配置数据缓存（config 值在读取后缓存，监听变化事件自动更新）
- 主题 CSS 缓存（主题不频繁变化）
- 翻译文本缓存（语言切换时清除）

### 12.3 流式传输

大文件读取使用流式传输，避免一次性传输大量数据：

```typescript
// 大文件读取返回文件 URL 而非内容
const fileUrl = await chips.invoke('resource', 'getLocalUrl', {
  path: '/path/to/large-video.mp4'
});
// 返回 file:///cached/path/video.mp4
// 插件直接使用 URL 加载，不通过 IPC 传输文件内容
```
