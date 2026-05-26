# 超链接基础卡片配置参数说明

本文件说明 `default-card-config.yaml` 中各字段的含义与填写规范。

- `card_type`：内容配置类型标识，默认固定为 `HyperlinkCard`；插件正式能力类型为 `base.hyperlink`。
- `theme`：可选的主题变体标识；为空时跟随当前主题系统。
- `locale`：语言代码，可选。建议使用标准语言标签，例如 `zh-CN`、`en-US`。
- `anchor_text`：锚文本，必填；会显示为复合卡片中的长条按钮文字。
- `url`：跳转链接，必填；必须是有效的 `http` 或 `https` 地址，查看态点击后通过宿主 `openResource(...)` 上抛，由 Host `resource.open` 统一路由。
- `description`：链接描述，可选；显示在链接标题下方。
- `icon_url`：链接图标 URL，可选；必须是有效的 `http` 或 `https` 地址。
- `open_mode`：打开方式偏好，取值为 `external-browser` 或 `resource-router`；该字段作为 `resource.open` payload 透传，最终打开方式由 Host 决定。
- `display_density`：显示密度，取值为 `compact`、`comfortable` 或 `spacious`。
- `show_security_hint`：是否在查看态显示安全提示，布尔值。
