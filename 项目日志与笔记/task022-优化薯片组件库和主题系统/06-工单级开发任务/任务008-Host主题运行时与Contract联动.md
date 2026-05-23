# 任务008：Host 主题运行时与 Contract 联动

## 1. 任务目标

让 Host Theme Runtime 与组件库 contract、主题包 contract、L9 theme resolve、设置面板诊断形成闭环。

## 2. 对应阶段任务

- `05-开发任务方案/任务14-主题系统与组件Contract治理.md`

## 3. 涉及项目

- `Chips-Host/src/main/theme-runtime`
- `Chips-ComponentLibrary/packages/theme-contracts`
- `ThemePack/*`

## 4. 开发内容

1. `theme.contract.get` 返回完整 contract view。
2. `theme.apply` 前执行 contract guard。
3. `theme.resolve` 输出 token 诊断。
4. 主题变化事件携带版本和诊断摘要。
5. CLI 和设置面板可消费主题诊断。

## 5. 验收标准

- 无效主题无法应用。
- 缺失 token 可定位到组件 part/state。
- 默认主题和暗色主题都通过。

## 6. 验证命令

```bash
cd Chips-Host && npm run build && npm test && npm run test:contract
cd ../Chips-ComponentLibrary && npm run test:contracts
```

