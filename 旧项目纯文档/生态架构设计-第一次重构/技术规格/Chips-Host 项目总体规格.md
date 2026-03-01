# Chips-Host 项目总体规格

**文档版本**：1.0.0  
**编写日期**：2026-02-12  
**阶段归属**：重构阶段一 / 任务 1.1  
**文档性质**：实现前技术规格（开发蓝图）

---

## 0. 输入依据与约束

本规格由以下文档约束共同驱动：

- 架构主文档：
  - `生态架构设计/01-薯片主机架构总览.md`
  - `生态架构设计/07-目录结构与技术选型.md`
  - `生态架构设计/11-架构审核与修正.md`
- 阶段任务文档：
  - `生态架构设计/生态重构开发计划/01-阶段一-薯片主机底层规格设计.md`
- 设计原稿（关键原则）：
  - `生态设计原稿（一切标准）/13-底层内核和打包模式.md`
  - `生态设计原稿（一切标准）/14-开发规范和标准.md`
  - `生态设计原稿（一切标准）/15-中心路由架构原则.md`
  - `生态设计原稿（一切标准）/29-公共基础层设计.md`
  - `生态设计原稿（一切标准）/薯片生态白皮书（综述版）.md`
- 协议与规范：
  - `生态共用/01-薯片协议规范.md`
  - `生态共用/04-系统接口标准.md`
  - `生态共用/07-插件开发规范.md`
  - `生态共用/08-开发规范总则.md`
  - `生态共用/11-多语言系统规范.md`
  - `生态共用/12-依赖管理指南.md`
  - `生态共用/13-生态架构概览.md`
  - `生态共用/仓库管理手册.md`

**强制架构红线（不可违反）**：

1. 中心路由：服务间调用必须走 `kernel.router.invoke(...)`，禁止直接 import 互调
2. Bridge 隔离：插件只能走 `window.chips.*`，渲染进程禁止直接使用 Node/Electron API
3. 零硬编码文本：所有用户可见文案走 i18n
4. 组件零样式：组件逻辑与视觉分离，样式由主题包注入
5. TypeScript strict：默认禁止 `any`

---

## 1. 项目定位

### 1.1 产品角色

`Chips-Host` 是薯片生态中唯一的 Electron 宿主程序，负责：

- 承载六层架构中的第 1~5 层（Electron 宿主、PAL、内核、基础服务、Bridge）
- 为上层所有插件应用提供统一运行容器
- 管理系统集成能力（文件关联、协议、托盘、自启、自动更新）

### 1.2 职责边界

`Chips-Host` 负责：

- 内核通信、服务编排、生命周期管理
- 跨平台能力统一封装（PAL）
- 基础服务（文件/卡片/箱子/资源/配置/主题/i18n 等）
- 插件装载、校验、权限控制、窗口调度

`Chips-Host` 不负责：

- 插件业务 UI 实现（编辑器、查看器、设置面板等）
- 插件内部业务流程细节
- 社区账号体系与云端社区治理逻辑

### 1.3 运行模型

- 单一主进程：运行内核、服务、插件管理、窗口管理
- 多渲染进程：每个应用插件独占 BrowserWindow 渲染进程
- 可选 iframe 子容器：用于卡片/布局渲染组件嵌入

---

## 2. 技术选型确认

### 2.1 版本基线（2026-02-12 版本检查）

版本基线通过 `npm view` 在 2026-02-12 检查，结果如下：

| 项目 | 最新稳定版本（检查日） | 规格采用策略 |
|---|---:|---|
| Electron | 40.4.0 | 锁定 `40.4.x` 补丁窗口 |
| TypeScript | 5.9.3 | 锁定 `5.9.x` |
| Vitest | 4.0.18 | 锁定 `4.0.x` |
| electron-vite | 5.0.0 | 作为主构建工具 |
| electron-builder | 26.7.0 | 作为打包发布工具 |
| pnpm | 10.29.3 | 根仓库固定 `packageManager: pnpm@10.29.3` |

开发机 Node.js 版本基线：

- 建议使用 Node.js LTS（2026-02 时点为 v24 LTS）
- 允许范围：`>=24.0.0 <25`（CI 与本地一致）

### 2.2 构建工具评估：electron-vite vs electron-forge

