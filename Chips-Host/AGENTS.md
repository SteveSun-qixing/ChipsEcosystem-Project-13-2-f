# Chips-Host AGENTS

## 角色

- 本仓是 Host、PAL、Bridge、插件运行时和 CLI 的主实现仓；内部技术文档只记录 Host 内部实现细节。

## 开发规则

- Host 对外契约以 `生态共用技术文档/` 为准；本仓内部文档不重新定义外部公共接口。
- 保持 `PAL -> Kernel -> Services -> Runtime/Bridge` 分层边界，服务调用必须走内核路由，插件能力暴露必须走 preload / Bridge。
- `src/main`、`src/preload`、`src/runtime`、`src/shared` 的职责不要混写；平台相关能力应收敛到 PAL 或正式服务域。
- 任何改动若影响 Bridge、服务域、主题运行时、插件安装、文件关联、CLI 或渲染链路，都属于高风险变更，必须同步核对共用文档和测试。
- 不要把单项目私有约定固化为 Host 公共契约；公共变化要先在共享文档收口。

## 验证

- 常规改动至少运行 `npm run build` 与 `npm test`。
- 若变更涉及公共契约或高风险链路，再补跑 `npm run test:contract`，触及 L8/L9 性能链路时补跑对应性能脚本。
