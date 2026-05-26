# 工单110：macOS 安装器 Payload 元数据治理日志

日期：2026-05-26

## 背景

任务055阶段4真实构建 Host macOS 安装器后，`.pkg` 产物可以生成，但 `pkgutil --payload-files` 显示 payload 中存在大量 `._*` AppleDouble 元数据文件。这会污染正式发布包结构，不符合安装器产物洁净度要求。

## 完成内容

1. 登记工单110，并创建独立工单说明。
2. 调整 Host macOS 安装器命令执行封装，支持调用级环境变量叠加。
3. 为 `pkgbuild` 与两次 `productbuild` 调用注入 `COPYFILE_DISABLE=1` 作为辅助约束。
4. 在 component pkg 生成后展开 `Payload`，用 `cpio` 还原 payload 内容并重新生成 gzip payload 与 BOM，移除 `._*`、`.DS_Store`、`CodeResources` 等复制元数据。
5. 将最终 product archive 整理改为普通 `pkgutil --expand/--flatten`，避免深度展开组件包后重新污染 payload。
6. 补充安装器单测，断言打包命令环境变量，并增加真实 macOS `.pkg` 净化测试。

## 验证

通过：

```bash
cd Chips-Host
npm test -- --run tests/unit/macos-installer.test.ts
npm run build
npm run build:installer:macos -- --output=../release-artifacts/task055-stage4-macos-installer-20260526-clean
pkgutil --payload-files ../release-artifacts/task055-stage4-macos-installer-20260526-clean/Chips-Host-0.1.0-macos.pkg | rg '/\._|^\._|/\.DS_Store|CodeResources'
```

结果：

- 安装器单测 7 条通过。
- Host TypeScript 构建通过。
- 真实 clean 安装器产物生成成功。
- `.pkg` payload 元数据检查无输出。
- `Info.plist` 仍包含 `.card` 与图片查看器文件关联。
- 内置插件仍包含默认主题、生态设置面板和图片查看器。

## 结论

工单110已解决。Host macOS 安装器会在 component pkg 阶段净化 payload 与 BOM，真实 `.pkg` 发布产物不再混入 AppleDouble 元数据文件。
