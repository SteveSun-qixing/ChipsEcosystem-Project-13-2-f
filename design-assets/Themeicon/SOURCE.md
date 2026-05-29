# 主题包身份图标源目录说明

- 适用目录：`design-assets/Themeicon/`
- 同步时间：2026-05-29
- 生成脚本：`scripts/generate-plugin-material-icons.ts`
- 上游 SVG 缓存：`design-assets/material-symbols/svg/rounded/`
- 视觉基线：白色背景、黑色 Material Symbols Rounded 图标。
- 转换链路：官方 Material Symbols Rounded SVG -> 512px 白底黑色 SVG/PNG -> iconMaker ICO/ICNS 编码器。

## 目录职责

- 本目录保存主题包身份图标的正式设计源；
- 主题包正式运行时 UI 图标资源仍为 `icons/variablefont/*.woff2`，不从本目录复制到主题包 `assets/icons/`；
- 本目录用于主题治理、物料清点和后续安装分发展示链路；
- 本目录不属于 `manifest.ui.launcher.icon` 系统入口链路。

## 当前正式命名基线

| 源文件基名 | Material Symbols 名称 | 对应工程 | 正式输出物 |
| --- | --- | --- | --- |
| `Chips-default` | `light_mode` | 无工程输出 | 只输出设计源 |
| `Chips-theme-default-dark` | `dark_mode` | 无工程输出 | 只输出设计源 |

## 更新规则

- 图标调整时，先更新本目录正式源文件，再通过 `scripts/generate-plugin-material-icons.ts` 同步所有输出；
- 不再使用字体码位、HTML 文本渲染或截图方式生成图标，避免出现乱码；
- 主题包身份图标只写入本设计源目录，不写入主题包 `assets/icons/`；
- 主题包运行时 UI 图标仍通过生态正式 `ChipsIcon + IconDescriptor` 链路渲染。
