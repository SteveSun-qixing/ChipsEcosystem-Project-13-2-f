# Bridge三层设计

> **版本**：vNext 架构设计冻结稿  
> **层级**：L5 Bridge Transport、L6 Runtime Client、L7 UI Hooks  
> **适用阶段**：阶段18及后续重构实施阶段

## Bridge架构概述

Bridge三层是插件与系统能力交互的完整通道，从底层到顶层分为：
- **L5 Bridge Transport**：桥接传输层，负责IPC传输
- **L6 Runtime Client**：运行时客户端，负责协议编解码、错误归一
- **L7 UI Hooks**：UI钩子层，面向页面的能力调用接口

## 架构归属声明（2026-03-06）

- L5-L7 运行时链路由 Host 内置实现并随 Host 发布。
- L8/L9 前端渲染层同属 Host 运行时，不属于 SDK 运行时实现范围。
- SDK 仅作为开发者工具包提供类型化封装与调用入口，不承载 Runtime Client 主实现。

**设计目标**：
- 应用层不感知IPC/route细节
- 统一错误归一
- 支持重试与回退
- 动作名历史差异吸收

## 层级定位

| 层级 | 名称 | 核心职责 | 只允许依赖 | 禁止依赖 |
|---|---|---|---|---|
| L4 | Plugin Runtime | 插件加载、隔离、会话、权限 | Kernel+Services | 业务域实现细节 |
| **L5** | **Bridge Transport** | **`window.chips.*` IPC 传输** | **Runtime** | **页面业务状态** |
| **L6** | **Runtime Client** | **协议编解码、错误归一、重试** | **Bridge Transport** | **组件渲染实现** |
| **L7** | **UI Hooks** | **面向页面的能力调用接口** | **Runtime Client** | **Transport 细节** |
| L8 | Declarative UI | `View/Stack/Grid/Form/List` 语义原语 | UI Hooks + Component Layer | Host 服务细节 |

---

## L5 Bridge Transport（桥接传输层）

### 概述

Bridge Transport通过Electron的contextBridge机制暴露标准API，是插件访问底层能力的唯一通道。

### 对外入口接口

```typescript
interface ChipsBridge {
  // ==================== 核心调用 ====================
  
  /**
   * 异步调用系统能力
   * @param action - 动作名称，格式：namespace.action
   * @param payload - 请求载荷
   * @returns Promise<T> - 响应数据
   */
  invoke<T = unknown>(action: string, payload?: unknown): Promise<T>;
  
  // ==================== 事件订阅 ====================
  
  /**
   * 订阅事件
   * @param event - 事件名称
   * @param handler - 事件处理函数
   * @returns 取消订阅函数
   */
  on(event: string, handler: (data: unknown) => void): () => void;
  
  /**
   * 订阅一次性事件
   * @param event - 事件名称
   * @param handler - 事件处理函数
   */
  once(event: string, handler: (data: unknown) => void): void;
  
  // ==================== 事件发布 ====================
  
  /**
   * 发布事件
   * @param event - 事件名称
   * @param data - 事件数据
   */
  emit(event: string, data?: unknown): void;
  
  // ==================== 子域API ====================
  
  /**
   * 窗口管理
   */
  window: WindowBridge;
  
  /**
   * 对话框
   */
  dialog: DialogBridge;
  
  /**
   * 插件管理
   */
  plugin: PluginBridge;
  
  /**
   * 剪贴板
   */
  clipboard: ClipboardBridge;
  
  /**
   * Shell操作
   */
  shell: ShellBridge;
}
```

### 子域API定义

#### WindowBridge
```typescript
interface WindowBridge {
  open(config: WindowOpenConfig): Promise<WindowHandle>;
  focus(windowId: WindowHandle): Promise<void>;
  resize(windowId: WindowHandle, width: number, height: number): Promise<void>;
  setState(windowId: WindowHandle, state: WindowState): Promise<void>;
  getState(windowId: WindowHandle): Promise<WindowState>;
  close(windowId: WindowHandle): Promise<void>;
}
```

#### DialogBridge
```typescript
interface DialogBridge {
  openFile(options?: OpenFileOptions): Promise<string[] | null>;
  saveFile(options?: SaveFileOptions): Promise<string | null>;
  showMessage(options: MessageOptions): Promise<number>;
  showConfirm(options: MessageOptions): Promise<boolean>;
}
```

