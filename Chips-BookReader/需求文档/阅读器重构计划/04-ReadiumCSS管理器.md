# 阶段 04 — ReadiumCSS 管理器

## 目标

将 ReadiumCSS 的加载、注入、CSS 变量设置等样式管理逻辑从 `runtime.ts` 中独立出来，形成纯粹的样式管理模块。

## 背景

当前 `runtime.ts`（1301 行）中约 40% 的代码都在处理 ReadiumCSS 相关的样式管理：
- ReadiumCSS 样式表加载和缓存（`loadReadiumStyleText`）
- 字体资源 URL 重写（`FONT_ASSET_URLS`）
- CSS 变量注入（`applyReadiumCssSettings`）
- profile 选择（`resolveReadiumProfile`）
- 补充样式生成（`createSupplementalCss`）
- 补丁样式注入（`READIUM_PATCH_CSS`）

这些逻辑与分页/滚动引擎无关，应该独立为一个纯粹的样式管理器。

## 涉及文件

### 新建

- `src/engine/readium-css-manager.ts`

### 参考（提取源）

- `src/domain/readium/runtime.ts` — 以下函数/常量将被提取：
  - `STYLE_ASSET_URLS`
  - `FONT_ASSET_URLS`
  - `CSS_TEXT_CACHE`
  - `READIUM_PATCH_CSS`
  - `loadReadiumStyleText()`
  - `resolveReadiumProfile()`
  - `buildReadiumCssSettings()`
  - `applyReadiumCssSettings()`
  - `createSupplementalCss()`
  - `ensureStyleElement()`
  - `removeStyleElement()`
  - `setOrRemoveStyle()`
  - `setOrRemoveStyleImportant()`
  - `isDocJapanese()`
  - `isDocCjk()`
  - `isDocRtl()`
  - `computeVerticalRtl()`
  - `hasPublisherStyles()`
  - `ensureHead()`
  - 各种常量（CLASS_PAGINATED, CLASS_VWM, 样式 ID 等）

### 保留（不修改）

- `src/domain/readium/assets/ReadiumCSS/` — CSS 资源文件

## 具体实现

### 公共 API

```typescript
export class ReadiumCssManager {
  // ─── 注入 ReadiumCSS 到 iframe 文档 ───
  async injectStyles(document: Document): Promise<void>;
  
  // ─── 应用阅读偏好和主题 ───
  applySettings(
    document: Document,
    options: EngineOptions,
    layout: ResponsiveLayout,
  ): void;
  
  // ─── 检测文档方向性 ───
  resolveDirectionality(document: Document): DocumentDirectionality;
  
  // ─── 获取当前 ReadiumCSS profile ───
  resolveProfile(document: Document): ReadiumProfile;
}
```

### 内部组织

```
ReadiumCssManager
├── 样式加载与缓存
│   ├── loadStyleText(profile, mod) → string
│   └── rewriteFontUrls(cssText) → string
│
├── 样式注入
│   ├── injectBeforeStyles(document, profile)
│   ├── injectDefaultStyles(document, profile)  // 仅无出版方样式时
│   ├── injectAfterStyles(document, profile)
│   ├── injectPatchStyles(document)
│   └── injectSupplementalStyles(document, options, layout)
│
├── CSS 变量设置
│   ├── applyReadiumCssVariables(root, settings)
│   ├── applyLayoutVariables(root, layout)
│   └── applyThemeVariables(root, theme)
│
├── 文档检测
│   ├── resolveDirectionality(document)
│   ├── resolveProfile(document)
│   └── hasPublisherStyles(document)
│
└── DOM 工具
    ├── ensureStyleElement(document, id, css, options)
    ├── removeStyleElement(document, id)
    ├── setOrRemoveStyle(element, property, value)
    └── setOrRemoveStyleImportant(element, property, value)
```

### 与旧实现的区别

1. **纯粹的样式管理**：不包含任何分页/滚动/翻页逻辑。
2. **明确的输入输出**：接收 `EngineOptions` 和 `ResponsiveLayout`，输出 CSS 变量设置。
3. **可独立测试**：不依赖 `ReadiumDocumentController` 的生命周期。

## 验收标准

1. 所有 ReadiumCSS 样式加载和注入功能正常工作。
2. CSS 变量设置与旧实现完全等价。
3. profile 检测（default / rtl / cjk-horizontal / cjk-vertical）准确。
4. 字体 URL 重写正确。
5. 出版方样式与 ReadiumCSS 的层叠关系正确。
6. 补充样式中的 Vellum 兼容修复保留。
7. `npm run build` 编译通过。

## 预计改动量

- 新增 1 个文件，约 500–600 行（从 runtime.ts 提取并重组织）。
