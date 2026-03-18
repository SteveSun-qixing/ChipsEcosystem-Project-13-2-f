# SDK使用指南

## 概述

薯片 SDK 当前主要面向两类场景：

- 薯片主机内部应用插件；
- 生态内部工具链与开发命令行。

SDK 提供程序化接口访问生态核心能力，包括文件操作、内容渲染、插件管理、模块能力调用与主题能力。

> 架构归属声明（2026-03-06）：Host 主责 L1-L9 运行时链路（含 Runtime Client 与渲染层）；SDK 仅提供开发封装与调用入口，不承载运行时主实现。

## 安装

生态一方仓库统一通过根工作区安装 SDK：

```bash
cd /Users/sevenstars/Documents/ChipsCard/Develop/Project-13-2-f
npm install
```

随后在一方工程中直接声明正式 semver 依赖（例如 `^0.1.0`），由生态根工作区自动链接到本地 `chips-sdk` 工作区包。

脚手架模板中的默认依赖同样保持 semver 版本范围；当工程创建在生态根工作区内时，`chipsdev create` 只负责把新工程注册进根工作区，不再写入 `file:` 或其他临时依赖。

安装后导入SDK模块。ES Module导入方式使用 `import * as Chips from "chips-sdk"`。CommonJS 导入方式使用 `const Chips = require("chips-sdk")`。

## 开发工作区与用户工作区

与 SDK 配套的正式命令是 `chipsdev`。本轮实现后，开发态插件与主题调试必须明确区分两类工作区：

- `chips` 管理用户工作区 `~/.chips-host`
- `chipsdev` 管理开发工作区 `.chips-host-dev`

如果你在开发态需要安装插件、启用主题、切换主题或检查 Host 状态，应优先使用 `chipsdev plugin.* / theme.* / status / doctor`，不要手工改写开发工作区文件。

## 初始化

使用SDK前需要初始化。创建客户端实例，传入配置选项如服务器地址、认证信息等。初始化会建立与服务的连接。

客户端实例是 SDK 的核心入口，通过实例调用各种功能方法。

## 文件操作

SDK提供卡片文件的读写能力。

系统对话框通过 `client.platform` 正式提供，不要求应用插件自行拼接 `invoke("platform.dialog*")`：

```typescript
client.platform.openFile({
  title: "选择卡片",
  mode: "file",
  allowMultiple: false,
});

client.platform.saveFile({
  title: "保存 .card 文件",
  defaultPath: "/workspace/demo-export.card",
});

client.platform.showMessage({
  title: "导出完成",
  message: "卡片已导出。",
});

client.platform.showConfirm({
  title: "覆盖确认",
  message: "目标文件已存在，是否继续？",
});
```

说明：

- `client.platform.openFile(...)` 对应 Host `platform.dialogOpenFile`；
- `client.platform.saveFile(...)` 对应 Host `platform.dialogSaveFile`；
- `client.platform.showMessage(...)` 对应 Host `platform.dialogShowMessage`；
- `client.platform.showConfirm(...)` 对应 Host `platform.dialogShowConfirm`；
- `defaultPath` 是系统对话框的初始建议路径，不是自动确认结果；Host 仍会弹出正式对话框，用户取消时返回 `null`；
- 应用层应优先调用这些 SDK 正式封装，而不是在业务组件中散落 `client.invoke("platform.dialog*")` 私有调用。

打包目录态卡片使用 `client.card.pack()` 方法，传入卡片目录与输出文件路径。方法签名：

```typescript
client.card.pack(cardDir: string, outputPath: string): Promise<string>
```

解包正式 `.card` 文件使用 `client.card.unpack()` 方法。方法签名：

```typescript
client.card.unpack(cardFile: string, outputDir: string): Promise<void>
```

快速读取卡片元数据使用 `client.card.readMetadata()` 方法，无需先手动解包。方法签名：

```typescript
client.card.readMetadata(cardFile: string): Promise<Record<string, unknown>>
```

解析卡片使用 `client.card.parse()` 方法，传入卡片文件路径或卡片ID。返回卡片对象，包含元数据、内容列表等。方法签名：

```typescript
client.card.parse(cardPath: string): Promise<CardDocument>
```

验证卡片使用 `client.card.validate()` 方法，验证卡片结构是否符合规范。方法签名：

```typescript
client.card.validate(cardDoc: CardDocument): Promise<ValidationResult>
```

渲染卡片使用 `client.card.render()` 方法，传入卡片文件路径。返回渲染后的视图对象。方法签名：

```typescript
client.card.render(cardFile: string, options?: RenderOptions): Promise<CardView>
```

