# 视频基础卡片参数说明

本文件说明 [default-card-config.yaml](/Users/sevenstars/Documents/ChipsCard/Develop/Project-13-2-f/Chips-BaseCardPlugin/video-BCP/templates/default-card-config.yaml) 中各字段的含义与填写规范。

- `card_type`：固定为 `VideoCard`。
- `theme`：可选主题标识；为空时跟随外层主题。
- `video_file`：视频文件路径；必须是相对于卡片根目录的正式资源路径。
- `cover_image`：封面图片路径；可选，未填写时查看态会回退到视频第一帧。
- `video_title`：视频标题；可选，填写后显示在封面下方。
- `publish_time`：发布时间；可选，填写后与创作者一起显示在次信息行。
- `creator`：创作者名称；可选，填写后与发布时间一起显示。

补充约束：

- 视频和封面资源都必须通过宿主 `importResource(...)` 导入到卡片根目录。
- 配置里不得写入 `blob:`、`data:`、绝对路径或宿主临时 URL。
- 更换视频后，编辑器会自动尝试提取第一帧并生成新的默认封面资源。
