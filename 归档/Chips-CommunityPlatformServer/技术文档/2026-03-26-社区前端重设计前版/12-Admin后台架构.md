# Admin后台架构

## 1. 应用形态

当前后台是一个单页 React 应用，核心文件集中在：

- `packages/admin/src/App.tsx`
- `packages/admin/src/main.tsx`
- `packages/admin/src/admin.css`

它没有再拆分额外的页面目录、状态库或 API 模块文件。

## 2. 技术特征

当前后台采用：

- React + TypeScript
- 单文件应用主逻辑
- 内置 API 客户端
- 内置多语言字典
- 内置双主题样式
- 通过 Cookie + access token 恢复管理员会话

## 3. 认证模型

### 3.1 登录入口

后台登录仍然走前台同一套认证接口：

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/users/me`

### 3.2 管理员判定

后台不会因为“登录成功”就直接开放功能。

正式判断顺序：

1. 登录或恢复会话
2. 获取 `/api/v1/users/me`
3. 检查 `role === 'admin'`
4. 只有管理员才进入后台功能区

非管理员会停留在“forbidden”状态。

## 4. API 分层

当前后台在 `App.tsx` 内部维护两组 API：

### 4.1 `authApi`

负责：

- 登录
- 登出
- 获取当前用户资料

### 4.2 `adminApi`

负责：

- 平台统计 `/admin/api/v1/stats`
- 用户列表 `/admin/api/v1/users`
- 用户启停 `/admin/api/v1/users/:userId`
- 内容列表 `/admin/api/v1/content`
- 内容删除 `/admin/api/v1/content/:type/:id`

## 5. 页面状态模型

后台当前主要使用 `useState` + `useCallback` 维护状态。

核心状态包括：

- `locale`
- `themeId`
- `currentUser`
- `stats`
- `users`
- `usersPagination`
- `content`
- `contentPagination`
- `userQuery`
- `contentQuery`
- `contentType`
- `loginForm`
- `pendingDelete`
- `notice / error / loading`

## 6. 会话恢复与自动刷新

后台内置的请求封装会在 401 时：

1. 调用 `/api/v1/auth/refresh`
2. 若成功，更新内存中的 `accessToken`
3. 重试原请求

后台启动时也会主动尝试恢复管理员会话。

## 7. 视图分区

### 7.1 头部栏

当前顶部导航提供：

- 品牌信息
- 语言切换
- 主题切换
- 退出登录

### 7.2 平台总览

展示：

- 用户总数
- 卡片总数
- 箱子总数
- 总存储量
- 今日新增用户 / 卡片 / 箱子

### 7.3 用户管理

支持：

- 按用户名 / 显示名称搜索
- 分页浏览用户列表
- 查看角色、启用状态、存储占用、创建时间
- 启用 / 禁用用户

### 7.4 内容治理

支持：

- 卡片 / 箱子切换
- 按标题搜索
- 分页浏览
- 查看内容基础信息
- 二次点击确认删除

## 8. 主题与多语言

### 8.1 当前 locale

- `zh-CN`
- `en-US`

### 8.2 当前主题

- `chips-admin.midnight`
- `chips-admin.paper`

### 8.3 持久化

后台会把：

- locale -> `ccps.admin.locale`
- theme -> `ccps.admin.theme`

写入 `localStorage`。

### 8.4 样式载体

样式通过 `admin.css` 中的 CSS 变量驱动，使用：

- `data-admin-theme-id='chips-admin.midnight'`
- `data-admin-theme-id='chips-admin.paper'`

## 9. 交互细节

当前后台的重要交互约定：

1. 删除内容采用“二次点击确认”
2. 用户启停操作立即调用后台接口
3. 搜索以表单提交触发
4. 切换内容 tab 时会重新加载对应类型列表
5. 分页按钮会保持当前查询条件

## 10. 当前边界

当前后台还没有：

- 审计日志页
- 工单与举报流
- 图表可视化
- 角色细分与权限矩阵配置
- 数据导出中心
- 独立组件库抽象

因此当前后台的正式定位仍是：

- 轻量平台运营控制台
- 面向第一版上线与基础治理
