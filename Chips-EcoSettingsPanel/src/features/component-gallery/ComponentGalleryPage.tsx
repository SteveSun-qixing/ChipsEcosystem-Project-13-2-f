import React from "react";
import { ChipsCardShell, ChipsTag } from "@chips/component-library";
import { useI18n } from "../../app/providers/I18nProvider";
import { CardDescription, CardGridItem, PageSection, PageStack, ShowcaseCardGrid } from "../../shared/ui/PageLayout";
import { PageFrame } from "../../shared/ui/PageFrame";
import { getComponentGroups } from "./registry";

export function ComponentGalleryPage(): React.ReactElement {
  const { t } = useI18n();
  const groups = React.useMemo(() => getComponentGroups(), []);

  return (
    <PageFrame title={t("settingsPanel.gallery.title")}>
      <PageStack>
        {groups.map((group) => (
          <PageSection
            key={group.id}
            title={t(group.titleKey)}
            titleId={`gallery-section-${group.id}`}
            description={t(group.descriptionKey)}
            meta={<ChipsTag label={t("settingsPanel.gallery.sectionCount", { count: group.items.length })} />}
          >
            <ShowcaseCardGrid>
              {group.items.map((item) => {
                const Preview = item.preview;
                return (
                  <CardGridItem key={item.name} emphasis={item.emphasis}>
                    <ChipsCardShell
                      title={item.name}
                      toolbar={<span className="gallery-scope-tag">{item.scope}</span>}
                      footer={<div className="gallery-parts">{item.parts.join(" · ")}</div>}
                    >
                      <CardDescription>{t(item.summaryKey)}</CardDescription>
                      <Preview />
                    </ChipsCardShell>
                  </CardGridItem>
                );
              })}
            </ShowcaseCardGrid>
          </PageSection>
        ))}
      </PageStack>
    </PageFrame>
  );
}
