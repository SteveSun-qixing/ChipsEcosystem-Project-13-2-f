# Material Symbols 来源说明（阶段04任务09冻结）

- 上游仓库: https://github.com/google/material-design-icons.git
- 锁定提交: `caeba1e66925218b1fd1464171f93e2656f9a0b9`
- 上游提交时间(UTC): `2026-02-20T03:12:50Z`
- 本地下载时间(UTC): `2026-02-24T15:56:17Z`
- 下载策略: 仅拉取目标提交对应文件，不下载提交历史。
- 下载范围: `variablefont/*`, `font/*`, `LICENSE`, `README.md`
- 上游资产文件总数: `22`
- 本地治理文件总数: `1`（`.gitignore`，不计入上游资产总数）
- 授权文件: `LICENSE`（Apache-2.0）

## Material Symbols 轴映射冻结（对外 token 口径）

| 上游轴标签 | 薯片冻结字段 | 默认值 | 取值约束（阶段04） | 说明 |
| --- | --- | --- | --- | --- |
| `FILL` | `icon.fill` | `0` | `0/1`（可动画插值） | 图标填充态 |
| `wght` | `icon.weight` | `400` | `100-700` | 字重 |
| `GRAD` | `icon.grade` | `0` | `-50-200` | 字形对比度微调 |
| `opsz` | `icon.opticalSize` | `24` | `20-48` | 光学尺寸 |
| (无上游轴) | `icon.size` | `24` | 正数，按 `cpx` 语义换算 | 组件显示尺寸 |

## 上游资产文件清单（机器核对格式：`path | bytes`）

- `LICENSE` / 11357
- `README.md` / 7856
- `font/MaterialIcons-Regular.codepoints` / 39522
- `font/MaterialIcons-Regular.ttf` / 356840
- `font/MaterialIconsOutlined-Regular.codepoints` / 38739
- `font/MaterialIconsOutlined-Regular.otf` / 339168
- `font/MaterialIconsRound-Regular.codepoints` / 38846
- `font/MaterialIconsRound-Regular.otf` / 400092
- `font/MaterialIconsSharp-Regular.codepoints` / 38846
- `font/MaterialIconsSharp-Regular.otf` / 286012
- `font/MaterialIconsTwoTone-Regular.codepoints` / 40019
- `font/MaterialIconsTwoTone-Regular.otf` / 675852
- `font/README.md` / 1410
- `variablefont/MaterialSymbolsOutlined[FILL,GRAD,opsz,wght].codepoints` / 77158
- `variablefont/MaterialSymbolsOutlined[FILL,GRAD,opsz,wght].ttf` / 10380024
- `variablefont/MaterialSymbolsOutlined[FILL,GRAD,opsz,wght].woff2` / 3864540
- `variablefont/MaterialSymbolsRounded[FILL,GRAD,opsz,wght].codepoints` / 77158
- `variablefont/MaterialSymbolsRounded[FILL,GRAD,opsz,wght].ttf` / 14724756
- `variablefont/MaterialSymbolsRounded[FILL,GRAD,opsz,wght].woff2` / 5209104
- `variablefont/MaterialSymbolsSharp[FILL,GRAD,opsz,wght].codepoints` / 77158
- `variablefont/MaterialSymbolsSharp[FILL,GRAD,opsz,wght].ttf` / 8623560
- `variablefont/MaterialSymbolsSharp[FILL,GRAD,opsz,wght].woff2` / 3418884

## 本地治理文件清单（不计入上游资产统计）

- `.gitignore` / 65
