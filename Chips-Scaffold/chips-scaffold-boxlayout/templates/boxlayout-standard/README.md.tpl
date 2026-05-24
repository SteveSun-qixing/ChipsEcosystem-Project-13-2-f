# {{ DISPLAY_NAME }}

标准布局插件工程。

## 工程定位

- 插件 ID：`{{ PLUGIN_ID }}`
- 布局类型：`{{ LAYOUT_TYPE }}`
- 显示名称：`{{ DISPLAY_NAME }}`

## 目录说明

- `src/view/`：查看态页面挂载与运行时
- `src/editor/`：布局参数编辑与预览
- `src/schema/`：默认配置、归一和校验
- `src/shared/`：共享类型、多语言和视图辅助函数
- `contracts/`：布局配置 schema
- `tests/`：单元测试
- `assets/icons/`：静态布局图标资源与来源说明

## 正式导出

入口文件 `src/index.ts` 导出：

- `layoutDefinition`
- `createDefaultLayoutConfig`
- `normalizeLayoutConfig`
- `validateLayoutConfig`

其中：

- `layoutDefinition.icon` 是运行时正式图标描述符；
- 查看态封面使用 `@chips/component-library` 的 `EmbeddedDocumentFrame` 承载 Host 返回的正式文档入口；
- `assets/icons/layout-icon.svg` 只作为静态资源保留，来源说明见 `assets/icons/SOURCE.md`。

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
