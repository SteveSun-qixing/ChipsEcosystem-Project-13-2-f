# Host服务域设计

> **版本**：vNext 架构设计冻结稿  
> **层级**：L3 Host Services  
> **适用阶段**：阶段18及后续重构实施阶段


## 架构归属声明（2026-03-06）

- Host 主责 L1-L9 运行时链路（含 Runtime Client、Declarative UI、Unified Rendering）并随 Host 发布。
- 组件库主责 L10 Component Headless，只负责状态机、结构与 a11y。
- SDK 仅作为开发者工具包提供类型、封装、脚手架与测试辅助，不承载运行时主实现。
- 用户设备仅安装 Host 即可运行；SDK 仅在开发与集成阶段按需使用。

## 服务域概述

Host服务域是薯片生态运行在主进程中的核心服务集合，为上层插件和应用提供各种系统级能力。

**L3层级定位**：

| 层级 | 名称 | 核心职责 | 只允许依赖 | 禁止依赖 |
|---|---|---|---|---|
| L2 | Host Kernel | router/registry/event/lifecycle | PAL | 应用页面代码 |
| **L3** | **Host Services** | **file/resource/config/theme/i18n 等** | **Kernel** | **插件 UI** |

**依赖约束**：
- L3只允许依赖L2（Kernel）
- L3禁止依赖插件UI（L12）

---

## 服务域清单（16个服务）

| 序号 | 服务域 | 说明 | 核心动作面 |
|------|--------|------|------------|
| 1 | `file` | 文件系统操作服务 | read/write/stat/list |
| 2 | `resource` | 资源解析、读取与路由打开服务 | resolve/open/readMetadata/readBinary |
| 3 | `config` | 配置管理服务 | get/set/batchSet/reset |
| 4 | `theme` | 主题管理服务 | list/apply/getCurrent/getAllCss/resolve/contract.get |
| 5 | `i18n` | 国际化服务 | getCurrent/setCurrent/translate/listLocales |
| 6 | `window` | 窗口管理服务 | open/focus/resize/setState |
| 7 | `plugin` | 插件管理服务 | install/enable/disable/uninstall/query |
| 8 | `module` | 模块能力服务 | listProviders/resolve/invoke/job.get/job.cancel |
| 9 | `platform` | 平台系统能力服务 | getInfo/getCapabilities/openExternal/dialog*/clipboard*/shell*/notificationShow/tray*/shortcut*/power*/ipc* |
| 10 | `log` | 日志服务 | write/query/export |
| 11 | `credential` | 凭证管理服务 | get/set/delete/rotate |
| 12 | `card` | 卡片文件服务 | parse/render/validate |
| 13 | `box` | 箱子引用容器服务 | pack/unpack/inspect/validate/readMetadata/openView/listEntries/readEntryDetail/resolveEntryResource/readBoxAsset/prefetchEntries/closeView |
| 14 | `zip` | ZIP压缩服务 | compress/extract/list |
| 15 | `serializer` | 序列化服务 | encode/decode/validate |
| 16 | `control-plane` | 控制平面服务 | health/check/metrics/diagnose |

---

## 统一约束

### 动作命名规范

- 动作名采用 `namespace.action` 格式
- 例如：`file.read`、`theme.apply`、`i18n.setCurrent`

### 幂等性标注

- 幂等动作必须标注 `idempotent=true`
- 幂等动作可安全重试

### 防重放策略

- 非幂等动作必须定义防重放策略
- 使用 `requestId` 去重窗口

### 统一错误对象

```typescript
interface StandardError {
  code: string;           // 错误码
  message: string;       // 错误消息
  details?: unknown;     // 错误详情
  retryable?: boolean;   // 是否可重试
}
```

---

## 服务详情

### 1. file 服务

| 项目 | 内容 |
|------|------|
| 服务名 | `file` |
| 核心动作 | read/write/stat/list |
| 输入基线 | path + options |
| 输出基线 | content/meta |
| 幂等性 | read/stat/list 幂等 |
| 权限边界 | `file.read` / `file.write` |
| 典型错误 | `FILE_NOT_FOUND`, `FILE_PERMISSION_DENIED` |

```typescript
// file 服务接口
interface FileService {
  read(path: string, options?: FileReadOptions): Promise<FileContent>;
  write(path: string, content: FileContent, options?: FileWriteOptions): Promise<void>;
  stat(path: string): Promise<FileStat>;
  list(dir: string, options?: FileListOptions): Promise<FileEntry[]>;
}
```

### 2. resource 服务

