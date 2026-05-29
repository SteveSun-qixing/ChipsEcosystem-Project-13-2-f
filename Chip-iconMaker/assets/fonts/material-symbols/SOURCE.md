# Material Symbols 字体来源说明

- 上游仓库：`https://github.com/google/material-design-icons.git`
- 锁定提交：`caeba1e66925218b1fd1464171f93e2656f9a0b9`
- 本地来源目录：`design-assets/material-symbols/variablefont/`
- 复制时间：2026-05-28
- 授权：Apache-2.0，见 `design-assets/material-symbols/LICENSE`

## 纳入图标工坊工程的文件

- `variablefont/MaterialSymbolsOutlined[FILL,GRAD,opsz,wght].woff2`
- `variablefont/MaterialSymbolsRounded[FILL,GRAD,opsz,wght].woff2`
- `variablefont/MaterialSymbolsSharp[FILL,GRAD,opsz,wght].woff2`
- `variablefont/MaterialSymbolsRounded[FILL,GRAD,opsz,wght].codepoints`

## 使用边界

- 这组三套字体用于图标工坊的内置 Material Symbols 图标源，以及本地开发预览中 `ChipsIcon` 的字体渲染兜底。
- `.codepoints` 文件用于字体模式中展示完整 Material Symbols 码位集合。
- Host 正式运行时仍可以通过主题系统注入 Material Symbols；图标工坊不实现独立主题解析器。
