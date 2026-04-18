# 视频基础卡片插件

> 插件 ID：`chips.basecard.video`

`video-BCP` 是薯片生态的官方视频基础卡片插件。项目由基础卡片脚手架初始化后，按视频卡片正式口径完成了查看态、编辑态、资源链路、多语言与测试闭环。

## 当前能力

- 支持基础卡片类型：`base.video`
- 正式配置字段：
  - `video_file`
  - `cover_image`
  - `video_title`
  - `publish_time`
  - `creator`
- 查看态直接显示视频封面；未填写封面时回退到视频第一帧
- 鼠标悬浮时显示黑色半透明遮罩与播放图标
- 点击视频封面时通过宿主 `openResource(...)` 统一上抛，最终走 Host `resource.open` 路由到视频播放器
- 编辑态上传视频后自动尝试提取第一帧并生成默认封面资源
- 编辑页采用标题分组 + 列表行布局，适合侧栏和窄窗口
- 资源区支持点击或拖拽上传，也支持通过 URL 导入
- 上传后的资源区直接显示视频/封面预览，并在悬浮时显示删除按钮
- 手动封面上传、替换、移除与元信息编辑
- 元信息输入改为离开输入区后再提交，避免每次按键都触发预览刷新

## 工程结构

```text
video-BCP/
├─ manifest.yaml
├─ package.json
├─ chips.config.mjs
├─ src/
│  ├─ index.ts
│  ├─ schema/card-config.ts
│  ├─ render/
│  │  ├─ runtime.ts
│  │  └─ view.tsx
│  ├─ editor/
│  │  ├─ runtime.ts
│  │  └─ panel.tsx
│  └─ shared/
│     ├─ i18n.ts
│     ├─ utils.ts
│     └─ video-cover.ts
├─ i18n/
├─ templates/
└─ tests/
```

## 开发命令

```bash
cd /Users/sevenstars/Documents/ChipsCard/Develop/Project-13-2-f
npm install
cd Chips-BaseCardPlugin/video-BCP
npm run dev
```

常用脚本：

- `npm run build`
- `npm test`
- `npm run lint`
- `npm run validate`

## 配置示例

```yaml
card_type: "VideoCard"
theme: ""
video_file: "travel-vlog.mp4"
cover_image: "travel-vlog-cover.jpg"
video_title: "东京旅行记录"
publish_time: "2026-04-18"
creator: "薯片工作室"
```

参数说明见 [templates/parameters.md](/Users/sevenstars/Documents/ChipsCard/Develop/Project-13-2-f/Chips-BaseCardPlugin/video-BCP/templates/parameters.md)。

## 正式导出

- `renderBasecardView(ctx)`
- `renderBasecardEditor(ctx)`
- `basecardDefinition`

其中：

- `basecardDefinition.cardType = "base.video"`
- `basecardDefinition.aliases = ["VideoCard"]`
- `basecardDefinition.previewPointerEvents = "shielded"`
- `collectResourcePaths(...)` 会收集 `video_file` 与 `cover_image` 的内部资源路径
