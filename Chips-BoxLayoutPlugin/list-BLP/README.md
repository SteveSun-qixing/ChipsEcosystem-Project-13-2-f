# 列表布局插件

通过 `chips-scaffold-boxlayout` 生成的标准布局插件工程。

## 工程定位

- 插件 ID：`chips.layout.list`
- 布局类型：`chips.layout.list`
- 显示名称：`列表布局插件`

## 布局行为

- 查看态以等高列表行展示箱子条目；
- 每行左侧渲染正式条目封面；
- 每行右侧显示条目名称和创建日期；
- 排序、背景区域和顶部标题区域沿用官方布局插件通用配置链路。

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
- 布局运行时、条目、配置等共享类型

其中：

- `layoutDefinition.icon` 是运行时正式图标描述符；
- `assets/icons/layout-icon.svg` 只作为静态资源保留，来源说明见 `assets/icons/SOURCE.md`。

## 常用命令

```bash
npm run build
npm run test
npm run lint
npm run validate
```
