# HTML转图片模块技术方案

## 1. 当前仓库基线

本仓已具备模块脚手架骨架，后续实现需替换脚手架示例能力和 schema。

## 2. 正式结构

建议内部结构分为：

- `html-loader`
- `image-capture`
- `option-normalizer`
- `result-writer`

## 3. 输入约束

本仓只接受目录态 HTML：

- `htmlDir`
- `entryFile`
- `outputFile`
- 图片输出参数

## 4. 实现路线

- 在受控 Electron 页面环境中加载 `entryFile`
- 设置截图尺寸和缩放倍率
- 调用页面截图能力
- 输出图片文件

## 5. 测试重点

- HTML 输入存在性测试
- PNG / JPEG / WebP 参数映射测试
- 图片输出成功 / 失败测试
- 与上游 HTML 模块联调测试