> 注意：旧版 `cards.read`、`cards.create`、`cards.update`、`cards.delete` 方法已归档，请使用 `card.pack/unpack/readMetadata/parse/render/validate` 接口。

## 内容渲染

SDK提供 Host 渲染能力的调用封装。

渲染卡片通过 `client.render.card` 或统一显示窗口接口触发 Host 内置渲染运行时。SDK 不直接承载渲染引擎主实现。

模板策略由 Host 渲染运行时统一管理，SDK 只负责参数封装与调用链路。

### card.render（统一渲染入口）推荐封装

SDK 直接封装 Host `card.render`，推荐签名为：

```typescript
client.card.render(
  cardFile: string,
  options?: {
    target?: 'app-root' | 'card-iframe' | 'module-slot' | 'offscreen-render';
    viewport?: { width?: number; height?: number; scrollTop?: number; scrollLeft?: number };
    verifyConsistency?: boolean;
  }
): Promise<{
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
  mode?: 'view' | 'preview',
  interactionPolicy?: 'native' | 'delegate'
}): Promise<IframeWindow>

client.card.editorPanel.render({
  cardType: string,
  initialConfig?: Record<string, unknown>,
  baseCardId?: string,
  resources?: {
    rootPath?: string,
    resolveResourceUrl?(resourcePath: string): Promise<string> | string,
    releaseResourceUrl?(resourcePath: string): Promise<void> | void,
    importResource?(input: { file: File, preferredPath?: string }): Promise<{ path: string }> | { path: string },
    deleteResource?(resourcePath: string): Promise<void> | void
  }
}): Promise<IframeWindow>
```

说明：

- `coverFrame` 返回卡片封面 iframe（下方显示卡片名称）。
- `compositeWindow` 返回复合卡片 iframe 窗口。
- `compositeWindow.mode` 只允许 `view | preview`。
- `compositeWindow.interactionPolicy` 只允许 `native | delegate`，默认应保持 `native`。
- `compositeWindow.mode = 'preview'` 时，可通过事件订阅接收基础卡片节点选中事件。
- `compositeWindow` 可通过 `onResize` 订阅整张复合卡片当前总高度，正式用于查看器、自适应容器以及仍选择 Host 托管复合 iframe 的场景。
- `compositeWindow.interactionPolicy = 'delegate'` 时，可通过 `onInteraction` 订阅复合卡片内部滚轮、触摸滚动和捏合缩放意图，正式用于无限画布等需要外层壳层接管桌面交互的场景。
- `editorPanel` 返回基础卡片编辑器 iframe，正式用于第三方宿主、调试工具和仍需 Host 托管编辑器 iframe 的场景。
- `editorPanel.resources` 是 SDK 本地资源桥配置，不会进入 `card.renderEditor` 正式路由负载。
- 基础卡片分发、模板编译、iframe 拼接由 Host 内置渲染运行时完成；SDK 仅封装调用入口。

`editorPanel.resources` 规则：

- `resourcePath` 一律使用相对于卡片根目录的路径；
- 只读场景可只传 `rootPath`，SDK 会用它为 `resolveResourceUrl` 生成 `file://` URL；
- 若编辑器支持导入或删除卡片内部资源，宿主必须实现 `importResource/deleteResource`；
- 若宿主返回 `blob:` URL，应负责在适当时机响应 `releaseResourceUrl` 释放临时资源。

适用边界补充：

- `compositeWindow + editorPanel` 仍是生态对外公开的通用 SDK 接口；
- 官方 `Chips-EditingEngine` 的编辑态正式链路不再以这两个接口作为主路径，而是改用本地基础卡片运行时；
- 若不是官方编辑引擎，不得据此复制第二套本地运行时。

复合卡片预览模式推荐事件订阅接口：

```typescript
const preview = await client.card.compositeWindow.render({
  cardFile: '/workspace/demo.card',
  mode: 'preview',
  interactionPolicy: 'delegate',
});

const disposeResize = client.card.compositeWindow.onResize(preview.frame, (payload) => {
  console.log(payload.height, payload.reason);
});

const disposeNodeSelect = client.card.compositeWindow.onNodeSelect(preview.frame, (payload) => {
  console.log(payload.nodeId, payload.cardType, payload.pluginId);
});

const disposeInteraction = client.card.compositeWindow.onInteraction(preview.frame, (payload) => {
  console.log(payload.intent, payload.deltaX, payload.deltaY, payload.zoomDelta);
});
```

`onInteraction` 载荷说明：

- `intent = 'scroll'`：表示复合卡片内部发生了需要由外层壳层消费的滚动意图；
- `intent = 'zoom'`：表示复合卡片内部发生了捏合或等价缩放意图；
- `source` 用于区分事件来自基础卡片 iframe、复合壳层还是降级节点；
- `clientX/clientY` 是相对于复合 iframe 视口的坐标，应用若要把缩放锚定到外层桌面坐标，应先加上外层 iframe 自身的 `getBoundingClientRect().left/top`。

