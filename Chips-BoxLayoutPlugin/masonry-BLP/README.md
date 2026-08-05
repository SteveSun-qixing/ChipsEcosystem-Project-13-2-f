# 瀑布流布局插件

通过 `chipsdev create layout` 初始化，并基于正式箱子布局插件契约实现的瀑布流布局。

## 工程定位

- 插件 ID：`chips.layout.masonry.blp`
- 布局类型：`chips.layout.masonry.blp`
- 显示名称：`瀑布流布局插件`
- 入口产物：`dist/index.mjs`

## 布局行为

- 查看态按条目封面比例和摘要高度估算视觉高度，使用最短列算法把条目分配到多列。
- 列宽模式支持 `compact`、`auto`、`wide`，不暴露固定列数输入。
- 条目间距支持紧凑、常规、舒展。
- 标题可显示在封面下方、覆盖在封面上或隐藏。
- 摘要可单独开启或关闭。
- 分页数量限制在 `20..240`。
- 背景区和顶部标题区沿用正式 Frame Region 资源桥。

## 运行时边界

- 首屏使用 Host 注入的 `initialView`。
- 后续分页通过 `runtime.listEntries`。
- 条目封面通过 `runtime.renderEntryCover(entryId)`。
- 点击封面或标题只调用 `runtime.openEntry(entryId)`。
- 背景与顶部区域图片通过 `runtime.readBoxAsset(assetPath)` 读取。
- 配置只保存 `assets/` 相对路径，不保存临时 URL、绝对路径或凭证。

## 配置字段

- `sortMode`: `manual | name-asc | name-desc`
- `columnMode`: `auto | compact | wide`
- `gap`: `compact | regular | spacious`
- `titleMode`: `below-cover | overlay | hidden`
- `showSummary`: `boolean`
- `pageSize`: `20..240`
- `background` / `topRegion`: `none | image | html`

## 常用命令

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run validate
npm run package
npm run verify
```
