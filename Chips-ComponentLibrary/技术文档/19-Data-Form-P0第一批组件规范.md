# Data-Form P0 第一批组件规范

## 1. 范围

本规范覆盖阶段七第一批已落地组件：

- `ChipsFormField`
- `ChipsFormGroup`
- `ChipsVirtualList`

## 2. 统一状态与契约

三组件统一继承状态优先级：

`disabled > loading > error > active > focus > hover > idle`

并强制输出 `data-scope/data-part/data-state`。

## 3. 组件规范

### 3.1 ChipsFormField

- `data-scope="form-field"`
- `data-part="root|label|control|helper|error|status"`
- 支持受控与非受控：
  - `value + onValueChange`
  - `defaultValue`
- 状态语义：
  - `aria-required`
  - `aria-invalid`
  - `aria-describedby`

### 3.2 ChipsFormGroup

- `data-scope="form-group"`
- `data-part="root|legend|description|content|status"`
- 语义：
  - `fieldset/legend`
  - `aria-describedby`
  - `aria-invalid`

### 3.3 ChipsVirtualList

- `data-scope="virtual-list"`
- `data-part="root|viewport|content|item|status"`
- 语义：
  - viewport：`role="list"`
  - item：`role="listitem"`
- 虚拟化：
  - 统一窗口计算：`computeVirtualWindow`
  - 支持 `overscan`
  - 支持键盘导航：`ArrowUp/ArrowDown/Home/End`

## 4. Token 映射

新增组件 token：

- `chips.comp.form-field.*`
- `chips.comp.form-group.*`
- `chips.comp.virtual-list.*`

对应源文件：

- `packages/tokens/tokens/comp/form-field.json`
- `packages/tokens/tokens/comp/form-group.json`
- `packages/tokens/tokens/comp/virtual-list.json`

## 5. 主题契约

对应契约：

- `packages/theme-contracts/contracts/components/form-field.contract.json`
- `packages/theme-contracts/contracts/components/form-group.contract.json`
- `packages/theme-contracts/contracts/components/virtual-list.contract.json`

## 6. 验证结果（2026-03-05）

- token 校验通过
- 主题契约校验通过
- 组件测试通过
- `npm run verify` 全量通过（113 token keys / 16 contracts / 83 tests）

## 7. 阶段七后续

Data-Form 第二批组件规范见：

- `20-Data-Form-P1第二批组件规范.md`
