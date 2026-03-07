# Data-Form P1 第二批组件规范

## 1. 范围

本规范覆盖阶段七第二批已落地组件：

- `ChipsDataGrid`
- `ChipsTree`
- `ChipsDateTime`
- `ChipsCommandPalette`

## 2. 统一状态与契约

四组件统一继承状态优先级：

`disabled > loading > error > active > focus > hover > idle`

并强制输出 `data-scope/data-part/data-state`。

## 3. 组件规范

### 3.1 ChipsDataGrid

- `data-scope="data-grid"`
- `data-part="root|table|header|row|cell|status"`
- 语义：
  - root：`role="grid"`
  - 行：`aria-selected`
  - 列头：`aria-sort`
- 能力：
  - 列排序（`asc/desc`）
  - 行选择（受控/非受控）
  - 键盘导航（`Arrow/Home/End/Enter/Space`）

### 3.2 ChipsTree

- `data-scope="tree"`
- `data-part="root|node|toggle|label|children|status"`
- 语义：
  - root：`role="tree"`
  - node：`role="treeitem"` + `aria-level`
- 能力：
  - 展开折叠（受控/非受控）
  - 节点选择（受控/非受控）
  - 键盘导航（`Arrow/Home/End/Enter/Space`）
  - 图标槽位：`expandIconContent`、`collapseIconContent`（避免内置硬编码文案）

### 3.3 ChipsDateTime

- `data-scope="date-time"`
- `data-part="root|input|icon|status"`
- 语义：
  - input：`type="datetime-local"`
  - 错误态：`aria-invalid`
- 能力：
  - 受控/非受控时间值
  - `min/max/step` 参数约束
  - 图标槽位：`iconContent`（默认使用语义 SVG，不写死文案）

### 3.4 ChipsCommandPalette

- `data-scope="command-palette"`
- `data-part="root|trigger|search|list|item|shortcut|status"`
- 语义：
  - search：`role="combobox"`
  - list：`role="listbox"`
  - item：`role="option"`
- 能力：
  - 查询过滤（label/shortcut/keywords）
  - 高亮导航（`Arrow/Home/End`）
  - 回车选择与 Esc 关闭

## 4. Token 映射

新增组件 token：

- `chips.comp.data-grid.*`
- `chips.comp.tree.*`
- `chips.comp.date-time.*`
- `chips.comp.command-palette.*`

对应源文件：

- `packages/tokens/tokens/comp/data-grid.json`
- `packages/tokens/tokens/comp/tree.json`
- `packages/tokens/tokens/comp/date-time.json`
- `packages/tokens/tokens/comp/command-palette.json`

## 5. 主题契约

对应契约：

- `packages/theme-contracts/contracts/components/data-grid.contract.json`
- `packages/theme-contracts/contracts/components/tree.contract.json`
- `packages/theme-contracts/contracts/components/date-time.contract.json`
- `packages/theme-contracts/contracts/components/command-palette.contract.json`

## 6. 验证结果（2026-03-05）

- token 校验通过（141 keys）
- 主题契约校验通过（20 contracts）
- 组件测试通过（97 tests）
- `npm run verify` 全量通过

## 7. 阶段七交互与性能补充交付

- 交互状态图与键盘清单：`技术文档/22-阶段七交互状态图与键盘清单.md`
- 性能基线报告：`技术文档/23-阶段七性能基线报告.md`

## 8. 阶段七后续

Workbench 组件规范见：

- `21-Workbench-P2第一批组件规范.md`
