# 工单030：SDK File API 缺少 mkdir/delete/move/copy 方法

- 工单编号：工单030-SDK-FILE-API缺失
- 日期：2026-03-12
- 发现阶段：编辑引擎迁移
- 问题类型：生态工具链 / SDK完善
- 问题描述：
  编辑引擎项目在迁移过程中发现，Chips SDK 的 file API 缺少以下关键方法：
  - `file.mkdir` - 创建目录
  - `file.delete` - 删除文件/目录
  - `file.move` - 移动文件/目录
  - `file.copy` - 复制文件/目录

  当前 SDK 只提供：
  - `file.read` - 读取文件
  - `file.write` - 写入文件
  - `file.stat` - 获取文件状态
  - `file.list` - 列出目录内容

- 影响范围：
  - 编辑引擎无法实现文件/目录的创建、删除、移动、复制操作
  - 工作区功能不完整（无法创建新文件夹、无法删除文件等）
  - 需要在 Host 层面实现这些路由

- 复现步骤：
  1. 检查 Chips-SDK/src/api/file.ts
  2. 观察只定义了 read/write/stat/list 方法
  3. 查看 Chips-EditingEngine/src/services/file-service.ts 中的 mkdir/delete/move/copy 实现

- 期望行为：
  - SDK 提供完整的文件操作 API
  - Host 实现对应的路由处理

- 暂行处理：
  - 在 file-service.ts 中使用 console.warn 标记未实现
  - 编辑引擎暂时使用简化版文件操作

- 需要协作方：
  - SDK 团队添加 API
  - Host 团队实现路由

- 状态：待处理