### 基础卡片编辑器面板

Host 托管编辑器链路如下：

1. 应用确定当前基础卡片 `cardType/baseCardId/config`；
2. 调用 `client.card.editorPanel.render(...)`；
3. Host 路由到对应基础卡片插件的 `renderBasecardEditor`；
4. Host 返回完整编辑器文档并由 SDK 封装为 iframe；
5. 若应用传入 `resources`，SDK 负责在本地桥接编辑器 iframe 的资源请求；
6. 应用通过事件订阅接收编辑器状态与配置变更。

推荐事件订阅接口：

```typescript
const result = await client.card.editorPanel.render({
  cardType: 'RichTextCard',
  baseCardId: 'base-1',
  initialConfig: {
    title: 'Hello',
    body: '<p>World</p>',
  },
});

const disposeReady = client.card.editorPanel.onReady(result.frame, () => {
  console.log('editor ready');
});

const disposeChange = client.card.editorPanel.onChange(result.frame, (payload) => {
  console.log(payload.baseCardId, payload.config);
});

const disposeError = client.card.editorPanel.onError(result.frame, (payload) => {
  console.error(payload.code, payload.message);
});
```

资源型编辑器示例：

```typescript
const result = await client.card.editorPanel.render({
  cardType: 'base.image',
  baseCardId: 'image-1',
  initialConfig: {
    card_type: 'ImageCard',
    images: [
      {
        id: 'image-1',
        source: 'file',
        file_path: 'cover.png',
        title: '封面图',
        alt: '卡片封面图',
      },
    ],
    layout_type: 'single',
    layout_options: {
      spacing_mode: 'comfortable',
      single_width_percent: 100,
      single_alignment: 'center',
    },
  },
  resources: {
    rootPath: '/workspace/cards/demo',
    async importResource({ file, preferredPath }) {
      return saveIntoCardRoot(file, preferredPath);
    },
    async deleteResource(resourcePath) {
      await removeFromCardRoot(resourcePath);
    },
    releaseResourceUrl(resourcePath) {
      releaseBlobUrl(resourcePath);
    },
  },
});
```

资源桥接说明：

- Host 托管编辑器 iframe 通过 `chips.card-editor:resource-request/resource-response/resource-release` 协议请求资源操作；
- SDK 负责把这些请求桥接到 `editorPanel.resources`；
- `importResource(...)` 返回的 `path` 必须是卡片根目录相对路径，例如 `cover.png`；
- 若宿主按官方资源链路保存内部文件，应把文件直接写入卡片根目录，而不是写入 `content/`；
- `resources` 只在当前应用进程内生效，不进入 Host 正式 `card.renderEditor` 路由契约。

约束：

- 应用层不得保留本地默认编辑器作为正式路径兜底；
- 普通应用和第三方宿主不得绕过 SDK/Host 直接 import 基础卡片插件源码；
- 选择 Host 托管复合 iframe 的应用，应优先消费 `client.card.compositeWindow.onNodeSelect(...)` 作为基础卡片选中入口；
- 主题与多语言上下文必须由 Host 注入并沿正式链路进入编辑器 iframe。

官方编辑引擎补充：

- 官方编辑引擎的正式编辑态链路改为本地 `EditorHost`；
- 官方编辑引擎的基础卡片预览改为单卡 iframe 拼装；
- 这属于共享文档中正式定义的内部架构，不改变 SDK 对外公开接口。

## 插件管理

SDK 提供插件管理与查询能力，直接映射 Host `plugin.*` 服务动作。

- 列出插件：  
  使用 `client.plugin.list(options?)` 返回已安装插件列表（面向普通插件/应用使用场景）：

  ```typescript
  client.plugin.list(options?: { type?: PluginType; capability?: string }): Promise<PluginInfo[]>;
  ```

- 安装插件：  
  使用 `client.plugin.install(manifestPath)` 安装插件包或插件目录，返回新插件 ID：

  ```typescript
  client.plugin.install(manifestPath: string): Promise<{ pluginId: string }>;
  ```

- 启用 / 禁用插件：  

  ```typescript
  client.plugin.enable(pluginId: string): Promise<void>;
  client.plugin.disable(pluginId: string): Promise<void>;
  ```

- 卸载插件：  

  ```typescript
  client.plugin.uninstall(pluginId: string): Promise<void>;
  ```

- 按运行时记录查询插件（运维/工具场景）：  

  ```typescript
  client.plugin.query(options?: {
    type?: PluginType;
    capability?: string;
  }): Promise<PluginRecord[]>;
  ```

