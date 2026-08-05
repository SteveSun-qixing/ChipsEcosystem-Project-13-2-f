# 布局模板静态图标来源说明

- 当前模板文件：`layout-icon.svg`
- 同步时间：2026-03-26

## 资产角色

- 该文件是布局模板内的静态展示资源；
- 用于生成工程后的插件静态身份资源；
- 不属于运行时 UI 图标主链路。

## 运行时边界

- 生成工程后，运行时图标统一使用 `src/index.ts` 中的 `layoutDefinition.icon`
- 编辑引擎、查看器和治理页统一通过 `ChipsIcon + IconDescriptor` 渲染，不消费本 SVG 文件