| 项目 | 内容 |
|------|------|
| 服务名 | `resource` |
| 核心动作 | resolve/open/readMetadata/readBinary |
| 输入基线 | resourceId |
| 输出基线 | uri/meta/blob |
| 幂等性 | resolve/read* 幂等，open 非幂等 |
| 权限边界 | `resource.read` |
| 典型错误 | `RESOURCE_NOT_FOUND`, `RESOURCE_HANDLER_MISSING` |

补充说明：

- `resource.open` 是跨应用资源打开的正式入口；
- Host 必须负责资源处理器发现、能力匹配、启动参数注入和本地/外链回退；
- 应用插件之间不得私下约定直连启动其他应用，必须统一复用该服务。

### 3. config 服务

| 项目 | 内容 |
|------|------|
| 服务名 | `config` |
| 核心动作 | get/set/batchSet/reset |
| 输入基线 | key/value |
| 输出基线 | ack/snapshot |
| 幂等性 | get 幂等 |
| 权限边界 | `config.read` / `config.write` |
| 典型错误 | `CONFIG_KEY_INVALID` |

### 4. theme 服务

| 项目 | 内容 |
|------|------|
| 服务名 | `theme` |
| 核心动作 | list/apply/getCurrent/getAllCss/resolve/contract.get |
| 输入基线 | themeId/chain |
| 输出基线 | themeState/css |
| 幂等性 | list/get*/resolve 幂等 |
| 权限边界 | `theme.read` / `theme.write` |
| 典型错误 | `THEME_NOT_FOUND`, `THEME_CONTRACT_INVALID` |

**公开接口（固定6个）**：
```typescript
interface ThemeService {
  list(publisher?: string): Promise<ThemeMeta[]>;
  apply(id: string): Promise<void>;
  getCurrent(appId?: string, pluginId?: string): Promise<ThemeState>;
  getAllCss(): Promise<{ css: string; themeId: string }>;
  resolve(chain: string[]): Promise<ResolvedTokens>;
  contract.get(component?: string): Promise<ThemeContract>;
}
```

**运行时补充（2026-03-10）**：

- `theme.list/getCurrent/getAllCss/resolve/apply` 只面向当前工作区中“已启用”的主题插件，不再把“仅安装未启用”的主题视为可用主题；
- 主题插件发生 `install/enable/disable/uninstall` 后，Host 必须同步刷新 `state.themes` 与当前主题状态；
- `theme.apply` 成功后发布 `theme.changed` 事件，供 preload、应用壳层和复合卡片窗口统一刷新；
- `getAllCss` 返回值同时携带 `css` 与 `themeId`，供调用方建立显式主题快照。

### 5. i18n 服务

| 项目 | 内容 |
|------|------|
| 服务名 | `i18n` |
| 核心动作 | getCurrent/setCurrent/translate/listLocales |
| 输入基线 | locale/key |
| 输出基线 | locale/text |
| 幂等性 | get*/translate 幂等 |
| 权限边界 | `i18n.read` / `i18n.write` |
| 典型错误 | `I18N_KEY_MISSING` |

### 6. window 服务

| 项目 | 内容 |
|------|------|
| 服务名 | `window` |
| 核心动作 | open/focus/resize/setState |
| 输入基线 | windowConfig |
| 输出基线 | windowState |
| 幂等性 | focus 幂等 |
| 权限边界 | `window.control` |
| 典型错误 | `WINDOW_NOT_FOUND` |

**窗口主题补充（2026-03-10）**：

- 当调用方未显式传入 `chrome.backgroundColor`，且窗口不是透明窗口时，Host 应从当前主题解析结果中优先读取 `chips.sys.color.canvas`，其次读取 `chips.sys.color.surface` 作为原生窗口背景；
- 应用不能再通过硬编码白色背景覆盖主题系统。

### 7. plugin 服务

| 项目 | 内容 |
|------|------|
| 服务名 | `plugin` |
| 核心动作 | list/get/getSelf/getCardPlugin/getLayoutPlugin/install/enable/disable/uninstall/query |
| 输入基线 | pluginManifest |
| 输出基线 | pluginInfo / pluginRecord / status |
| 幂等性 | list/get/getSelf/getCardPlugin/getLayoutPlugin/query 幂等 |
| 权限边界 | `plugin.read` / `plugin.manage` |
| 典型错误 | `PLUGIN_INVALID`, `PLUGIN_PERMISSION_DENIED`, `PLUGIN_CONTEXT_MISSING` |

### 8. module 服务

