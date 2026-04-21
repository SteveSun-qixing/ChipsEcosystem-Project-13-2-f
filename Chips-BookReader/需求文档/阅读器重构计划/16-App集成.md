# 阶段 16 — App.tsx 集成

## 目标

更新根组件 `App.tsx`，适配新的引擎层、交互层和组件层架构。

## 背景

当前 `App.tsx`（555 行）承担了以下职责：
1. 主题和语言状态管理。
2. 电子书加载（`readBookBytes`, `openBookTarget`）。
3. 章节渲染调度（`renderSectionDocument`）。
4. 阅读偏好管理。
5. 反馈消息管理。
6. Bridge 事件监听（主题变化、语言变化）。
7. 启动参数恢复（`launchParams`）。

重构后，引擎管理和交互管理通过 Hooks 处理，App.tsx 可以精简。

## 涉及文件

### 修改

- `src/App.tsx` — 适配新架构

### 依赖

- `src/hooks/useReaderEngine.ts`
- `src/hooks/useReaderInteraction.ts`
- `src/hooks/useReaderProgress.ts`
- `src/hooks/useBookmarks.ts`
- `src/components/ReaderShell.tsx`（新版）

## 具体变化

### 移除内容

1. 移除 `ReadiumDocumentController` 的 import 和使用。
2. 移除 `ReadiumBoundary` / `ReadiumDirection` 类型的直接使用。
3. 移除章节 iframe 管理逻辑（转移到 `useReaderEngine`）。

### 保留内容

1. 主题和语言状态管理（依赖 Bridge 事件）。
2. 电子书加载逻辑。
3. 章节渲染调度。
4. 阅读偏好管理。
5. 反馈消息管理。
6. 启动参数恢复。

### 新增内容

1. 使用 `useReaderProgress` 获取进度信息。
2. 使用 `useBookmarks` 管理书签。
3. 传递新的 props 给 `ReaderShell`（进度、书签等）。

### 新的 ReaderShell props

```typescript
interface ReaderShellProps {
  // ─── 现有（保留） ───
  book: EpubBook | null;
  renderedSection: RenderedSectionDocument | null;
  currentSectionIndex: number;
  currentFragment?: string;
  feedback: ReaderFeedback | null;
  isResolving: boolean;
  isLoadingSection: boolean;
  preferences: ReaderPreferences;
  themePalette: EpubThemePalette;
  onOpenFile: () => void | Promise<void>;
  onOpenUrl: (value: string) => void | Promise<void>;
  onSelectSection: (sectionIndex: number, fragment?: string) => void;
  onStepSection: (delta: number) => void;
  onUpdatePreferences: (next: ReaderPreferences) => void;
  onDropFiles: (files: File[]) => void | Promise<void>;
  onOpenExternalLink: (url: string) => void | Promise<void>;
  t: TranslateFunction;
  
  // ─── 新增 ───
  progress: ReadingProgress | null;
  bookmarks: Bookmark[];
  onAddBookmark: (bookmark: Omit<Bookmark, "id" | "createdAt">) => void;
  onRemoveBookmark: (id: string) => void;
  onGoToBookmark: (bookmark: Bookmark) => void;
  onSearch: (query: string) => void;
  searchResults: SearchResult[];
  onSelectSearchResult: (result: SearchResult) => void;
}
```

## 验收标准

1. 所有现有功能正常工作：
   - 本地文件打开
   - 远程链接打开
   - 拖拽打开
   - 启动参数恢复
   - 章节切换
   - 目录导航
   - 阅读偏好
   - 主题和语言切换
2. 新功能正常工作：
   - 阅读进度显示
   - 书签增删和跳转
   - 搜索
3. `App.tsx` 行数不超过 500 行。
4. `npm run build` 编译通过。

## 预计改动量

- 修改 1 个文件（App.tsx），净减少约 50–100 行。
