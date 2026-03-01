# Bridge API 参考手册

> 文档状态：阶段01冻结同步稿（2026-02-24）
> 统一口径：12层 vNext、Bridge 三层（`UI Hooks -> Runtime Client -> Bridge Transport`）、主题动作（`theme.list/theme.apply/theme.getCurrent/theme.getAllCss/theme.resolve/theme.contract.get`）、`cpx` + `baseWidth: 1024`。
> 冲突优先级：若与历史描述冲突，以 `生态架构设计/生态重构开发计划/18-阶段18-主题系统组件库前端框架开发/执行计划/阶段01-全量技术文档与标准冻结/` 目录下冻结文档为准。


Bridge API 是插件访问系统能力的唯一入口：`window.chips.*`。

## 1. 顶层接口

```ts
window.chips.invoke(namespace, action, params?)
window.chips.on(event, handler)
window.chips.once(event, handler)
window.chips.emit(event, data?)
window.chips.window.*
window.chips.dialog.*
window.chips.plugin.*
window.chips.clipboard.*
window.chips.shell.*
```

## 2. 通用调用 `invoke`

```ts
const result = await window.chips.invoke('file', 'read', {
  path: '/workspace/demo.txt',
  encoding: 'utf8',
});
```

- `namespace`: 服务命名空间（如 `file`、`card`、`theme`）
- `action`: 动作名（如 `read`、`open`、`getAllCss`）
- `params`: 可结构化克隆对象

错误格式：

```ts
interface ChipsBridgeError {
  code: string;
  message: string;
  details?: unknown;
  retryable?: boolean;
}
```

## 3. 14 类基础服务动作基线

> 以下动作集与《基础服务 API 规格》保持一致。

| 命名空间 | 动作 |
|---|---|
| `file` | `read` `write` `exists` `list` `mkdir` `delete` `copy` `move` `watch` `identify` `stat` |
| `card` | `open` `save` `getMetadata` `getStructure` `getBaseCardConfig` `updateBaseCardConfig` `addBaseCard` `removeBaseCard` `getCover` `updateCover` `quickPreview` `validate` |
| `box` | `open` `save` `getMetadata` `getCardList` `getLayoutConfig` `addCard` `removeCard` `scanExternal` |
| `resource` | `fetch` `resolve` `cache` `check` `getMeta` `clearCache` |
| `zip` | `create` `extract` `readEntry` `listEntries` |
| `config` | `get` `set` `delete` `list` |
| `theme` | `list` `get` `apply` `getAllCss` `getCurrent` `resolve` `contract.get` `install` `uninstall` |
| `i18n` | `translate` `translateBatch` `getCurrent` `setCurrent` `registerVocabulary` `list` |
| `credential` | `save` `get` `delete` `list` |
| `log` | `write` `query` `export` |
| `tag` | `add` `remove` `queryFiles` `getFileTags` `search` `batchUpdate` |
| `serializer` | `parseYaml` `stringifyYaml` `parseJson` `stringifyJson` |
| `platform` | `getSystemInfo` `getScreenInfo` `hasCapability` `listCapabilities` `getAppearance` `getPowerStatus` `registerShortcut` `unregisterShortcut` `setAutoLaunch` `showInFileManager` `openExternal` |
| `module` | `load` `list` `query` `getInfo` |

## 4. 常用调用示例

### 4.1 文件

```ts
const readResult = await window.chips.invoke<{ content: string }>('file', 'read', {
  path: '/workspace/demo.txt',
  encoding: 'utf8',
});

await window.chips.invoke('file', 'write', {
  path: '/workspace/demo.txt',
  content: readResult.content + '\nupdated',
  overwrite: true,
});
```

### 4.2 卡片会话

```ts
const opened = await window.chips.invoke<{ sessionId: string; lockId?: string }>('card', 'open', {
  cardPath: '/workspace/demo.card',
  mode: 'write',
});

const metadata = await window.chips.invoke<{ metadata: Record<string, unknown> }>('card', 'getMetadata', {
  sessionId: opened.sessionId,
});

await window.chips.invoke('card', 'save', {
  sessionId: opened.sessionId,
  lockId: opened.lockId,
  validateBeforeSave: true,
});
```

### 4.3 序列化

```ts
const parsed = await window.chips.invoke<{ data: unknown }>('serializer', 'parseYaml', {
  text: 'name: chips',
});

await window.chips.invoke('serializer', 'stringifyJson', {
  data: parsed.data,
  indent: 2,
});
```

