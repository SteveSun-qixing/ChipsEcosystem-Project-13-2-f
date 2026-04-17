# 视频播放器

> 插件 ID：`com.chips.video-player`

`Chips-VideoPlayer` 是薯片生态的应用插件视频播放器。它沿用图片查看器的正式应用插件分层，负责接收 Host `resource.open` / `file-handler` 路由、打开视频、提供基础播放控制，并保持主题、多语言与 Bridge / SDK 链路一致。

本项目吸收了开源项目 `DPlayer` 的控制台分组、热键和播放交互思路，但运行时实现完全收口在薯片生态正式架构内：

- 外层仍然是标准 `type: app` 应用插件；
- 系统能力只通过 `chips-sdk` / `window.chips.*` 调用；
- 播放核心基于原生 HTML5 `<video>`，不把第三方运行时直接暴露为生态公共接口；
- DPlayer 相关借鉴仅作为项目内部实现参考。

## 快速开始

```bash
cd /Users/sevenstars/Documents/ChipsCard/Develop/Project-13-2-f
npm install
cd Chips-VideoPlayer
npm run run
```

常用脚本：

- `npm run dev`：启动开发服务器
- `npm run run`：在真实 Host 中启动当前应用插件
- `npm run build`：构建正式产物
- `npm test`：执行测试
- `npm run lint`：执行类型与代码规范检查
- `npm run validate`：执行 manifest 与工程校验

## 当前能力

- 接收 `resource-handler:view:video/*` 与 `file-handler:.mp4/.webm/.mov/.m4v/.ogv/.ogg`
- 从 `launchParams.resourceOpen` / `targetPath` 恢复视频查看会话
- 手动打开本地视频、拖放打开视频
- 播放 / 暂停、时间轴拖动、前进后退、音量、静音、倍速
- 全屏、画中画（宿主支持时）
- 另存视频副本；不支持原地覆盖时自动回退为下载

## 目录提示

- `src/App.tsx`：应用入口与启动恢复、资源解析
- `src/components/VideoPlayerStage.tsx`：界面舞台与控制条
- `src/hooks/useVideoPlayerController.ts`：播放状态与交互控制
- `src/utils/video-player.ts`：格式、时间、资源能力等纯函数
- `需求文档/`、`技术文档/`、`开发计划/`：项目文档体系