其中 `PluginInfo` 与 `PluginRecord` 的结构在 SDK 类型定义中给出，分别用于“插件自身视角信息”和“Host 运行时插件记录”两类场景。

- 权限边界：
  - `client.plugin.list/get/getSelf/getCardPlugin/getLayoutPlugin/query` 统一要求 `plugin.read`；
  - `client.plugin.install/enable/disable/uninstall` 统一要求 `plugin.manage`。

## 模块能力调用

SDK 提供模块能力调用封装，直接映射 Host 正式模块服务动作。

### 目标模型

模块插件是 Host 托管的无界面能力模块。调用方通过 capability + method 使用模块能力，Host 负责 provider 发现、选择、校验和调度。

### 查询 provider

```typescript
client.module.listProviders(options?: {
  capability?: string;
  pluginId?: string;
  status?: "enabled" | "running";
}): Promise<ModuleProviderInfo[]>
```

### 解析 capability

```typescript
client.module.resolve(capability: string, options?: {
  versionRange?: string;
}): Promise<ModuleProviderInfo>
```

### 调用模块方法

```typescript
client.module.invoke(request: {
  capability: string;
  method: string;
  input: Record<string, unknown>;
  pluginId?: string;
  timeoutMs?: number;
}): Promise<
  | { mode: "sync"; output: unknown }
  | { mode: "job"; jobId: string }
>
```

示例：

```typescript
const result = await client.module.invoke({
  capability: "example.process",
  method: "run",
  input: {
    sourcePath: "/workspace/demo.txt",
  },
});

if (result.mode === "sync") {
  console.log(result.output);
}
```

### Job 管理

```typescript
client.module.job.get(jobId: string): Promise<ModuleJobSnapshot>
client.module.job.cancel(jobId: string): Promise<void>
```

示例：

```typescript
const started = await client.module.invoke({
  capability: "converter.card.export",
  method: "convert",
  input: {
    cardFile: "/workspace/demo.card",
    targetFormat: "html",
  },
});

if (started.mode === "job") {
  const snapshot = await client.module.job.get(started.jobId);
  console.log(snapshot.status);
}
```

### 使用边界

- 调用方应依赖正式 capability 契约，而不是依赖模块仓库 README 中的私有说明；
- 调用方不得直接 import 模块源码；
- 调用方不得散落私有 `client.invoke("module.*")` 拼装；
- Host 内部服务、应用插件以及其他模块插件应统一复用这套 SDK / Host 模块服务模型。

## 主题能力

SDK提供主题相关能力。主题系统遵循五层 token 架构（ref/sys/comp/motion/layout），支持作用域链覆盖。

获取主题列表使用 `client.theme.list()` 方法。它返回的是“当前工作区内已启用主题插件”构成的可用主题列表，而不是所有已安装但未启用的主题。方法签名：

```typescript
client.theme.list(publisher?: string): Promise<ThemeInfo[]>
```

获取当前主题使用 `client.theme.getCurrent()` 方法，返回当前活动主题配置。应用初始化时应优先读取这一结果或 Host preload 注入的主题属性，不得写死默认主题。方法签名：

```typescript
client.theme.getCurrent(appId?: string, pluginId?: string): Promise<ThemeInfo>
```

获取主题 CSS 使用 `client.theme.getAllCss()` 方法，返回当前主题的完整 CSS 与主题标识。方法签名：

```typescript
client.theme.getAllCss(): Promise<{ css: string; themeId: string }>
```

应用主题使用 `client.theme.apply()` 方法，传入主题 ID 切换当前工作区主题。方法签名：

```typescript
client.theme.apply(themeId: string): Promise<void>
```

获取主题契约使用 `client.theme.contract.get()` 方法，获取主题接口点定义。方法签名：

```typescript
client.theme.contract.get(component?: string): Promise<ThemeContract>
```

解析主题链使用 `client.theme.resolve()` 方法，返回解析链路与 token 视图。方法签名：

```typescript
client.theme.resolve(chain: string[]): Promise<{
  resolved: Array<{ id: string; displayName: string; order: number }>;
  tokens: Record<string, unknown>;
}>
```

## 平台辅助能力

对于必须由 preload 在本地完成的拖拽路径解析场景，SDK 透出正式辅助入口：

```typescript
client.platform.getPathForFile(file: unknown): string
```

说明：

- 该能力用于把拖拽或文件选择得到的 `File` 对象解析为本地路径；
- Electron Host 环境会直接复用 `window.chips.platform.getPathForFile`；
- 非支持环境返回空字符串，调用方应把空字符串视为“当前环境不支持该能力”。

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
