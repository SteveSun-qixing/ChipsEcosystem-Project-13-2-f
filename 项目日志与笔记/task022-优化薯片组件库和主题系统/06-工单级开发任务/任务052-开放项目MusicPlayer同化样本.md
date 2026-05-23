# 任务052：开放项目 MusicPlayer 同化样本

## 1. 任务目标

使用 `OpenSourceProjectHandlingFolder/MusicPlayer-main` 验证外部静态 Web 项目同化流程，形成低复杂度项目迁入薯片生态的样板。

## 2. 对应阶段任务

- `05-开发任务方案/任务16-Web项目同化CLI与迁移报告.md`
- `05-开发任务方案/任务27-开放项目同化样本工程.md`

## 3. 涉及项目

- `OpenSourceProjectHandlingFolder/MusicPlayer-main`
- `Chips-Scaffold/chips-scaffold-app`
- `Chips-SDK`
- `Chips-ComponentLibrary`
- `Chips-MusicPlayer`

## 4. 开发内容

1. 重新核对 MusicPlayer-main 的 README、目录结构、资源、依赖和运行方式。
2. 使用 SDK/Scaffold 同化命令生成扫描报告：入口、资源、全局样式、硬编码文案、浏览器 API、媒体 API、外部依赖。
3. 评估它应成为独立应用插件、组件参考，还是合并为 `Chips-MusicPlayer` 的交互参考。
4. 生成同化目标结构：manifest、surface、theme、i18n、资源路径、质量门禁。
5. 将可复用播放交互、队列、封面和歌词经验沉淀到音乐播放器迁移任务。
6. 记录无法直接同化的内容和需要底座支持的能力缺口。
7. 输出可复用同化报告模板，供后续简单 Web 项目使用。

## 5. 验收标准

- 有完整同化报告，不是简单复制外部项目。
- 清楚说明哪些代码进入底层、组件库、音乐播放器或归档参考。
- 不引入未经确认的新依赖。
- 同化结果能通过新框架应用质量门禁或明确阻断工单。

## 6. 验证命令

```bash
cd OpenSourceProjectHandlingFolder/MusicPlayer-main
npm install
npm run build
```

## 7. 注意事项

- 外部项目同化必须遵守薯片生态 Host/SDK/组件库/主题/多语言链路。
- 本任务开发前必须重新调查该项目当前代码和许可证状态。
