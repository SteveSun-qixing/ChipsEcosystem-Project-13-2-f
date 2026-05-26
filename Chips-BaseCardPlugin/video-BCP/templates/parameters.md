# 视频基础卡片参数说明

本文件说明 [default-card-config.yaml](/Users/sevenstars/Documents/ChipsCard/Develop/Project-13-2-f-worktree-20260523-161048/Chips-BaseCardPlugin/video-BCP/templates/default-card-config.yaml) 中各字段的含义与填写规范。

- `card_type`：固定为 `VideoCard`。
- `theme`：可选主题标识；为空时跟随外层主题。
- `video_file`：视频文件路径；必须是相对于卡片根目录的正式资源路径。
- `cover_image`：封面图片路径；可选，未填写时查看态会回退到视频第一帧。
- `subtitles`：外挂字幕轨数组；每项包含 `id`、`label`、`language`、`kind`、`file_path`、`default`。
- `playback.autoplay`：打开视频时是否期望自动播放，默认 `false`。
- `playback.loop`：打开视频时是否循环播放，默认 `false`。
- `playback.muted`：打开视频时是否默认静音，默认 `false`。
- `playback.playback_rate`：默认倍速，范围 `0.25` 到 `4`，默认 `1`。
- `playback.start_time`：打开视频时的起始秒数，必须大于等于 `0`。
- `video_title`：视频标题；可选，填写后显示在封面下方。
- `publish_time`：发布时间；可选，填写后与创作者一起显示在次信息行。
- `creator`：创作者名称；可选，填写后与发布时间一起显示。

补充约束：

- 视频、封面和字幕资源都必须通过宿主 `importResource(...)` 导入到卡片根目录。
- 配置里不得写入 `blob:`、`data:`、绝对路径或宿主临时 URL。
- 同一视频卡片最多一个字幕轨设置 `default: true`。
- 更换视频后，编辑器会清空旧封面，避免旧封面误指向新视频；自动缩略图生成等待 Host/模块正式能力。