#### PluginBridge
```typescript
interface PluginBridge {
  install(manifestPath: string): Promise<PluginId>;
  enable(pluginId: PluginId): Promise<void>;
  disable(pluginId: PluginId): Promise<void>;
  uninstall(pluginId: PluginId): Promise<void>;
  query(filter?: PluginFilter): Promise<Plugin[]>;
  getInfo(pluginId: PluginId): Promise<PluginInfo>;
}
```

#### ClipboardBridge
```typescript
interface ClipboardBridge {
  read(format?: ClipboardFormat): Promise<ClipboardData>;
  write(data: ClipboardData, format?: ClipboardFormat): Promise<void>;
}
```

#### ShellBridge
```typescript
interface ShellBridge {
  openPath(path: string): Promise<void>;
  openExternal(url: string): Promise<void>;
  showItemInFolder(path: string): Promise<void>;
}
```

### IPC通道设计

| 通道类型 | 通道名称 | 用途 |
|----------|----------|------|
| 主通道 | `chips:invoke` | 核心能力调用 |
| 窗口通道 | `chips:window:*` | 窗口管理 |
| 对话框通道 | `chips:dialog:*` | 系统对话框 |
| 插件通道 | `chips:plugin:*` | 插件管理 |
| 剪贴板通道 | `chips:clipboard:*` | 剪贴板操作 |
| Shell通道 | `chips:shell:*` | Shell操作 |

### 事件命名规范

**强制采用点语义**：
- ✅ `theme.changed`
- ✅ `language.changed`
- ✅ `plugin.enabled`
- ✅ `window.focused`

**禁止混用**：
- ❌ `theme:changed`
- ❌ `language-changed`

### 安全约束

- 插件只能通过`window.chips.*`访问系统能力
- 禁止直接访问Node.js API
- 禁止直接读写文件系统
- 禁止直接发起网络请求

---

## L6 Runtime Client（运行时客户端）

### 概述

Runtime Client负责协议编解码、错误归一、超时控制、重试与回退。

**核心目标**：应用层不感知IPC/route细节。

### 核心职责

#### 1. 参数规范化
```typescript
// 将页面调用转换为标准协议格式
interface RequestPayload {
  action: string;
  namespace: string;
  payload: unknown;
  requestId: string;
  timestamp: number;
  source: {
    type: 'app' | 'card' | 'layout' | 'module' | 'theme';
    pluginId?: string;
  };
}
```

#### 2. 协议映射
历史动作名差异吸收：
```typescript
// 动作名映射表（兼容旧口径）
const ACTION_ALIASES: Record<string, string> = {
  'theme.getCSS': 'theme.getAllCss',
  'theme.setCurrent': 'theme.apply',
  'i18n.getCurrentLanguage': 'i18n.getCurrent',
  'i18n.setLanguage': 'i18n.setCurrent',
};
```

#### 3. 错误归一
底层错误映射到标准错误码：
```typescript
// 错误归一映射
const ERROR_MAPPING: Record<string, StandardError> = {
  // Bridge层错误
  'BRIDGE_TIMEOUT': {
    code: 'BRIDGE_TIMEOUT',
    message: 'Bridge调用超时',
    retryable: true,
  },
  'BRIDGE_DISCONNECTED': {
    code: 'BRIDGE_DISCONNECTED',
    message: 'Bridge连接断开',
    retryable: true,
  },
  
  // 服务层错误
  'SERVICE_NOT_FOUND': {
    code: 'SERVICE_NOT_FOUND',
    message: '服务不存在',
    retryable: false,
  },
  'SERVICE_UNAVAILABLE': {
    code: 'SERVICE_UNAVAILABLE',
    message: '服务不可用',
    retryable: true,
  },
  
  // 运行时错误
  'RUNTIME_TIMEOUT': {
    code: 'RUNTIME_TIMEOUT',
    message: '操作超时',
    retryable: true,
  },
  'RUNTIME_RETRY_EXHAUSTED': {
    code: 'RUNTIME_RETRY_EXHAUSTED',
    message: '重试次数耗尽',
    retryable: false,
  },
};

// 统一错误对象
interface StandardError {
  code: string;
  message: string;
  details?: unknown;
  retryable?: boolean;
}
```

