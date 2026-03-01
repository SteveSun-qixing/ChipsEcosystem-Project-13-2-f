# .cpk 打包和发布

`.cpk`（Chips Plugin Package）是薯片插件的标准打包格式，用于分发和安装插件。

##  .cpk 文件结构

`.cpk` 文件本质上是一个 ZIP 压缩包，包含以下内容：

```
my-plugin-1.0.0.cpk
├── manifest.yaml          # 插件清单（必需）
├── dist/                   # 构建产物
│   └── index.html
├── locales/                # 多语言文件
│   ├── zh-CN/
│   │   └── vocabulary.yaml
│   └── en-US/
│       └── vocabulary.yaml
├── assets/                 # 静态资源
│   └── icon.png
└── signature.json          # 签名文件（可选）
```

##  使用 CLI 打包

### 构建项目

```bash
# 构建生产版本
chipsd build

# 构建并监听变化（开发模式）
chipsd build --watch
```

### 打包为 .cpk

```bash
# 打包插件
chipsd pack

# 指定输出目录
chipsd pack --output ./releases

# 指定版本号（覆盖 manifest 中的版本）
chipsd pack --version 1.0.1
```

### 验证插件包

```bash
# 验证 .cpk 文件
chipsd validate ./my-plugin-1.0.0.cpk

# 详细验证输出
chipsd validate ./my-plugin-1.0.0.cpk --verbose
```

验证内容包括：
- manifest.yaml 格式和必需字段
- 入口文件存在性
- 多语言文件完整性
- 权限声明有效性
- 文件大小限制

##  手动打包

如果需要手动打包，按以下步骤操作：

```bash
# 1. 构建项目
pnpm build

# 2. 创建临时目录
mkdir -p .cpk-temp

# 3. 复制必需文件
cp manifest.yaml .cpk-temp/
cp -r dist .cpk-temp/
cp -r locales .cpk-temp/
cp -r assets .cpk-temp/

# 4. 创建 ZIP 包
cd .cpk-temp
zip -r ../my-plugin-1.0.0.cpk .
cd ..

# 5. 清理临时目录
rm -rf .cpk-temp
```

##  签名（可选）

官方插件需要签名才能获得更高的信任级别：

```bash
# 生成签名
chipsd sign ./my-plugin-1.0.0.cpk --key ./private-key.pem

# 验证签名
chipsd verify ./my-plugin-1.0.0.cpk
```

签名后的 `.cpk` 文件会包含 `signature.json`：

```json
{
  "algorithm": "RSA-SHA256",
  "signature": "base64-encoded-signature",
  "publicKey": "base64-encoded-public-key",
  "timestamp": "2026-02-13T10:00:00Z"
}
```

##  发布到插件市场

### 准备发布

1. 确保 `manifest.yaml` 信息完整
2. 准备插件图标（256x256 PNG）
3. 准备插件截图（最多 5 张）
4. 编写插件描述和更新日志

### 发布命令

```bash
# 登录开发者账号
chipsd login

# 发布插件
chipsd publish ./my-plugin-1.0.0.cpk

# 发布并设置为公开
chipsd publish ./my-plugin-1.0.0.cpk --public

# 发布测试版本
chipsd publish ./my-plugin-1.0.0.cpk --channel beta
```

### 更新插件

```bash
# 更新已发布的插件
chipsd publish ./my-plugin-1.0.1.cpk --update

# 查看发布状态
chipsd status my-publisher.my-plugin
```

##  本地安装测试

在发布前，可以在本地安装测试：

```bash
# 安装本地 .cpk 文件
chipsd install ./my-plugin-1.0.0.cpk

# 卸载插件
chipsd uninstall my-publisher.my-plugin

# 列出已安装插件
chipsd list
```

##  版本管理

### 版本号规范

遵循语义化版本（Semantic Versioning）：

- `MAJOR.MINOR.PATCH`
- `MAJOR`：不兼容的 API 变更
- `MINOR`：向后兼容的功能新增
- `PATCH`：向后兼容的问题修复

### 版本更新流程

```bash
# 1. 更新 manifest.yaml 中的版本号
# 2. 更新 CHANGELOG.md
# 3. 构建和打包
chipsd build && chipsd pack

# 4. 验证
chipsd validate ./my-plugin-1.0.1.cpk

# 5. 发布
chipsd publish ./my-plugin-1.0.1.cpk --update
```

##  CI/CD 集成

### GitHub Actions 示例

```yaml
name: Build and Publish Plugin

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install

      - name: Build
        run: pnpm build

      - name: Pack
        run: chipsd pack

      - name: Validate
        run: chipsd validate ./*.cpk

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: plugin-package
          path: '*.cpk'

      - name: Publish
        if: startsWith(github.ref, 'refs/tags/v')
        run: chipsd publish ./*.cpk --update
        env:
          CHIPS_TOKEN: ${{ secrets.CHIPS_TOKEN }}
```

##  常见问题

### 打包失败

```bash
# 检查 manifest.yaml 格式
chipsd validate-manifest ./manifest.yaml

# 检查构建产物
ls -la dist/
```

### 安装失败

```bash
# 查看详细错误信息
chipsd install ./my-plugin-1.0.0.cpk --verbose

# 检查兼容性
chipsd check-compatibility ./my-plugin-1.0.0.cpk
```

### 签名验证失败

```bash
# 重新签名
chipsd sign ./my-plugin-1.0.0.cpk --key ./private-key.pem --force
```

---