| 维度 | electron-vite | electron-forge |
|---|---|---|
| 主/预加载/渲染构建 | 原生针对 Vite 多入口，配置清晰 | 需依赖插件体系（Vite 插件） |
| 开发体验 | 启动快，HMR 快，TS 体验统一 | 生命周期完整，但 Vite 链路复杂度更高 |
| 打包发布 | 通常搭配 electron-builder | 内建 package/make/publish 体系 |
| 风险面 | 需自行维护打包流水线规范 | Vite 路线仍需关注官方插件成熟度（当前文档标注 experimental） |
| 与生态一致性 | 与官方插件（Vue + Vite）一致 | 可用，但链路不如 electron-vite 直观 |

**结论**：采用 `electron-vite + electron-builder` 组合。

理由：

1. 与生态中插件开发栈（Vite）一致，迁移与联调成本最低
2. 主进程/预加载/渲染进程统一走 Vite 思维模型，工程认知负担更小
3. 打包发布阶段交由 electron-builder，满足多平台产物与自动更新需求

### 2.3 语言与测试

- 语言：TypeScript（strict 全开）
- 测试：Vitest（单元 + 集成）
- 覆盖要求：核心模块覆盖率 `>= 80%`

---

## 3. 目录结构规范

> 目标：让新开发者按目录即可理解职责；每个目录只做一件事。

### 3.1 顶层目录

```text
Chips-Host/
├── docs/
│   ├── specs/
│   ├── adr/
│   └── runbooks/
├── scripts/
├── config/
├── resources/
├── src/
│   ├── main/
│   ├── preload/
│   └── shared/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vitest.config.ts
├── electron.vite.config.ts
├── electron-builder.yml
├── .eslintrc.cjs
└── .prettierrc
```

### 3.2 `src/main/` 规范目录树

```text
src/main/
├── main.ts
├── bootstrap/
│   ├── app-bootstrap.ts
│   ├── service-bootstrap.ts
│   └── plugin-bootstrap.ts
├── kernel/
│   ├── index.ts
│   ├── router.ts
│   ├── registry.ts
│   ├── event-bus.ts
│   ├── lifecycle.ts
│   ├── types.ts
│   └── constants.ts
├── pal/
│   ├── index.ts
│   ├── platform-manager.ts
│   ├── adapters/
│   │   ├── filesystem/
│   │   ├── window/
│   │   ├── notification/
│   │   ├── clipboard/
│   │   ├── shell/
│   │   ├── appearance/
│   │   ├── auto-launch/
│   │   ├── file-association/
│   │   ├── protocol/
│   │   ├── tray/
│   │   ├── shortcut/
│   │   ├── screen/
│   │   └── power/
│   └── types.ts
├── services/
│   ├── file/
│   ├── card/
│   ├── box/
│   ├── resource/
│   ├── zip/
│   ├── config/
│   ├── theme/
│   ├── i18n/
│   ├── credential/
│   ├── log/
│   ├── tag/
│   ├── serializer/
│   ├── platform/
│   └── module/
├── plugin/
│   ├── plugin-manager.ts
│   ├── plugin-registry.ts
│   ├── plugin-installer.ts
│   ├── plugin-validator.ts
│   └── types.ts
├── window/
│   ├── window-manager.ts
│   ├── window-state.ts
│   └── types.ts
├── ipc/
│   ├── ipc-router.ts
│   ├── permission-checker.ts
│   └── types.ts
├── system/
│   ├── file-association.ts
│   ├── protocol-handler.ts
│   ├── tray-manager.ts
│   ├── auto-launch.ts
│   └── auto-updater.ts
├── security/
│   ├── csp.ts
│   ├── navigation-guard.ts
│   ├── permission-guard.ts
│   └── origin-validator.ts
└── utils/
    ├── path-utils.ts
    ├── error-utils.ts
    └── async-utils.ts
```

### 3.3 目录职责说明

| 目录 | 职责 |
|---|---|
| `kernel/` | 路由、注册、事件、生命周期核心，不含业务逻辑 |
| `pal/` | 平台能力抽象与适配，禁止上层直接访问平台差异 API |
| `services/` | 14 类核心服务实现，统一由路由器对外暴露 |
| `plugin/` | 插件发现、安装、校验、清单管理 |
| `window/` | BrowserWindow 生命周期与窗口状态管理 |
| `ipc/` | Bridge 到内核的 IPC 调用收敛层 |
| `system/` | OS 级集成能力（托盘、协议、文件关联、更新） |
| `security/` | WebContents 安全策略与权限边界 |

