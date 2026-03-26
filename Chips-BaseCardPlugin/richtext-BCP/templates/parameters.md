# 富文本基础卡片配置参数说明

- `card_type`：富文本基础卡片正式类型标识，固定为 `"RichTextCard"`。
- `theme`：可选的主题变体标识；为空时跟随当前主题系统。
- `locale`：语言代码，可选，建议使用标准语言标签（例如 `zh-CN`、`en-US`）。
- `content_format`：正式内容格式，固定为 `"markdown"`。
- `content_source`：内容来源，`inline` 表示保存在内容配置中，`file` 表示保存为卡片根目录 Markdown 文件引用。
- `content_text`：`inline` 模式下的 Markdown 内容。
- `content_file`：`file` 模式下的卡片根目录相对 Markdown 文件路径。
