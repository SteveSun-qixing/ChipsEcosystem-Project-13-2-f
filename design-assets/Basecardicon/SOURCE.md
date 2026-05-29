# 基础卡片插件静态图标源目录说明

- 适用目录：`design-assets/Basecardicon/`
- 同步时间：2026-05-29
- 生成脚本：`scripts/generate-plugin-material-icons.ts`
- 上游 SVG 缓存：`design-assets/material-symbols/svg/rounded/`
- 视觉基线：白色背景、黑色 Material Symbols Rounded 图标。
- 转换链路：官方 Material Symbols Rounded SVG -> 512px 白底黑色 SVG/PNG -> iconMaker ICO/ICNS 编码器。

## 目录职责

- 本目录保存基础卡片插件静态身份图标的正式设计源；
- 工程内同步到 `assets/icons/basecard-icon.*`，用于插件静态身份、物料清点和后续展示链路；
- 基础卡片运行时图标仍以 `basecardDefinition.icon` 与 `ChipsIcon + IconDescriptor` 为准；
- 本目录不属于 `manifest.ui.launcher.icon` 系统入口链路。

## 当前正式命名基线

| 源文件基名 | Material Symbols 名称 | 对应工程 | 正式输出物 |
| --- | --- | --- | --- |
| `book-BCP` | `book_2` | `Chips-BaseCardPlugin/book-BCP` | `Chips-BaseCardPlugin/book-BCP/assets/icons/basecard-icon.png/.ico/.icns/.svg` |
| `hyperlink-BCP` | `link` | `Chips-BaseCardPlugin/hyperlink-BCP` | `Chips-BaseCardPlugin/hyperlink-BCP/assets/icons/basecard-icon.png/.ico/.icns/.svg` |
| `image-BCP` | `image` | `Chips-BaseCardPlugin/image-BCP` | `Chips-BaseCardPlugin/image-BCP/assets/icons/basecard-icon.png/.ico/.icns/.svg` |
| `music-BCP` | `music_note` | `Chips-BaseCardPlugin/music-BCP` | `Chips-BaseCardPlugin/music-BCP/assets/icons/basecard-icon.png/.ico/.icns/.svg` |
| `richtext-BCP` | `article` | `Chips-BaseCardPlugin/richtext-BCP` | `Chips-BaseCardPlugin/richtext-BCP/assets/icons/basecard-icon.png/.ico/.icns/.svg` |
| `score-BCP` | `star` | `Chips-BaseCardPlugin/score-BCP` | `Chips-BaseCardPlugin/score-BCP/assets/icons/basecard-icon.png/.ico/.icns/.svg` |
| `video-BCP` | `smart_display` | `Chips-BaseCardPlugin/video-BCP` | `Chips-BaseCardPlugin/video-BCP/assets/icons/basecard-icon.png/.ico/.icns/.svg` |
| `webpage-BCP` | `web` | `Chips-BaseCardPlugin/webpage-BCP` | `Chips-BaseCardPlugin/webpage-BCP/assets/icons/basecard-icon.png/.ico/.icns/.svg` |

## 更新规则

- 图标调整时，先更新本目录正式源文件，再通过 `scripts/generate-plugin-material-icons.ts` 同步所有输出；
- 不再使用字体码位、HTML 文本渲染或截图方式生成图标，避免出现乱码；
- 每次改动本目录资产，必须同步更新本文件与对应工程 `assets/icons/SOURCE.md`；
- 运行时 UI 图标仍通过生态正式 `ChipsIcon + IconDescriptor` 链路渲染。
