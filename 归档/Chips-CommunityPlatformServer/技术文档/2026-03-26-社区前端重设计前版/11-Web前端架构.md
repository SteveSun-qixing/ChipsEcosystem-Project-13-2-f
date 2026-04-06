# Web前端架构

## 1. 技术栈

当前前台采用：

- React
- React Router
- TypeScript
- 原生 `fetch` / `XMLHttpRequest` 封装的 API 客户端
- 按页面与组件拆分的 CSS 文件
- 项目内置主题变量与多语言字典

## 2. 应用入口

- `packages/web/src/main.tsx`
- `packages/web/src/App.tsx`

应用顶层装配顺序：

1. `BrowserRouter`
2. `AppPreferencesProvider`
3. `AuthProvider`
4. `GlobalLayout`

## 3. 路由结构

当前前台页面包括：

- `/`：首页
- `/login`：登录
- `/register`：注册
- `/cards/:cardId`：卡片详情中转页
- `/boxes/:boxId`：箱子详情页
- `/@:username`：用户空间
- `/@:username/rooms/:roomSlug`：房间页
- `/dashboard/*`：工作台（受保护）
- `/upload`：上传中心（受保护）

## 4. 认证模型

### 4.1 `AuthContext`

职责：

- 保存当前用户资料
- 提供 `login / register / logout / refreshUser`
- 启动时通过 `/api/v1/auth/refresh` 尝试恢复会话

### 4.2 access token 与 refresh token

前台当前采用：

- `accessToken`：保存在内存变量中
- `refreshToken`：由服务端写入 HttpOnly Cookie

`api/client.ts` 会在请求返回 401 时自动尝试刷新 access token。

## 5. 偏好设置模型

### 5.1 `AppPreferencesContext`

职责：

- 多语言字典访问
- 日期 / 数字格式化
- 主题切换
- locale / theme 持久化到 `localStorage`

### 5.2 当前支持的 locale

- `zh-CN`
- `en-US`

### 5.3 当前支持的主题

- `chips-community.midnight`
- `chips-community.paper`

### 5.4 主题载体

主题通过 `document.documentElement.dataset.chipsThemeId` 与 `tokens.css` 中的 CSS 变量驱动。

## 6. API 分层

### 6.1 `api/client.ts`

负责：

- 统一请求头
- 自动附带 `Authorization`
- 401 后自动刷新 token
- 统一错误对象 `ApiRequestError`
- 普通 JSON 请求与上传请求封装

### 6.2 `api/auth.ts`

负责：

- 登录
- 注册
- 登出
- 当前用户资料
- 更新资料
- 修改密码
- 上传头像
- 获取公开用户资料

### 6.3 `api/rooms.ts`

负责：

- 房间 CRUD
- 房间封面上传
- 用户房间列表
- 房间详情
- 房间内容列表
- 用户空间聚合数据

### 6.4 `api/content.ts`

负责：

- 卡片上传、状态查询、详情、修改、删除
- 箱子上传、详情、修改、删除
- 发现页与搜索

## 7. 页面实现重点

### 7.1 首页 `HomePage`

职责：

- 拉取最新公开卡片与箱子
- 承担站点搜索入口
- 展示基础使用流程
- 根据登录态给出上传或进入空间入口

### 7.2 登录 / 注册页

特点：

- 前端先做最基础输入校验
- 成功后由 `AuthContext` 建立登录态
- 登录成功默认跳回来源页或工作台

### 7.3 上传页 `CardUploadPage`

当前设计：

- 同页切换卡片 / 箱子上传模式
- 先加载当前用户房间列表作为目标房间选项
- 卡片上传走进度条 + 状态轮询
- 箱子上传完成后直接提供详情入口

### 7.4 工作台 `DashboardPage`

当前工作台聚合：

- 当前用户房间列表
- 当前用户卡片列表
- 当前用户箱子列表
- 个人资料编辑
- 头像上传
- 新建房间
- 删除房间 / 卡片 / 箱子

### 7.5 空间页 `SpacePage`

当前空间页展示：

- 用户公开资料
- 房间网格
- 根目录箱子
- 根目录卡片
- 若访问者是本人，则展示管理入口

### 7.6 房间页 `RoomPage`

当前房间页展示：

- 房间基础信息
- 卡片网格
- 箱子网格
- 作者空间入口

### 7.7 卡片详情页 `CardDetailPage`

这是一个“中转页”而不是完整查看器页面。

行为：

1. 拉取卡片详情
2. 若 `status = ready` 且 `htmlUrl` 存在
3. 直接 `window.location.replace(htmlUrl)`

因此平台不再在卡片 HTML 外层再套壳。

### 7.8 箱子详情页 `BoxDetailPage`

当前展示：

- 箱子基础摘要
- 引用卡片列表
- 社区卡片跳转入口或原始源链接

## 8. 全局导航

`GlobalNav` 当前承担：

- 品牌入口
- 首页 / 上传 / 工作台导航
- 语言切换
- 主题切换
- 当前用户身份展示
- 管理员后台入口
- 登录 / 注册 / 退出

## 9. 样式系统

当前前台样式基于：

- `styles/tokens.css`
- 页面级 CSS
- 组件级 CSS

`tokens.css` 当前提供：

- 颜色 token
- 间距 token
- 圆角 token
- 阴影 token
- 交互动效 token
- 容器宽度与导航高度

## 10. 当前边界

当前前台还没有：

- 生态统一组件库接入
- 生态统一多语言包分发机制
- 生态统一主题包运行时接入
- SSR / SSG
- E2E 自动化测试

因此当前前台是“项目内自包含实现”，但已经遵守：

- 双语
- 双主题
- 卡片 HTML 直接查看
- 公开空间 / 房间 / 上传 / 管理闭环