| 项目 | 内容 |
|------|------|
| 服务名 | `module` |
| 核心动作 | listProviders/resolve/invoke/job.get/job.cancel |
| 输入基线 | capability + method + input + provider 选择信息 |
| 输出基线 | providerInfo / syncResult / jobSnapshot |
| 幂等性 | listProviders/resolve/job.get 幂等 |
| 权限边界 | `module.read` / `module.invoke` |
| 典型错误 | `MODULE_PROVIDER_NOT_FOUND`, `MODULE_METHOD_NOT_FOUND`, `MODULE_SCHEMA_INVALID` |

补充说明：

- 模块插件正式定位为 Host 托管的无界面能力模块；
- Host 必须维护模块 provider 注册表；
- `module.resolve` 负责 capability 的默认 provider 解析；
- `module.invoke` 负责同步结果或异步 job 的统一调度；
- 对于异步方法，Host 必须提供 `module.job.get` 与 `module.job.cancel`；
- 模块之间相互调用时，仍然必须继续复用 Host 模块服务；
- 旧页面插槽式模块协议不再作为未来正式外部契约保留。

### 9. platform 服务

| 项目 | 内容 |
|------|------|
| 服务名 | `platform` |
| 核心动作 | getInfo/getCapabilities/openExternal/dialog*/clipboard*/shell*/notificationShow/tray*/shortcut*/power*/ipc* |
| 输入基线 | none/url |
| 输出基线 | info/ack |
| 幂等性 | get* 幂等 |
| 权限边界 | `platform.read` / `platform.external` |
| 典型错误 | `PLATFORM_UNSUPPORTED` |

> 说明：Bridge 子域 `dialog/clipboard/shell` 在服务层统一映射为 `platform.*` 动作，不单独扩展新的服务域命名空间。

### 10. log 服务

| 项目 | 内容 |
|------|------|
| 服务名 | `log` |
| 核心动作 | write/query/export |
| 输入基线 | record/filter |
| 输出基线 | ack/bundle |
| 幂等性 | list/get/getSelf/getCardPlugin/getLayoutPlugin/query 幂等 |
| 权限边界 | `log.write` / `log.read` |
| 典型错误 | `LOG_EXPORT_FAILED` |

### 11. credential 服务

| 项目 | 内容 |
|------|------|
| 服务名 | `credential` |
| 核心动作 | get/set/delete/rotate |
| 输入基线 | secretRef |
| 输出基线 | secret/meta |
| 幂等性 | get 幂等 |
| 权限边界 | `credential.manage` |
| 典型错误 | `CREDENTIAL_DENIED`, `CREDENTIAL_EXPIRED` |

### 12. card 服务

| 项目 | 内容 |
|------|------|
| 服务名 | `card` |
| 核心动作 | parse/render/validate |
| 输入基线 | cardDoc |
| 输出基线 | ast/view/model |
| 幂等性 | parse/validate 幂等 |
| 权限边界 | `card.read` / `card.write` |
| 典型错误 | `CARD_SCHEMA_INVALID` |

**卡片渲染补充（2026-03-10）**：

- `card.render` 生成复合卡片和基础卡片文档时，必须同时注入主题包 CSS 与解析后的变量；
- 渲染服务不得追加固定 `color-scheme: light` 或其他会覆盖主题包色彩模式声明的样式；
- 复合卡片主题变更后的刷新由上层窗口组件基于主题运行时缓存键触发，`card` 服务负责输出纯净、可重建的主题化文档。

### 13. box 服务

| 项目 | 内容 |
|------|------|
| 服务名 | `box` |
| 核心动作 | `pack/unpack/inspect/validate/readMetadata/openView/listEntries/readEntryDetail/resolveEntryResource/readBoxAsset/prefetchEntries/closeView` |
| 输入基线 | `boxFile / boxDir / sessionId + query/request` |
| 输出基线 | `artifact / metadata / session / page / detail / resourceHandle / ack` |
| 幂等性 | `inspect/validate/readMetadata/listEntries/readEntryDetail/resolveEntryResource/readBoxAsset/closeView` 幂等 |
| 权限边界 | `box.read` / `box.write` |
| 典型错误 | `BOX_FORMAT_INVALID`, `BOX_OPEN_FAILED`, `BOX_VIEW_SESSION_NOT_FOUND`, `BOX_RESOURCE_NOT_FOUND`, `BOX_ASSET_NOT_FOUND` |

正式设计说明：

