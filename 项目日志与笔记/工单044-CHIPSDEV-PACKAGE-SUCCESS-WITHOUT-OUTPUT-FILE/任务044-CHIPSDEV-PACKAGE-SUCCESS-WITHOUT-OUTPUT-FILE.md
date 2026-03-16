# 任务044-CHIPSDEV-PACKAGE-SUCCESS-WITHOUT-OUTPUT-FILE

- 日期：2026-03-15
- 发现阶段：`image-BCP` 正式打包安装联调
- 问题类型：开发工具链回归 / 打包产物落盘异常

## 问题描述

当前任务要求使用正式 `chipsdev` 工具链重新打包并安装图片基础卡片插件：

1. 在 `/Users/sevenstars/Documents/ChipsCard/Develop/Project-13-2-f/Chips-BaseCardPlugin/image-BCP` 中执行 `../../node_modules/.bin/chipsdev build`
2. 执行 `../../node_modules/.bin/chipsdev validate`
3. 执行 `../../node_modules/.bin/chipsdev package`
4. 执行 `chipsdev plugin install <cpk路径>` 或 `chips plugin install <cpk路径>`

其中前 3 步的实际结果为：

- `chipsdev build` 成功，输出 `dist/index.mjs`
- `chipsdev validate` 成功，返回：

```json
{
  "ok": true,
  "errors": [],
  "summary": {
    "manifest": "chips.basecard.image",
    "version": "0.1.0",
    "type": "card",
    "outDir": "./dist"
  }
}
```

- `chipsdev package` 返回：

```json
{
  "message": "打包成功",
  "output": "/Users/sevenstars/Documents/ChipsCard/Develop/Project-13-2-f/Chips-BaseCardPlugin/image-BCP/dist/chips.basecard.image-0.1.0.cpk"
}
```

但随后实际检查 `dist/`：

```text
total 1608
drwxr-xr-x@  3 sevenstars  staff      96 Mar 15 09:51 .
drwxr-xr-x@ 19 sevenstars  staff     608 Mar 15 00:20 ..
-rw-r--r--@  1 sevenstars  staff  821914 Mar 15 09:51 index.mjs
```

没有任何 `.cpk` 文件落盘。

继续执行安装：

```bash
../../node_modules/.bin/chipsdev plugin install /Users/.../dist/chips.basecard.image-0.1.0.cpk
../../node_modules/.bin/chips plugin install /Users/.../dist/chips.basecard.image-0.1.0.cpk
```

都返回：

```json
{
  "error": "Plugin source not found: /Users/.../dist/chips.basecard.image-0.1.0.cpk",
  "code": "PLUGIN_SOURCE_NOT_FOUND"
}
```

说明当前 `chipsdev package` 出现了“返回成功但没有真实产物文件”的回归。

## 影响范围

- 当前 `image-BCP` 无法按正式要求完成“重新打包并安装”；
- 所有依赖 `chipsdev package` 作为 `.cpk` 正式产物入口的插件工程都可能无法完成后续安装；
- 由于任务明确禁止临时方案，当前不能使用手工 zip 或其他非正式打包方式替代。

## 复现步骤

1. 进入 `Chips-BaseCardPlugin/image-BCP`
2. 执行 `../../node_modules/.bin/chipsdev build`
3. 执行 `../../node_modules/.bin/chipsdev validate`
4. 执行 `../../node_modules/.bin/chipsdev package`
5. 检查 `dist/`，确认没有 `.cpk` 文件
6. 执行 `chipsdev plugin install <package输出路径>` 或 `chips plugin install <package输出路径>`，确认失败

## 期望行为

- `chipsdev package` 返回成功时，必须真实在返回路径生成 `.cpk` 文件；
- `chipsdev plugin install` 与 `chips plugin install` 应可直接消费该产物；
- CLI 返回结果与实际文件系统状态必须一致。

## 初步判断

- `node_modules/chips-sdk/cli/index.js` 中 `handlePackage()` 的实现按代码逻辑应执行 `zipDirectoryToCpk(...)` 并在完成后输出成功日志；
- 当前现象表明：
  - 要么打包写文件阶段存在未被正确传播的异常；
  - 要么成功日志输出与实际文件落盘时序存在错误；
  - 要么后续又有流程把产物删除，但 CLI 没有同步反映。

需要工具链维护方进一步检查 `chipsdev package` 的真实执行链路与文件写入行为。

## 复核进展

2026-03-15 再次在同一项目目录执行正式链路核验：

1. 执行 `../../node_modules/.bin/chipsdev package`
2. 实际检查 `dist/`，已真实生成：

```text
/Users/sevenstars/Documents/ChipsCard/Develop/Project-13-2-f/Chips-BaseCardPlugin/image-BCP/dist/chips.basecard.image-0.1.0.cpk
```

3. 检查包内容，确认为正式 `.cpk`，包含：

```text
manifest.yaml
dist/index.mjs
```

4. 执行：

```bash
../../node_modules/.bin/chipsdev plugin install /Users/sevenstars/Documents/ChipsCard/Develop/Project-13-2-f/Chips-BaseCardPlugin/image-BCP/dist/chips.basecard.image-0.1.0.cpk
chips plugin install /Users/sevenstars/Documents/ChipsCard/Develop/Project-13-2-f/Chips-BaseCardPlugin/image-BCP/dist/chips.basecard.image-0.1.0.cpk
```

两条命令都返回：

```json
{
  "pluginId": "chips.basecard.image"
}
```

## 当前判断

- 当前正式打包和正式安装链路已经恢复正常；
- `manifest.yaml`、`dist/index.mjs`、`chipsdev validate` 和 CLI `handlePackage()` 逻辑均无明显项目级配置错误；
- 原始失败的直接原因仍然是“安装时 `.cpk` 文件不存在”，但该现象当前已无法复现；
- 因现阶段无法稳定复现，暂不能把根因定性为固定代码缺陷，更接近一次瞬时工具链异常、命令执行时序异常，或当时的文件系统落盘状态异常。

## 暂行处理

- 保留工单记录，后续若再次出现“CLI 返回成功但 `.cpk` 未落盘”的现象，再补充更细的命令日志和文件系统观测；
- 当前可继续按正式流程执行打包与安装，不需要使用任何临时方案。

## 状态

- 复核中 / 当前暂不复现