### 3.4 命名与组织规则

- 文件名：kebab-case（如 `file-service.ts`）
- 组件名（插件侧）：PascalCase
- 类型文件：`types.ts`
- 常量文件：`constants.ts`
- 测试文件：`*.test.ts`
- 每个文件只导出一个主要类/函数

---

## 4. Electron 配置规范

### 4.1 主进程入口规范

`src/main/main.ts` 的固定启动顺序：

1. 读取环境配置与日志系统初始化
2. 初始化 PAL（平台能力就绪）
3. 初始化内核（router/registry/event-bus/lifecycle）
4. 注册核心服务路由
5. 初始化插件管理器与窗口管理器
6. 注册系统集成能力（协议、文件关联、托盘、自启）
7. 启动第一个应用窗口（或进入后台托盘模式）

### 4.2 BrowserWindow 默认模板

```ts
const windowDefaults: BrowserWindowConstructorOptions = {
  width: 1280,
  height: 800,
  minWidth: 960,
  minHeight: 640,
  show: false,
  autoHideMenuBar: true,
  backgroundColor: '#111111',
  webPreferences: {
    preload: preloadPath,
    contextIsolation: true,
    sandbox: true,
    nodeIntegration: false,
    webSecurity: true,
    allowRunningInsecureContent: false,
    spellcheck: false
  }
};
```

窗口初始化策略：

- `ready-to-show` 后再 `show()`，避免白屏闪烁
- 禁止任意导航到非白名单域名
- 禁止插件直接创建无约束新窗口，统一走窗口管理器审批

### 4.3 安全策略

#### 4.3.1 渲染进程隔离

- 强制开启：`contextIsolation`, `sandbox`, `webSecurity`
- 强制关闭：`nodeIntegration`, `enableRemoteModule`
- 插件访问系统能力只能走 `window.chips.*`

#### 4.3.2 CSP 基线

插件页面 CSP 默认模板（可按插件能力收窄）：

```text
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
font-src 'self' data:;
connect-src 'self' https:;
frame-ancestors 'none';
object-src 'none';
base-uri 'none';
```

#### 4.3.3 IPC 与权限

- 每个 IPC 请求必须校验来源窗口、插件 ID、权限声明
- 所有外部输入参数必须先做 schema 验证（Zod）
- 标准错误结构统一：

```ts
{ code: 'ERROR_CODE', message: '人类可读描述', details?: unknown }
```

### 4.4 打包配置（electron-builder）

`electron-builder.yml` 规范：

- `appId`: `com.chips.host`
- `productName`: `Chips Host`
- `files`: 仅包含构建产物与必要资源
- `asar`: 默认开启；需运行时解压资源使用 `asarUnpack`
- 平台目标：
  - Windows: `nsis`
  - macOS: `dmg`
  - Linux: `AppImage`（可扩展 `deb`）
- 发布渠道：`stable` 与 `beta` 双通道

---

## 5. 依赖管理规范

### 5.1 主进程依赖白名单（类别）

允许依赖类型：

1. Electron 官方 API
2. Node.js 内置模块（`fs`, `path`, `crypto`, `stream`, `worker_threads` 等）
3. 数据与校验：`zod`, `js-yaml`
4. 日志：`pino`
5. 打包与压缩：`jszip`（必要时补充高性能组合）
6. ID 生成：`nanoid`（62 进制字符集）

### 5.2 禁止依赖

主进程中禁止：

- 前端 UI 框架（Vue/React/Svelte）
- DOM 操作库
- 仅浏览器环境可用的工具链依赖
- 未经评估的新三方库

插件侧禁止：

- `require('fs')`, `require('path')` 等 Node 模块
- 直接使用 Electron API

### 5.3 版本锁定策略

- 锁文件：`pnpm-lock.yaml` 作为唯一依赖解析基准
- workspace 依赖：统一使用 `workspace:*`
- 生产依赖：锁定到明确版本，不使用宽泛浮动主版本
- 安全治理：每周审计 `pnpm audit`，每月升级窗口

### 5.4 许可证与合规

- 仅允许 MIT / ISC / Apache-2.0 / BSD 等宽松许可证
- 新增依赖前需记录许可证与维护活跃度
- 禁止引入与生态许可策略冲突的依赖

---

## 6. 构建与发布流程

### 6.1 开发模式流程

