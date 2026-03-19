# HTML转PDF模块技术方案

## 1. 当前仓库基线

本仓已具备模块脚手架骨架，后续实现需替换脚手架示例能力和 schema。

## 2. 正式结构

建议内部结构分为：

- `html-loader`
- `pdf-renderer`
- `option-normalizer`
- `result-writer`

## 3. 输入约束

本仓只接受目录态 HTML：

- `htmlDir`
- `entryFile`
- `outputFile`
- PDF 页面参数

## 4. 实现路线

- 在受控 Electron 页面环境中加载 `entryFile`
- 等待页面稳定
- 调用 PDF 输出能力
- 返回结果与警告

## 5. 测试重点

- HTML 输入存在性测试
- 参数映射测试
- PDF 输出成功 / 失败测试
- 与上游 HTML 模块联调测试
