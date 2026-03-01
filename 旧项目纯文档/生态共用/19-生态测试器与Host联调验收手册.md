# 生态测试器与 Host 联调验收手册

## 1. 目标

验证 `chipsd ecosystem test` 与 Host 开发控制面（Dev Control）联调链路可用，且回归报告可被 CI 消费。

## 2. 环境前置

1. Host 以开发模式启动，并开放开发控制端口（默认 `127.0.0.1:9527`）。
   - 推荐启动方式：`CHIPS_ENV=development pnpm --dir Chips-Host dev`
2. `chipsd` 已安装并可执行。
3. 当前工作区可访问各生态仓库（用于 `changed` profile 的变更映射）。

## 3. 验收命令

### 3.1 快速冒烟

```bash
chipsd ecosystem test --profile smoke
```

### 3.2 全量回归

```bash
chipsd ecosystem test --profile full
```

### 3.3 变更映射回归

```bash
chipsd ecosystem test --profile changed --changed-base develop
```

### 3.4 指定报告路径

```bash
chipsd ecosystem test \
  --profile smoke \
  --json ./reports/ecosystem/report.json \
  --junit ./reports/ecosystem/report.junit.xml
```

### 3.5 工作区脚本入口（兼容）

```bash
pnpm --filter @chips/ecosystem-tester test:ecosystem
```

## 4. 验收标准

1. 命令可连通 Host 并完成 P01-P12 套件执行。
2. 输出包含 Console 摘要、JSON、JUnit 三类报告。
3. 失败用例可定位到 suite/case/error code/traceId。
4. `chips-app-ecosystem-tester` 中 `pnpm test:ecosystem` 可兼容调用 CLI。

## 5. 退出码规范

| 退出码 | 含义 |
| --- | --- |
| `0` | 全部通过 + 质量门禁通过 |
| `2` | 用例失败或门禁阻断 |
| `3` | 基础设施错误（Host/网络/超时） |
| `4` | 配置错误（参数/门禁配置） |

## 6. 常见失败排查

1. `DEV_CONTROL_NETWORK_ERROR`：确认 Host 是否运行、端口是否正确。
2. `SUITE_NOT_FOUND`：检查 `--suite` 参数或 `--discover` 目录。
3. `QUALITY_GATE` 阻断：检查 `chipsd.ecosystem-gate.json` 的 blockingSuites 配置。
4. `No projects matched the filters`：检查包名是否为 `@chips/ecosystem-tester`，Host 使用 `pnpm --dir Chips-Host` 执行门禁。
