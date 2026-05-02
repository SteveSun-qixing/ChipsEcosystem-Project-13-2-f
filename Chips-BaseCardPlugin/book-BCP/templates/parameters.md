# 电子书基础卡片配置参数说明

- `card_type`：固定为 `BookCard`，由插件别名映射到正式类型 `base.book`。
- `theme`：可选主题变体，通常为空并跟随当前主题系统。
- `source_type`：资源类型，`ebook` 表示普通电子书文件，`image-sequence` 表示 ZIP/CBZ 解包后的漫画图片序列。
- `book_file`：普通电子书文件的卡片根目录相对路径。图片序列模式下必须为空。
- `book_format`：电子书或来源包格式，例如 `epub`、`pdf`、`txt`、`mobi`、`azw3`、`fb2`、`djvu`、`zip`、`cbz`。
- `book_name`：书籍名称。自动解析失败时保持空字符串，由编辑器和查看态显示占位文案。
- `book_author`：书籍作者。自动解析失败时保持空字符串，由编辑器和查看态显示占位文案。
- `cover_image`：封面图片的卡片根目录相对路径。图片序列上传后默认引用排序后的第一张图片，用户可上传封面覆盖。
- `image_sequence`：图片包解包后的图片资源数组，顺序即阅读顺序。
- `image_sort_basis`：图片包排序依据，`filename` 按文件名排序，`entry-time` 按 ZIP 条目时间排序，时间缺失或不可区分时稳定回退文件名。
- `resource_paths`：卡片当前显式引用的内部资源路径清单，需与 `book_file`、`cover_image`、`image_sequence[*].file_path` 保持一致。
