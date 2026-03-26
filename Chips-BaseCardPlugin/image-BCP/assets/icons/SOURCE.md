# 图片基础卡片静态图标来源说明

- 当前正式文件：`basecard-icon.svg`
- 同步时间：2026-03-26

## 资产角色

- 该文件是基础卡片插件包内的静态展示资源；
- 用于插件工程静态身份、包内资源说明和未来安装分发扩展；
- 不属于运行时 UI 图标主链路。

## 运行时边界

- 运行时图标统一使用 `src/index.ts` 中的 `basecardDefinition.icon`
- 当前正式运行时图标描述符为 `{ name: "image" }`
- 编辑引擎、查看器和治理页统一通过 `ChipsIcon + IconDescriptor` 渲染，不消费本 SVG 文件
