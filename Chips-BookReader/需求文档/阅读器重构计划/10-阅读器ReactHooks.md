# 阶段 10 — 阅读器 React Hooks

## 目标

创建 React Hooks 层，将引擎层和交互层桥接到 React 组件体系。

## 背景

重构后引擎层和交互层都是与 React 无关的纯逻辑模块。需要通过 Hooks 将它们的生命周期、状态变化和事件与 React 组件的渲染周期对接。

## 涉及文件

### 新建

- `src/hooks/useReaderEngine.ts` — 引擎 Hook
- `src/hooks/useReaderInteraction.ts` — 交互 Hook
- `src/hooks/useReaderProgress.ts` — 进度 Hook
- `src/hooks/useBookmarks.ts` — 书签 Hook

### 保留（不修改）

- `src/hooks/useChipsBridge.ts`
- `src/hooks/useChipsClient.ts`

## 具体实现

### useReaderEngine

管理 `DocumentController` 的生命周期。

```typescript
export interface UseReaderEngineParams {
  iframeRef: React.RefObject<HTMLIFrameElement>;
  renderedSection: RenderedSectionDocument | null;
  preferences: ReaderPreferences;
  themePalette: EpubThemePalette;
  currentFragment?: string;
  pendingBoundary: ReadingBoundary | null;
  onBoundaryReached: (direction: PageDirection) => void;
}

export interface UseReaderEngineReturn {
  controller: DocumentController | null;
  isFrameLoading: boolean;
  progress: ReadingProgress | null;
  navigatePage: (direction: PageDirection) => void;
  navigateToBoundary: (boundary: ReadingBoundary) => void;
}

export function useReaderEngine(params: UseReaderEngineParams): UseReaderEngineReturn;
```

核心逻辑：
1. 当 `renderedSection` 变化时，设置 iframe 的 `srcdoc`，监听 `load` 事件。
2. iframe 加载完成后，创建 `DocumentController` 并 `mount()`。
3. 处理 `pendingBoundary`（章节切换时跳到首/尾）和 `currentFragment`（锚点定位）。
4. 当 `preferences` 或 `themePalette` 变化时，调用 `controller.update()`。
5. 组件卸载时调用 `controller.destroy()`。
6. 监听引擎的 `boundary-reached` 事件触发越章。

### useReaderInteraction

管理交互系统的绑定和解绑。

```typescript
export interface UseReaderInteractionParams {
  book: EpubBook | null;
  controller: DocumentController | null;
  iframeRef: React.RefObject<HTMLIFrameElement>;
  activePanel: OverlayPanel;
  preferences: ReaderPreferences;
  sectionIndexByPath: Map<string, number>;
  onNavigate: (direction: PageDirection) => void;
  onNavigateBoundary: (boundary: ReadingBoundary) => void;
  onToggleChrome: () => void;
  onClosePanel: () => void;
  onSelectSection: (sectionIndex: number, fragment?: string) => void;
  onOpenExternalLink: (url: string) => void;
  onUpdatePreferences: (prefs: ReaderPreferences) => void;
}

export function useReaderInteraction(params: UseReaderInteractionParams): void;
```

核心逻辑：
1. 创建 `InteractionManager` 实例。
2. 当 iframe 文档加载完成时，`attachToFrame(frameDocument)`。
3. 在宿主窗口上 `attachToHost(window)`（处理宿主窗口的键盘事件）。
4. 将交互意图映射到组件回调。
5. 清理所有事件监听。

### useReaderProgress

计算和暴露阅读进度。

```typescript
export interface UseReaderProgressParams {
  book: EpubBook | null;
  currentSectionIndex: number;
  controller: DocumentController | null;
}

export interface UseReaderProgressReturn {
  progress: ReadingProgress | null;
}

export function useReaderProgress(params: UseReaderProgressParams): UseReaderProgressReturn;
```

核心逻辑：
1. 监听引擎的 `progress-updated` 事件。
2. 计算全书进度和章节内进度。
3. 节流更新（200ms 最多一次），避免频繁渲染。

### useBookmarks

管理书签状态。

```typescript
export interface Bookmark {
  id: string;
  sectionIndex: number;
  sectionTitle: string;
  spreadIndex: number;
  scrollFraction: number;
  createdAt: number;
  label?: string;
}

export interface UseBookmarksParams {
  bookSourceId: string | null;
}

export interface UseBookmarksReturn {
  bookmarks: Bookmark[];
  addBookmark: (bookmark: Omit<Bookmark, "id" | "createdAt">) => void;
  removeBookmark: (id: string) => void;
  hasBookmarkAtPosition: (sectionIndex: number, spreadIndex: number) => boolean;
}

export function useBookmarks(params: UseBookmarksParams): UseBookmarksReturn;
```

核心逻辑：
1. 书签存储在内存 Map 中（按 bookSourceId 隔离）。
2. 书签数据结构包含章节索引、spread 索引、进度比例等。
3. 提供增删查接口。
4. 注意：当前阶段不持久化书签（需要 Host 存储服务支持，如果 Host 无此能力则提工单）。

## 验收标准

1. `useReaderEngine` 正确管理 `DocumentController` 生命周期。
2. 章节切换时正确销毁旧控制器、创建新控制器。
3. 偏好和主题变化不触发章节重渲染。
4. `useReaderInteraction` 正确绑定/解绑所有事件。
5. `useReaderProgress` 实时反映阅读进度。
6. `useBookmarks` 增删查正常。
7. 无内存泄漏。
8. `npm run build` 编译通过。

## 预计改动量

- 新增 4 个文件，总计约 400–500 行。
