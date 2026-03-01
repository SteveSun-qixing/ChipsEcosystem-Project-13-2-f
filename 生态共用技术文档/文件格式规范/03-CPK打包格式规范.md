# CPK打包格式规范

## 格式概述

CPK是插件包的统一格式，采用ZIP压缩格式，扩展名为cpk。CPK文件本质是ZIP压缩包，包含插件的所有代码、资源和配置文件。

## 压缩设置

压缩采用STORE模式，即零压缩率存储模式。这种方式不进行实际压缩，以获得最快的解压速度，符合薯片生态的性能要求。

## 目录结构

CPK文件内部包含标准目录结构。根目录包含manifest.yaml清单文件，这是必需的配置文件。代码目录通常命名为dist或build，包含编译后的JavaScript代码。资源目录包含图片、字体等静态资源。不同类型插件的目录结构略有差异。

### 各类插件标准目录结构

```
# 应用插件 (app)
app/
├── manifest.yaml
├── dist/
│   └── index.html
├── assets/
└── preview/

# 卡片插件 (card)
card/
├── manifest.yaml
├── dist/
│   └── renderer.js
├── assets/
└── preview/

# 布局插件 (layout)
layout/
├── manifest.yaml
├── dist/
│   └── index.js
├── assets/
└── preview/

# 模块插件 (module)
module/
├── manifest.yaml
├── dist/
│   └── index.js
├── assets/
└── preview/

# 主题插件 (theme)
theme/
├── manifest.yaml
├── tokens/
│   ├── ref.json
│   ├── sys.json
│   ├── comp.json
│   ├── motion.json
│   └── layout.json
├── components/
│   ├── button.css
│   ├── input.css
│   └── ...
├── motions/
│   └── ...
├── icons/
│   └── ...
├── contracts/
│   └── theme-interface.contract.json
├── global.css
├── preview/
│   └── thumbnail.png
└── manifest.yaml
```

### 主题插件结构说明

根据架构手册第11.5节，主题包必须包含以下标准结构：

- **manifest.yaml**：主题元数据，包含id、name、version、publisher等
- **tokens/*.json**：token定义文件（五层架构：ref/sys/comp/motion/layout）
- **components/*.css**：组件样式文件
- **motions/*.css**：动效定义文件
- **icons/**：图标资源目录
- **contracts/theme-interface.contract.json**：主题契约文件，用于校验主题接口点完整性
- **global.css**：全局样式
- **preview/**：主题预览资源

> 注意：一个主题包仅承载一种外观，不在包内区分白天/夜间、light/dark 或其他模式标签；外观切换通过切换 `themeId` 到另一个主题包完成。

## manifest.yaml规范

清单文件是插件的入口配置，包含以下字段：

必填字段包括：id是唯一标识符，使用反向域名格式如com.example.my-plugin，name是显示名称，version遵循语义化版本规范，type标识插件类型（app、card、layout、module、theme），entry指定入口文件路径。

可选字段包括：author作者信息，description功能描述，icon图标文件路径，homepage项目主页，license开源许可证，keywords关键词数组，screenshots截图数组。

依赖字段声明插件依赖。dependencies对象列出依赖的模块和版本范围，peerDependencies列出对宿主环境的依赖。

权限字段声明插件需要的系统能力。permissions数组列出权限名称，如file-access、network-request、clipboard-access等。

## 插件类型

应用插件type字段为app，入口文件是HTML文件。卡片插件type字段为card，入口文件是渲染组件代码。布局插件type字段为layout，入口文件是布局算法代码。模块插件type字段为module，入口文件是模块代码。主题插件type字段为theme，入口文件是CSS文件。

## 打包工具

系统提供CPK打包工具CLI命令。chips pack命令将指定目录打包为cpk文件。chips unpack命令解压cpk文件。chips validate命令验证cpk文件结构完整性。

## 签名机制

为了确保插件来源可信，CPK支持数字签名。开发者使用私钥对插件包进行签名。系统使用公钥验证签名有效性。未签名或签名无效的插件可能不被允许安装。

## 安全限制

CPK包内的代码运行在受限环境中。不能访问文件系统超出插件目录，不能发起任意网络请求，不能加载任意模块。违反安全限制的代码会被阻止执行。

## 热插拔支持

CPK设计支持热插拔。插件可以在不重启软件的情况下安装、更新和卸载。

### 热插拔技术要求

根据架构手册热更新架构设计，CPK文件必须满足以下热插拔要求：

1. **文件锁定规避**：避免使用独占文件锁，使用原子写入或临时文件机制
2. **增量更新支持**：支持差异包更新，减少传输和加载时间
3. **版本兼容声明**：manifest中声明兼容的宿主版本范围
4. **无状态启动**：插件初始化不依赖上次运行的持久化状态
5. **资源隔离**：临时资源存储在独立目录，卸载时完整清理

### 热插拔流水线

1. 下载新版本CPK到临时目录
2. 验证CPK签名和完整性
3. 停止旧版本插件（触发unload生命周期）
4. 加载新版本插件（触发load生命周期）
5. 验证新版本功能正常
6. 清理旧版本临时文件

## 大小限制

单个CPK文件建议不超过100MB。过大的插件包会影响加载速度和磁盘空间。大型资源应考虑外部引用方式。

## 版本兼容性

manifest中的版本字段遵循语义化版本规范。主版本变化通常表示不兼容，需要宿主软件对应版本。次版本变化表示新功能，向后兼容。修订号变化表示问题修复，完全向后兼容。

## 主题契约门禁

根据架构手册第11.7节，主题包必须通过主题契约门禁校验：

### 校验项目

1. **token完整性校验**：检查 tokens/ 目录下是否包含完整的五层token（ref/sys/comp/motion/layout），无缺失无冗余
2. **组件接口点校验**：验证 components/ 中的样式文件是否覆盖了 `data-scope/data-part` 声明的所有接口点
3. **动效参数安全校验**：验证 motions/ 中的动效参数是否符合安全阈值（最大时长、曲线白名单）
4. **颜色对比度校验**：验证主题配色是否符合文本可读性标准（WCAG 2.1 AA级）

### 契约校验工具

系统提供主题契约校验CLI命令：
- `chips theme validate <theme-cpk>`：执行完整校验流程
- `chips theme validate --tokens <theme-dir>`：仅校验token完整性
- `chips theme validate --components <theme-dir>`：仅校验组件接口点

### 校验失败处理

校验失败的主题包将被拒绝安装，系统返回详细错误报告，包含：
- 缺失的token/组件/接口点
- 不符合安全阈值的动效参数
- 不符合对比度要求的颜色值