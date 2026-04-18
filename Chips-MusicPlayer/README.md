# 音乐播放器

> 插件 ID：`com.chips.music-player`

`Chips-MusicPlayer` 是薯片生态的应用插件音乐播放器。它沿用图片查看器与视频播放器已经收口的应用插件分层，负责接收 Host `resource.open` / `file-handler` 路由、恢复单曲播放会话，并提供封面、歌词、进度、循环与保存副本等正式能力。

本项目参考了开源仓库 `OpenSourceProjectHandlingFolder/MusicPlayer-main` 的视觉布局与歌词滚动氛围，但运行时实现完全收口在薯片生态正式架构内：

- 外层仍然是标准 `type: app` 应用插件；
- 系统能力只通过 `chips-sdk` / `window.chips.*` 调用；
- 播放核心基于原生 HTML5 `<audio>`；
- 本地元数据解析为仓库内自实现逻辑，不引入新的第三方运行时包；
- 参考仓库中复用的默认封面资源按 MIT 许可纳入，并在资产目录内单独注明来源。

## 当前能力

- 接收 `resource-handler:view:audio/*` 与常见音频扩展名文件关联
- 从 `launchParams.resourceOpen` / `targetPath` 恢复音频播放会话
- 手动打开本地音频，也支持把音频、歌词、封面一并选择或拖入
- 自动发现同目录伴生 `cover / folder / front` 封面与同名或 `lyrics.lrc` 歌词
- 支持 MP3 / FLAC 常见嵌入元数据读取：标题、歌手、专辑、封面、歌词
- 左封面右歌词布局、滚动歌词、高斯背景氛围层
- 播放 / 暂停、前后 10 秒、音量、静音、单曲循环
- 保存音频副本；远端或无稳定本地路径时回退为下载

## 快速开始

```bash
cd /Users/sevenstars/Documents/ChipsCard/Develop/Project-13-2-f
npm install
cd Chips-MusicPlayer
npm run run
```

常用脚本：

- `npm run dev`：启动开发服务器
- `npm run run`：在真实 Host 中启动当前应用插件
- `npm run build`：构建正式产物
- `npm test`：执行测试
- `npm run lint`：执行代码规范检查
- `npm run validate`：执行 manifest 与工程校验

## 目录提示

- `src/App.tsx`：应用入口、启动恢复、资源解析与保存链路
- `src/components/MusicPlayerStage.tsx`：播放器舞台、封面布局与歌词视图
- `src/hooks/useMusicPlayerController.ts`：播放状态与交互控制
- `src/utils/music-player.ts`：音频格式、路径与选择归一纯函数
- `src/utils/lyrics.ts`：歌词文本解析与高亮索引
- `src/utils/audio-metadata.ts`：MP3 / FLAC 嵌入元数据解析
- `需求文档/`、`技术文档/`、`开发计划/`：项目文档体系
