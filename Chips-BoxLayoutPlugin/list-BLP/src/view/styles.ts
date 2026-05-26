export const LIST_LAYOUT_STYLE = `
[data-scope="chips-box-list-layout"] {
  --chips-list-row-height: 132px;
  --chips-list-cover-width: 84px;
  --chips-list-cover-height: 112px;
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100%;
  overflow: visible;
  background: var(--chips-sys-color-surface, #ffffff);
  color: var(--chips-sys-color-on-surface, #0f172a);
  box-sizing: border-box;
}

[data-scope="chips-box-list-layout"][data-density="compact"] {
  --chips-list-row-height: 104px;
}

[data-scope="chips-box-list-layout"][data-density="spacious"] {
  --chips-list-row-height: 164px;
}

[data-scope="chips-box-list-layout"][data-cover-size="compact"] {
  --chips-list-cover-width: 64px;
  --chips-list-cover-height: 84px;
}

[data-scope="chips-box-list-layout"][data-cover-size="large"] {
  --chips-list-cover-width: 112px;
  --chips-list-cover-height: 148px;
}

[data-scope="chips-box-list-layout"] [data-layout-background] {
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: 100vh;
  margin-bottom: -100vh;
  z-index: 0;
  pointer-events: none;
  opacity: 1;
}

[data-scope="chips-box-list-layout"] [data-layout-background] [data-part="root"],
[data-scope="chips-box-list-layout"] [data-layout-background] [data-part="frame-container"],
[data-scope="chips-box-list-layout"] [data-layout-background] [data-part="iframe"] {
  width: 100%;
  height: 100%;
}

[data-scope="chips-box-list-layout"] [data-layout-background] [data-part="status"] {
  display: none;
}

[data-scope="chips-box-list-layout"] [data-layout-shell] {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  min-height: 100%;
  min-width: 0;
  box-sizing: border-box;
}

[data-scope="chips-box-list-layout"] [data-layout-top-region] {
  width: 100%;
  min-height: clamp(132px, 24vw, 288px);
  border-radius: 8px;
  overflow: hidden;
  background: var(--chips-sys-color-surface-container, rgba(255, 255, 255, 0.88));
  border: 1px solid var(--chips-sys-color-outline-variant, rgba(148, 163, 184, 0.24));
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(12px);
}

[data-scope="chips-box-list-layout"] [data-layout-top-region] [data-part="root"],
[data-scope="chips-box-list-layout"] [data-layout-top-region] [data-part="frame-container"],
[data-scope="chips-box-list-layout"] [data-layout-top-region] [data-part="iframe"] {
  width: 100%;
  height: 100%;
}

[data-scope="chips-box-list-layout"] [data-layout-top-region] [data-part="status"] {
  display: none;
}

[data-scope="chips-box-list-layout"] [data-list-data-grid],
[data-scope="chips-box-list-layout"] [data-scope="data-grid"][data-part="root"],
[data-scope="chips-box-list-layout"] [role="grid"] {
  min-width: 0;
}

[data-scope="chips-box-list-layout"] [data-scope="data-grid"][data-part="root"] {
  display: grid;
  gap: 12px;
}

[data-scope="chips-box-list-layout"] [data-scope="data-grid"][data-part="toolbar"] {
  display: block;
  min-width: 0;
}

[data-scope="chips-box-list-layout"] [data-layout-toolbar] {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  min-width: 0;
  padding: 8px 0;
}

[data-scope="chips-box-list-layout"] [data-layout-selection-count] {
  margin-right: auto;
  color: var(--chips-sys-color-on-surface-variant, #64748b);
  font-size: 13px;
  line-height: 1.45;
}

[data-scope="chips-box-list-layout"] [data-layout-list] {
  display: grid;
  flex: 1;
  gap: 12px;
  align-content: start;
  min-height: 0;
  min-width: 0;
  outline: none;
}

[data-scope="chips-box-list-layout"] [data-layout-list][data-empty="true"] {
  min-height: 100%;
}

[data-scope="chips-box-list-layout"] [data-list-entry] {
  display: grid;
  grid-template-columns: 36px var(--chips-list-cover-width) minmax(0, 1fr);
  align-items: center;
  gap: 16px;
  width: 100%;
  height: var(--chips-list-row-height);
  min-height: var(--chips-list-row-height);
  min-width: 0;
  padding: 10px 14px;
  box-sizing: border-box;
  border-radius: 8px;
  background: var(--chips-sys-color-surface-container-low, rgba(255, 255, 255, 0.92));
  border: 1px solid var(--chips-sys-color-outline-variant, rgba(226, 232, 240, 0.95));
}

[data-scope="chips-box-list-layout"] [data-list-entry][data-active="true"] {
  border-color: var(--chips-sys-color-primary, rgba(15, 23, 42, 0.72));
  box-shadow: 0 0 0 1px var(--chips-sys-color-primary, rgba(15, 23, 42, 0.72));
}

[data-scope="chips-box-list-layout"] [data-list-entry][data-selected="true"] {
  background: var(--chips-sys-color-primary-container, rgba(219, 234, 254, 0.82));
}

[data-scope="chips-box-list-layout"] [data-list-selection] {
  display: grid;
  place-items: center;
  min-width: 0;
}

[data-scope="chips-box-list-layout"] [data-list-selection] [data-scope="checkbox"][data-part="root"] {
  display: inline-grid;
  grid-template-columns: auto;
  align-items: center;
  min-width: 0;
}

[data-scope="chips-box-list-layout"] [data-list-selection] [data-scope="checkbox"][data-part="label"] {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

[data-scope="chips-box-list-layout"] [data-list-cover-shell] {
  width: var(--chips-list-cover-width);
  height: var(--chips-list-cover-height);
  overflow: hidden;
  border-radius: 6px;
  background: var(--chips-sys-color-surface, #ffffff);
}

[data-scope="chips-box-list-layout"] [data-list-cover-shell] [data-part="root"],
[data-scope="chips-box-list-layout"] [data-list-cover-shell] [data-part="frame-container"],
[data-scope="chips-box-list-layout"] [data-list-cover-shell] [data-part="iframe"] {
  width: 100%;
  height: 100%;
}

[data-scope="chips-box-list-layout"] [data-list-cover-shell] [data-part="iframe"] {
  display: block;
  border: none;
  background: transparent;
  pointer-events: none;
}

[data-scope="chips-box-list-layout"] [data-list-cover-shell] [data-part="status"] {
  display: none;
}

[data-scope="chips-box-list-layout"] [data-list-cover-placeholder] {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  gap: 6px;
  padding: 10px;
  border: none;
  background: var(--chips-sys-color-surface-container-highest, #f8fafc);
  color: var(--chips-sys-color-on-surface, #334155);
  text-align: center;
  cursor: pointer;
}

[data-scope="chips-box-list-layout"] [data-list-cover-placeholder-title] {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  line-height: 1.4;
}

[data-scope="chips-box-list-layout"] [data-list-cover-placeholder-text] {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  line-height: 1.4;
  color: var(--chips-sys-color-on-surface-variant, #64748b);
}

[data-scope="chips-box-list-layout"] [data-list-entry-body] {
  display: grid;
  gap: 6px;
  min-width: 0;
  align-content: center;
}

[data-scope="chips-box-list-layout"] [data-list-entry-title] {
  display: block;
  width: 100%;
  min-width: 0;
  border: none;
  padding: 0;
  margin: 0;
  background: none;
  color: var(--chips-sys-color-on-surface, #0f172a);
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.45;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

[data-scope="chips-box-list-layout"] [data-list-entry-meta],
[data-scope="chips-box-list-layout"] [data-list-entry-tags] {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 6px 8px;
  align-items: center;
}

[data-scope="chips-box-list-layout"] [data-list-entry-date] {
  display: block;
  max-width: 100%;
  color: var(--chips-sys-color-on-surface-variant, #64748b);
  font-size: 13px;
  line-height: 1.45;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

[data-scope="chips-box-list-layout"] [data-list-entry-chip],
[data-scope="chips-box-list-layout"] [data-list-entry-tag] {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  border-radius: 999px;
  border: 1px solid var(--chips-sys-color-outline-variant, rgba(203, 213, 225, 0.88));
  background: var(--chips-sys-color-surface-container, rgba(248, 250, 252, 0.88));
  color: var(--chips-sys-color-on-surface-variant, #475569);
  font-size: 12px;
  line-height: 1.2;
  padding: 3px 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

[data-scope="chips-box-list-layout"] [data-list-entry-summary] {
  max-width: 100%;
  margin: 0;
  color: var(--chips-sys-color-on-surface-variant, #64748b);
  font-size: 13px;
  line-height: 1.45;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

[data-scope="chips-box-list-layout"] [data-list-group-heading] {
  position: sticky;
  top: 0;
  z-index: 2;
  padding: 8px 4px 2px;
  color: var(--chips-sys-color-on-surface-variant, #475569);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
  background: var(--chips-sys-color-surface, rgba(255, 255, 255, 0.92));
}

[data-scope="chips-box-list-layout"] [data-list-entry-title]:focus-visible,
[data-scope="chips-box-list-layout"] [data-list-cover-placeholder]:focus-visible,
[data-scope="chips-box-list-layout"] [data-layout-list]:focus-visible {
  outline: 2px solid var(--chips-sys-color-primary, rgba(15, 23, 42, 0.75));
  outline-offset: 2px;
}

[data-scope="chips-box-list-layout"] [data-layout-empty] {
  position: relative;
  display: grid;
  place-items: center;
  gap: 14px;
  min-height: 100%;
  padding: 36px 20px;
  background: var(--chips-sys-color-surface, #ffffff);
  color: var(--chips-sys-color-on-surface-variant, #475569);
  font-size: 14px;
  text-align: center;
}

[data-scope="chips-box-list-layout"] [data-layout-empty] [data-scope="empty-state"][data-part="root"] {
  position: relative;
  z-index: 1;
  background: transparent;
}

[data-scope="chips-box-list-layout"] [data-layout-empty-ghosts] {
  position: absolute;
  inset: 34px 24px;
  pointer-events: none;
  display: grid;
  align-content: center;
  gap: 14px;
}

[data-scope="chips-box-list-layout"] [data-layout-empty-ghost] {
  display: block;
  width: min(460px, 72vw);
  height: 54px;
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.95) 0%, rgba(241, 245, 249, 0.92) 100%);
  border: 1px solid rgba(226, 232, 240, 0.95);
  box-shadow: 0 10px 22px rgba(148, 163, 184, 0.08);
}

[data-scope="chips-box-list-layout"] [data-layout-empty-ghost][data-size="lg"] {
  transform: translateX(-12px);
}

[data-scope="chips-box-list-layout"] [data-layout-empty-ghost][data-size="md"] {
  transform: translateX(18px);
}

[data-scope="chips-box-list-layout"] [data-layout-empty-ghost][data-size="sm"] {
  transform: translateX(4px);
}

[data-scope="chips-box-list-layout"] [data-layout-pagination] {
  display: flex;
  justify-content: center;
  padding: 8px 0 18px;
}

@media (max-width: 767px) {
  [data-scope="chips-box-list-layout"] {
    --chips-list-row-height: 112px;
    --chips-list-cover-width: 66px;
    --chips-list-cover-height: 88px;
  }

  [data-scope="chips-box-list-layout"][data-density="compact"] {
    --chips-list-row-height: 96px;
  }

  [data-scope="chips-box-list-layout"][data-density="spacious"] {
    --chips-list-row-height: 140px;
  }

  [data-scope="chips-box-list-layout"] [data-layout-shell] {
    padding: 16px;
    gap: 14px;
  }

  [data-scope="chips-box-list-layout"] [data-layout-toolbar] {
    align-items: stretch;
    flex-direction: column;
  }

  [data-scope="chips-box-list-layout"] [data-list-entry] {
    grid-template-columns: 30px var(--chips-list-cover-width) minmax(0, 1fr);
    gap: 12px;
    padding: 8px 10px;
  }

  [data-scope="chips-box-list-layout"] [data-list-entry-title] {
    font-size: 14px;
  }

  [data-scope="chips-box-list-layout"] [data-list-entry-date],
  [data-scope="chips-box-list-layout"] [data-list-entry-summary] {
    font-size: 12px;
  }

  [data-scope="chips-box-list-layout"] [data-layout-empty] {
    min-height: 100%;
  }

  [data-scope="chips-box-list-layout"] [data-layout-empty-ghosts] {
    inset: 26px 16px;
    gap: 12px;
  }
}
`;
