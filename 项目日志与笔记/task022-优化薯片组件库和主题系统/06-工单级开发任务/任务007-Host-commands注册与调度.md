# 任务007：Host commands 注册与调度

## 1. 任务目标

建立 Host command registry，让菜单、工具栏、快捷键、命令面板共享统一 command 语义。

## 2. 对应阶段任务

- `05-开发任务方案/任务11-导航菜单工具栏与命令系统.md`

## 3. 涉及项目

- `Chips-Host`
- `Chips-SDK`
- `Chips-ComponentLibrary`

## 4. 开发内容

1. 定义 command schema。
2. Host 注册、注销、查询、调用 command。
3. command scope 和 permission 校验。
4. Bridge/SDK 暴露正式 action。
5. 测试菜单/工具栏/快捷键复用。

## 5. 验收标准

- command 可被多入口复用。
- 权限不足有标准错误。
- command 文案使用 i18n key。

## 6. 验证命令

```bash
cd Chips-Host && npm run build && npm test && npm run test:contract
cd ../Chips-SDK && npm test
```