- `box` 服务处理的是“URL 引用容器”，不是“卡片实体打包容器”；
- `pack/unpack` 面向编辑工作目录与最终 `.box` 文件之间的转换；
- `inspect/validate/readMetadata` 面向静态检查、工具链与治理场景；
- `openView` 负责创建箱子查看会话，并返回首批摘要态条目与布局上下文；
- `listEntries/readEntryDetail/resolveEntryResource/readBoxAsset/prefetchEntries/closeView` 全部属于会话化运行时动作；
- `resolveEntryResource` 只返回 Host 统一资源句柄，不直接暴露底层文件绝对路径或凭证。

依赖关系：

- `file`：解包工作目录与导出路径读写
- `card`：卡片元数据、封面与运行时入口解析
- `resource`：统一资源句柄、缓存与传输
- `credential`：网络 URL 的凭证解析
- `plugin`：根据 `layoutType` 解析布局插件

运行时约束：

- Host 打开箱子时默认只读取元数据、条目摘要与布局配置；
- 不允许因为 `openView` 就强制解析所有条目；
- 布局插件只能通过 `box` 服务会话动作动态申请更多数据；
- 箱子自有资源与卡片资源必须分层处理。

### 14. zip 服务

| 项目 | 内容 |
|------|------|
| 服务名 | `zip` |
| 核心动作 | compress/extract/list |
| 输入基线 | files |
| 输出基线 | zip/meta |
| 幂等性 | list 幂等 |
| 权限边界 | `zip.manage` |
| 典型错误 | `ZIP_CORRUPTED` |

### 15. serializer 服务

| 项目 | 内容 |
|------|------|
| 服务名 | `serializer` |
| 核心动作 | encode/decode/validate |
| 输入基线 | payload + schema |
| 输出基线 | bytes/object |
| 幂等性 | decode/validate 幂等 |
| 权限边界 | `serializer.use` |
| 典型错误 | `SERIALIZE_FAILED` |

### 16. control-plane 服务

| 项目 | 内容 |
|------|------|
| 服务名 | `control-plane` |
| 核心动作 | health/check/metrics/diagnose |
| 输入基线 | scope |
| 输出基线 | report |
| 幂等性 | 幂等 |
| 权限边界 | `control.read` / `control.write` |
| 典型错误 | `CONTROL_TIMEOUT` |

---

## 服务实现模板

### 目录结构
```
services/
├── file/
│   ├── types.ts        # 输入输出类型
│   ├── constants.ts    # 动作名/错误码
│   ├── service.ts      # 注册与实现
│   └── *.test.ts       # 单元测试
└── ...
```

### types.ts 示例
```typescript
// 输入类型
interface FileReadRequest {
  path: string;
  encoding?: 'utf-8' | 'binary';
  options?: FileReadOptions;
}

// 输出类型
interface FileReadResponse {
  content: string | Buffer;
  meta: FileStat;
}

// 动作定义
interface FileActions {
  read: {
    request: FileReadRequest;
    response: FileReadResponse;
  };
  write: {
    request: FileWriteRequest;
    response: FileWriteResponse;
  };
}
```

### constants.ts 示例
```typescript
// 服务名
export const SERVICE_NAME = 'file';

// 动作名
export const ACTIONS = {
  READ: 'file.read',
  WRITE: 'file.write',
  STAT: 'file.stat',
  LIST: 'file.list',
} as const;

// 错误码
export const ERRORS = {
  NOT_FOUND: 'FILE_NOT_FOUND',
  PERMISSION_DENIED: 'FILE_PERMISSION_DENIED',
  INVALID_PATH: 'FILE_INVALID_PATH',
} as const;
```

### service.ts 示例
```typescript
import { Kernel } from '@chips/kernel';
import { SERVICE_NAME, ACTIONS, ERRORS } from './constants';
import type { FileReadRequest, FileReadResponse } from './types';

export function register(kernel: Kernel) {
  kernel.registerService({
    name: SERVICE_NAME,
    actions: {
      [ACTIONS.READ]: {
        schemaIn: 'schemas/file.read.request.json',
        schemaOut: 'schemas/file.read.response.json',
        permission: ['file.read'],
        timeoutMs: 5000,
        idempotent: true,
        retries: 0,
        handler: async (input: FileReadRequest, ctx): Promise<FileReadResponse> => {
          // 实现逻辑
        },
      },
    },
  });
}
```

---

## 验收标准

### 服务域验收
- 16个服务域完整实现
- 每个服务动作面符合清单规范

### 契约验收
- 每个服务导出 types.ts/constants.ts/service.ts
- 每动作存在同名契约测试 `<action>.contract.test.ts`
- 输入输出符合JSON Schema

### 权限验收
- 权限边界清晰
- 最小权限原则遵循

### 幂等性验收
- 幂等动作正确标注
- 防重放策略定义
