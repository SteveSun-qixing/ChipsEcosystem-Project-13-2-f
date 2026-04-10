# 网页基础卡片参数

- `card_type`: 固定为 `WebPageCard`
- `source_type`: `url` 或 `bundle`
- `source_url`: 当来源为网址时使用
- `bundle_root`: 当来源为网页包时，指向卡片根目录中的网页文件夹
- `entry_file`: 网页入口文件，当前正式要求为 `index.html`
- `resource_paths`: 网页包内所有已导入文件的卡片根目录相对路径
- `display_mode`: `fixed` 或 `free`
- `fixed_ratio`: 固定比例模式使用的正式比例，当前固定为 `7:16`（宽:高）
- `max_height_ratio`: 自由展开模式的最大高度阈值，默认 `20`