#### 4. 超时控制
```typescript
interface ClientOptions {
  defaultTimeout: number;        // 默认超时时间（毫秒）
  enableRetry: boolean;          // 是否启用重试
  maxRetries: number;           // 最大重试次数
  retryDelay: number;           // 初始重试延迟（毫秒）
  retryBackoff: number;         // 退避系数
}

const DEFAULT_OPTIONS: ClientOptions = {
  defaultTimeout: 30000,
  enableRetry: true,
  maxRetries: 3,
  retryDelay: 200,
  retryBackoff: 2,
};
```

#### 5. 重试策略
```typescript
// 指数退避重试
async function withRetry<T>(
  fn: () => Promise<T>,
  options: ClientOptions
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // 只有retryable=true才重试
      if (!isRetryable(error) || attempt >= options.maxRetries) {
        throw error;
      }
      
      // 指数退避
      const delay = options.retryDelay * Math.pow(options.retryBackoff, attempt);
      await sleep(delay);
    }
  }
  
  throw lastError!;
}
```

### Runtime Client API
```typescript
class RuntimeClient {
  constructor(bridge: ChipsBridge, options?: Partial<ClientOptions>);
  
  // 调用系统能力
  invoke<T = unknown>(action: string, payload?: unknown): Promise<T>;
  
  // 调用并指定超时
  invokeWithTimeout<T>(action: string, payload: unknown, timeoutMs: number): Promise<T>;
  
  // 批量调用
  invokeBatch<T>(requests: InvokeRequest[]): Promise<InvokeResponse<T>[]>;
  
  // 事件订阅
  on(event: string, handler: EventHandler): Unsubscribe;
  once(event: string, handler: EventHandler): void;
  
  // 取消订阅
  off(event: string, handler?: EventHandler): void;
}
```

---

## L7 UI Hooks（UI钩子层）

### 概述

UI Hooks是面向页面的能力调用接口，提供声明式的系统能力调用方式。

**约束**：
- Hook仅允许调用Runtime Client，不可直连Transport
- Hook返回的是客户端代理对象，实际调用通过Bridge传输

### 标准Hooks定义

#### 主题 Hooks
```typescript
// 主题客户端
interface ThemeClient {
  list(publisher?: string): Promise<ThemeMeta[]>;
  apply(id: string): Promise<void>;
  getCurrent(appId?: string, pluginId?: string): Promise<ThemeState>;
  getAllCss(): Promise<{ css: string; themeId: string }>;
  resolve(chain: string[]): Promise<ResolvedTokens>;
  contract.get(component?: string): Promise<ThemeContract>;
}

// Hooks
function useTheme(): ThemeClient;
function useCurrentTheme(): ThemeState;
function useApplyTheme(): (themeId: string) => Promise<void>;
```

#### 国际化 Hooks
```typescript
// 国际化客户端
interface I18nClient {
  getCurrent(): Promise<string>;
  setCurrent(locale: string): Promise<void>;
  translate(key: string, params?: Record<string, unknown>): Promise<string>;
  listLocales(): Promise<LocaleInfo[]>;
}

// Hooks
function useI18n(): I18nClient;
function useTranslation(key: string, params?: Record<string, unknown>): string;
function useCurrentLocale(): string;
function useSetLocale(): (locale: string) => Promise<void>;
```

#### 文件 Hooks
```typescript
// 文件客户端
interface FileClient {
  read(path: string, options?: FileReadOptions): Promise<FileContent>;
  write(path: string, content: FileContent, options?: FileWriteOptions): Promise<void>;
  stat(path: string): Promise<FileStat>;
  list(dir: string, options?: FileListOptions): Promise<FileEntry[]>;
  exists(path: string): Promise<boolean>;
  remove(path: string): Promise<void>;
  copy(src: string, dest: string): Promise<void>;
  move(src: string, dest: string): Promise<void>;
}

// Hooks
function useFile(): FileClient;
function useReadFile(path: string, options?: FileReadOptions): FileContent | null;
function useWriteFile(path: string, content: FileContent, options?: FileWriteOptions): Promise<void>;
```

