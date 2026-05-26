# 评分基础卡片配置参数说明

本文件说明 [default-card-config.yaml](/Users/sevenstars/Documents/ChipsCard/Develop/Project-13-2-f-worktree-20260523-161048/Chips-BaseCardPlugin/score-BCP/templates/default-card-config.yaml) 中各字段的正式含义与填写约束。

- `card_type`
  - 固定为 `"ScoreCard"`。
- `theme`
  - 可选主题标识；留空时继承上层主题。
- `style`
  - 评分展示样式，可选：
    - `stars`
    - `hearts`
    - `score`
    - `progress`
- `score`
  - 获得分数。
  - `stars` 与 `hearts` 为五分制整数，合法范围为 `0-5`。
  - `score` 与 `progress` 可以使用小数，归一化后不会小于 `0`，也不会超过 `total_score`。
- `total_score`
  - 总分。
  - `stars` 与 `hearts` 固定归一为 `5`。
  - `score` 与 `progress` 的合法范围为 `1-100000`。
- `locale`
  - 语言代码，可选。建议使用标准语言标签，例如 `zh-CN`、`en-US`。
