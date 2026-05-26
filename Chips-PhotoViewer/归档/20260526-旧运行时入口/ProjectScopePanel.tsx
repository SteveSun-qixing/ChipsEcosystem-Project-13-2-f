import React from "react";

interface ProjectScopePanelProps {
  title: string;
}

export function ProjectScopePanel({ title }: ProjectScopePanelProps) {
  return (
    <section
      data-chips-app="photo-viewer.scope-panel"
      style={{
        padding: 16,
        borderRadius: 8,
        border: "1px solid var(--chips-border-subtle, rgba(17,17,17,0.08))",
      }}
    >
      <h2 style={{ fontSize: 14, marginBottom: 8 }}>{title}</h2>
      <p style={{ fontSize: 12, marginBottom: 12, lineHeight: 1.7 }}>
        当前工程已经接入应用插件脚手架、主题壳层、Bridge 运行时和项目级文档基线，后续开发将直接围绕图片打开、缩放和保存三条正式能力推进。
      </p>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.8 }}>
        <li>项目内部先冻结简单图片查看器的产品边界，不在本仓扩展多媒体管理职责。</li>
        <li>显式 `targetPath` 启动链路可以直接接入本项目，适合后续内核或其他应用明确指定图片路径时使用。</li>
        <li>自动按图片类型分发处理器、系统文件关联和跨应用资源转交属于生态级依赖，当前已单独登记工单跟踪。</li>
      </ul>
    </section>
  );
}