### 4.4 主题与多语言

```ts
const cssLayers = await window.chips.invoke<{ css: Record<string, string> }>('theme', 'getAllCss', {
  appId: 'chips-official.viewer',
});
const themeSnapshot = await window.chips.invoke<{
  resolvedThemeId: string;
  mergedTokens: Record<string, string>;
}>('theme', 'resolve', {
  chain: {
    global: 'chips-official.default-theme',
    app: 'chips-official.macaron-premium',
  },
});

const text = await window.chips.invoke<{ text: string; locale: string }>('i18n', 'translate', {
  key: 'common.save',
});
```

## 5. 事件接口

```ts
const stop = window.chips.on('theme.changed', (payload) => {
  console.log('theme changed', payload);
});

window.chips.once('language.changed', (payload) => {
  console.log('language changed', payload);
});

stop();
```

- 事件名仅支持点语义（如 `theme.changed`、`language.changed`、`card.*`）。
- 冒号事件（如 `theme:changed`）会被 Bridge Transport 拒绝。

## 6. 子 API

### 6.1 `window.chips.window`

- `close` `minimize` `maximize` `restore`
- `setTitle` `setSize` `getSize`
- `setPosition` `getPosition`
- `setFullScreen` `isFullScreen` `setAlwaysOnTop`
- `openPlugin` `getInfo`

### 6.2 `window.chips.dialog`

- `showOpenDialog`
- `showSaveDialog`
- `showMessageBox`

### 6.3 `window.chips.plugin`

- `getSelf`
- `list`
- `get`
- `getCardPlugin`
- `setDefaultCardPlugin`
- `getLayoutPlugin`
- `resolveFileUrl`

### 6.4 `window.chips.clipboard`

- `readText` `writeText`
- `readHTML` `writeHTML`
- `readImage` `writeImage`
- `clear`

### 6.5 `window.chips.shell`

- `openPath`
- `showItemInFolder`
- `openExternal`
- `beep`

## 7. 权限提示

- 任何 `invoke` 动作的权限由路由元数据决定。
- 建议按最小权限在 `manifest.yaml` 声明。
- `shell.openExternal`、删除类动作通常属于高风险操作，需重点审查。

## 8. 主题与 i18n 全链路说明（2026-02-27）

### 8.1 主题动作访问级别

| 动作 | 访问级别 | 说明 |
|------|---------|------|
| `theme.apply` | permissioned | 切换全局主题，触发 `theme.changed` 事件 |
| `theme.getCurrent` | permissioned | 获取当前主题 ID |
| `theme.getAllCss` | permissioned | 获取当前主题 CSS 分层对象（`tokens/components/animations/icons`） |
| `theme.resolve` | permissioned | 按作用域链解析主题 |
| `theme.contract.get` | permissioned | 获取主题契约（Token 结构） |
| `theme.list` | internal | 列出已安装主题 |
| `theme.get` | internal | 获取主题详情 |
| `theme.install` / `theme.uninstall` | internal | 安装/卸载主题包 |

### 8.2 事件全链路

`theme.apply` 调用后的事件传播：

```
theme.apply → Host theme-service 写配置 + 清缓存
            → emitThemeChanged(themeId) 发布 theme.changed 事件
            → event-forwarder 自动转发到所有渲染进程
            → SDK useTheme().onChanged 回调
            → viewer/editor 壳层 onThemeChanged 回调
            → 壳层按 `tokens -> components -> animations -> icons` 拼接 CSS 字符串并联合 resolve tokens
            → 壳层通过 broadcastThemeChange(css, tokens, themeId) 向 card iframe 发送 theme-change 消息
```

`i18n.setCurrent` 调用后的事件传播：

```
i18n.setCurrent → Host i18n-service 更新 locale + 持久化
               → emitLanguageChanged(locale) 发布 language.changed 事件
               → event-forwarder 自动转发到所有渲染进程
               → SDK useI18n().onChanged 回调
               → viewer/editor 壳层 onLanguageChanged 回调
               → 壳层通过 broadcastLanguageChange() 向 card iframe 发送 language-change 消息
```

### 8.3 Card Runtime 初始化

card iframe 发送 `ready` 消息后，壳层通过 bridge 获取主题分层 CSS + resolve tokens + Host locale，并在壳层标准化为 `theme.css: string`、`theme.tokens: Record<string, string>` 注入 `init` 载荷。card iframe 启动即拥有正确的主题和语言环境。