#### 窗口 Hooks
```typescript
// 窗口客户端
interface WindowClient {
  open(config: WindowOpenConfig): Promise<WindowId>;
  focus(windowId: WindowId): Promise<void>;
  resize(windowId: WindowId, width: number, height: number): Promise<void>;
  setState(windowId: WindowId, state: Partial<WindowState>): Promise<void>;
  getState(windowId: WindowId): Promise<WindowState>;
  close(windowId: WindowId): Promise<void>;
  getCurrent(): Promise<WindowId>;
}

// Hooks
function useWindow(): WindowClient;
function useOpenWindow(config: WindowOpenConfig): Promise<WindowId>;
function useCurrentWindow(): WindowId;
function useWindowState(windowId: WindowId): WindowState;
```

#### 插件 Hooks
```typescript
// 插件客户端
interface PluginClient {
  install(manifestPath: string): Promise<PluginId>;
  enable(pluginId: PluginId): Promise<void>;
  disable(pluginId: PluginId): Promise<void>;
  uninstall(pluginId: PluginId): Promise<void>;
  query(filter?: PluginFilter): Promise<Plugin[]>;
  getInfo(pluginId: PluginId): Promise<PluginInfo>;
  getInstalled(): Promise<Plugin[]>;
}

// Hooks
function usePlugin(): PluginClient;
function useQueryPlugin(filter?: PluginFilter): Plugin[];
function useInstalledPlugins(): Plugin[];
function useEnablePlugin(): (pluginId: string) => Promise<void>;
function useDisablePlugin(): (pluginId: string) => Promise<void>;
```

#### 配置 Hooks
```typescript
// 配置客户端
interface ConfigClient {
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T): Promise<void>;
  batchSet(entries: Record<string, unknown>): Promise<void>;
  reset(key?: string): Promise<void>;
  getAll(): Promise<Record<string, unknown>>;
}

// Hooks
function useConfig(): ConfigClient;
function useGetConfig<T = unknown>(key: string): T | null;
function useSetConfig<T = unknown>(key: string, value: T): Promise<void>;
```

#### 日志 Hooks
```typescript
// 日志客户端
interface LogClient {
  write(level: LogLevel, message: string, metadata?: Record<string, unknown>): Promise<void>;
  query(filter: LogFilter): Promise<LogEntry[]>;
  export(filter: LogFilter): Promise<LogBundle>;
  getLevels(): Promise<LogLevel[]>;
}

// Hooks
function useLog(): LogClient;
```

### Hooks使用示例
```tsx
// 示例：使用主题Hook
function ThemeSwitcher() {
  const { list, apply, getCurrent } = useTheme();
  const currentTheme = useCurrentTheme();
  const [themes, setThemes] = useState<ThemeMeta[]>([]);
  
  useEffect(() => {
    list().then(setThemes);
  }, []);
  
  const handleChange = async (themeId: string) => {
    await apply(themeId);
  };
  
  return (
    <select value={currentTheme?.id} onChange={e => handleChange(e.target.value)}>
      {themes.map(theme => (
        <option key={theme.id} value={theme.id}>{theme.name}</option>
      ))}
    </select>
  );
}

// 示例：使用文件Hook
function FileViewer({ path }) {
  const { read } = useFile();
  const content = useReadFile(path);
  
  if (!content) return <div>Loading...</div>;
  
  return <pre>{content}</pre>;
}
```

---

## 依赖方向约束

```
L4 Plugin Runtime
    ↓ (提供 window.chips.*)
L5 Bridge Transport
    ↓ (封装IPC细节)
L6 Runtime Client
    ↓ (提供代理对象)
L7 UI Hooks
    ↓ (调用Hooks)
L8 Declarative UI
```

**禁止反向依赖**：
- L7不可直接依赖L5（Transport细节）
- L6不可直接依赖L4（Plugin Runtime实现）
- L5不可依赖页面业务状态

---

## 验收标准

### Bridge Transport验收
- `window.chips.invoke/on/once/emit`接口完整
- IPC主通道和子通道正确实现
- 事件命名采用点语义

### Runtime Client验收
- 参数规范化正确
- 错误归一到StandardError
- 指数退避重试正确实现
- 超时控制生效

### UI Hooks验收
- 所有Hooks只依赖Runtime Client
- Hooks返回代理对象而非直连Transport
- 主题/i18n/file/window/plugin/config等核心Hooks完整
