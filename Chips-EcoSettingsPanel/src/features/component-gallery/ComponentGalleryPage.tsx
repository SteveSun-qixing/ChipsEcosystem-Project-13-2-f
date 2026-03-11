import React from "react";
import { ChipsCardShell } from "@chips/component-library";
import { useI18n } from "../../app/providers/I18nProvider";
import { PageFrame } from "../../shared/ui/PageFrame";
import { getComponentGroups } from "./registry";

function getGalleryCardClassName(emphasis: "hero" | "wide" | "standard"): string {
  if (emphasis === "hero") {
    return "gallery-card gallery-card--hero";
  }
  if (emphasis === "wide") {
    return "gallery-card gallery-card--wide";
  }
  return "gallery-card";
}

export function ComponentGalleryPage(): React.ReactElement {
  const { t } = useI18n();
  const groups = React.useMemo(() => getComponentGroups(), []);

  return (
    <PageFrame title={t("settingsPanel.gallery.title")}>
      <div className="gallery-page">
        {groups.map((group) => (
          <section key={group.id} className="gallery-section" aria-labelledby={`gallery-section-${group.id}`}>
            <header className="gallery-section__header">
              <div>
                <h2 id={`gallery-section-${group.id}`} className="gallery-section__title">
                  {t(group.titleKey)}
                </h2>
                <p className="gallery-section__description">{t(group.descriptionKey)}</p>
              </div>
              <span className="gallery-section__meta">
                {t("settingsPanel.gallery.sectionCount", { count: group.items.length })}
              </span>
            </header>
            <div className="gallery-bento-grid">
              {group.items.map((item) => {
                const Preview = item.preview;
                return (
                  <article key={item.name} className={getGalleryCardClassName(item.emphasis)}>
                    <ChipsCardShell
                      title={item.name}
                      toolbar={<span className="gallery-scope-tag">{item.scope}</span>}
                      footer={<div className="gallery-parts">{item.parts.join(" · ")}</div>}
                    >
                      <p className="gallery-card__summary">{t(item.summaryKey)}</p>
                      <Preview />
                    </ChipsCardShell>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </PageFrame>
  );
}
