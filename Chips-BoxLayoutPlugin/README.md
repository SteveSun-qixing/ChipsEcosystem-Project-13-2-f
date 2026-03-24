# 网格布局插件

通过 `chips-scaffold-boxlayout` 生成的标准布局插件工程。

## 工程定位

- 插件 ID：`chips.layout.grid`
- 布局类型：`chips.layout.grid`
- 显示名称：`网格布局插件`

## 目录说明

- `src/view/`：查看态页面挂载与运行时
- `src/editor/`：布局参数编辑与预览
- `src/schema/`：默认配置、归一和校验
- `src/shared/`：共享类型、多语言和视图辅助函数
- `contracts/`：布局配置 schema
- `tests/`：单元测试

## 正式导出

入口文件 `src/index.ts` 导出：

- `layoutDefinition`
- `createDefaultLayoutConfig`
- `normalizeLayoutConfig`
- `validateLayoutConfig`

## 常用命令

```bash
npm run build
npm run test
npm run lint
npm run validate
```
