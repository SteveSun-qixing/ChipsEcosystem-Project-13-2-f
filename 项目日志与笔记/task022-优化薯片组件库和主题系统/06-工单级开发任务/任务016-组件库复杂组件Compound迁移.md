# 任务016：组件库复杂组件 Compound 迁移

## 1. 任务目标

把复杂组件迁移为 Compound API，减少 boolean props 膨胀。

## 2. 对应阶段任务

- `05-开发任务方案/任务09-复杂组件Compound-API与样式契约.md`

## 3. 涉及项目

- `Chips-ComponentLibrary/packages/components`
- `Chips-Host/src/renderer/declarative-ui`

## 4. 开发内容

1. Dialog compound。
2. Popover compound。
3. Tabs compound。
4. Menu compound。
5. Select compound。
6. Form compound。
7. DataGrid compound。
8. Tree compound。
9. CommandPalette compound。
10. NavigationSplitView compound。

## 5. 验收标准

- slot 规则明确。
- L8 可校验 slot。
- contract 覆盖 Root/Trigger/Content/Item 等 parts。

## 6. 验证命令

```bash
cd Chips-ComponentLibrary && npm run verify && npm run quality:gate
cd ../Chips-Host && npm test
```

