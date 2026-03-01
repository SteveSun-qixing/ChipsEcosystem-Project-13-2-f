# .cpk 打包规范

**版本**：1.0.0  
**最后更新**：2026-02-17  
**适用范围**：全部插件类型（app/card/layout/module/theme）

---

## 1. 规范目标

统一插件交付格式，确保 `.cpk` 在 Host 中可安装、可验证、可运行、可回滚。

---

## 2. 基本原则

1. 所有插件统一交付 `.cpk`，不提供独立可执行打包  
2. 包内必须包含合法 `manifest.yaml`  
3. 打包前必须先构建并通过合规校验  
4. 安装与运行时兼容性必须可判定

---

## 3. 标准打包流程

```bash
# 1) 构建
chipsd build

# 2) 打包
chipsd pack

# 3) 校验
chipsd validate
```

---

## 4. 包内容要求

`.cpk` 至少应包含：

1. `manifest.yaml`  
2. `dist/`（构建产物）  
3. `assets/`（图标等静态资源，若有）  
4. `locales/`（语言包，若有）

禁止包含：

- 开发时临时文件（如调试缓存、编辑器临时目录）  
- 与运行无关的大体积原始素材  
- 敏感信息（密钥、私有配置）

---

## 5. Manifest 必填关注项

高频失败项如下：

1. `schemaVersion` 必须是 `"1.0.0"`  
2. `type` 仅允许 `app | card | layout | module | theme`  
3. `compatibility` 必须存在，且 `host` 版本范围有效  
4. `permissions` 必须是合法权限标识

详细字段定义以 `生态共用/插件开发指南/06-manifest-yaml-参考.md` 为准。

---

## 6. 兼容性要求

每个 `.cpk` 必须声明并通过以下兼容检查：

1. Host 版本兼容  
2. 平台兼容（win32/darwin/linux）  
3. 依赖插件兼容（如模块依赖）

---

## 7. 质量门禁

发布前必须满足：

1. `vitest` 全通过  
2. `chipsd validate` 全通过  
3. Host 联调安装成功  
4. 核心功能可用，卸载后无残留异常

---

## 8. 常见错误与修复

### 8.1 `DEV_PLUGIN_INVALID_MANIFEST`

处理顺序：

1. 修复 `schemaVersion`  
2. 修复 `permissions` 格式  
3. 补齐 `compatibility` 对象  
4. 重新 `chipsd validate`

### 8.2 安装成功但运行失败

优先检查：

- `entry` 路径是否指向真实构建产物  
- 构建目标类型与插件类型是否匹配  
- 插件是否误用 Node/Electron API

---

## 9. 关联文档

- `生态共用/07-插件开发规范.md`
- `生态共用/插件开发指南/06-manifest-yaml-参考.md`
- `生态共用/18-生态开发工具与工作方式指南.md`