```bash
# 1) 安装依赖
pnpm install

# 2) 启动主机开发模式
pnpm dev

# 3) (可选) 启动插件开发服务器
# 由插件仓库各自执行 pnpm dev
# 主机以开发插件 URL 加载
```

开发态要求：

- 主进程支持热重启
- 预加载脚本变更即时生效
- 渲染进程支持 HMR（插件开发态）

### 6.2 生产构建流程

```bash
# 1) 类型检查
pnpm typecheck

# 2) 单元测试
pnpm test

# 3) 生产构建
pnpm build

# 4) 打包
pnpm package
```

### 6.3 多平台打包策略

- Windows、macOS、Linux 分平台构建
- 推荐在对应平台原生 runner 构建与签名
- 产物命名规范：`chips-host-{version}-{platform}-{arch}.{ext}`

### 6.4 自动更新机制设计

采用 `electron-builder + electron-updater`：

1. 启动后延迟检查更新（避免阻塞首屏）
2. 仅在空闲窗口下载更新包
3. 下载完成后提示重启安装（用户可延后）
4. 保留最近一个稳定版本回滚入口

渠道策略：

- `stable`: 默认用户通道
- `beta`: 内测用户通道

风险控制：

- 更新包签名校验失败立即中断
- 更新失败不影响当前版本启动
- Linux 发行版差异下可降级为“通知用户手动更新”

---

## 7. 编码规范

### 7.1 TypeScript strict 基线

`tsconfig` 强制项：

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "useUnknownInCatchVariables": true,
    "exactOptionalPropertyTypes": true
  }
}
```

约束：

- 默认禁止 `any`
- 必要例外需带注释说明原因与移除计划（临时例外）

### 7.2 ESLint / Prettier 规范

ESLint 必开规则：

- `@typescript-eslint/no-explicit-any`
- `@typescript-eslint/no-floating-promises`
- `@typescript-eslint/consistent-type-imports`
- `no-restricted-imports`（限制跨层直接调用）

Prettier：统一格式化，不承载架构语义规则。

### 7.3 提交规范

- 采用 Conventional Commits：`feat|fix|docs|refactor|test|chore`
- 每次提交只包含单一逻辑改动
- 严禁把“格式化全量改动”与“功能改动”混在同一提交

### 7.4 分支管理策略

按子仓库独立执行：

1. 从目标子仓库 `develop` 拉取最新
2. 创建任务分支：`feature/<scope>`
3. 完成后 PR 合并回 `develop`
4. 通过 CI 后再进入发布流程

### 7.5 服务注册模式（统一模板）

所有基础服务使用统一模式实现并注册到内核路由：

```ts
class XxxService implements Service {
  async initialize(): Promise<void> {
    // 初始化
  }

  registerRoutes(kernel: Kernel): void {
    kernel.router.register('xxx', 'action1', this.handleAction1.bind(this));
    kernel.router.register('xxx', 'action2', this.handleAction2.bind(this));
  }

  private async handleAction1(params: Action1Params): Promise<Action1Result> {
    // 业务实现
  }
}
```

### 7.6 异步错误处理约束

- 所有对外 `async` 路由处理函数必须显式捕获错误并标准化输出
- 对外统一错误结构：`{ code, message, details? }`
- 禁止直接透出原始异常堆栈给渲染进程（仅写入日志系统）

---

## 8. 与架构原则的映射检查

| 架构原则 | 在本规格中的落地 |
|---|---|
| 中心路由 | 目录与代码组织强制服务经 `kernel.router.invoke` 互调 |
| Bridge 隔离 | BrowserWindow 与 IPC 规范明确渲染进程禁用 Node/Electron 直连 |
| 底层厚上层薄 | 基础服务与模块加载职责固定在主机层 |
| 平台无关 | PAL 独立目录，主服务禁止直接写平台分支逻辑 |
| 一切皆插件 | 插件管理器与五类插件运行模型纳入主机职责 |
| 无头组件 | 规格中保持“主机不承载视觉组件实现”边界 |

---

## 9. 验收清单（任务 1.1）

- [x] 项目定位明确，边界清晰
- [x] 技术选型完成，含对比与决策理由
- [x] `src/main/` 完整目录树与职责说明给出
- [x] Electron 主进程、BrowserWindow、安全策略、打包配置给出
- [x] 依赖白名单与禁止项给出
- [x] 构建、发布、多平台、自动更新流程给出
- [x] TS strict、Lint/Format、提交与分支策略给出
