export const GRID_LAYOUT_STYLE = `
[data-scope="chips-box-grid-layout"] {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  min-height: 100%;
  overflow: visible;
  color: var(--chips-sys-color-on-surface, #0f172a);
  background: var(--chips-sys-color-surface, #ffffff);
  box-sizing: border-box;
}

[data-scope="chips-box-grid-layout"] * {
  box-sizing: border-box;
}

[data-scope="chips-box-grid-layout"] [data-layout-background] {
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

[data-scope="chips-box-grid-layout"] [data-layout-background] [data-part="root"],
[data-scope="chips-box-grid-layout"] [data-layout-background] [data-part="frame-container"],
[data-scope="chips-box-grid-layout"] [data-layout-background] [data-part="iframe"] {
  width: 100%;
  height: 100%;
}

[data-scope="chips-box-grid-layout"] [data-layout-background] [data-part="status"] {
  display: none;
}

[data-scope="chips-box-grid-layout"] [data-layout-shell] {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: var(--chips-layout-gap-lg, 16px);
  padding: var(--chips-layout-gap-lg, 16px);
  min-width: 0;
  min-height: 100%;
}

[data-scope="chips-box-grid-layout"] [data-layout-top-region] {
  width: 100%;
  min-width: 0;
  min-height: clamp(132px, 24vw, 288px);
  border-radius: var(--chips-comp-box-root-radius, 12px);
  overflow: hidden;
  background: var(--chips-comp-box-root-surface, var(--chips-sys-color-surface, #ffffff));
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle, rgba(148, 163, 184, 0.28));
}

[data-scope="chips-box-grid-layout"] [data-layout-top-region] [data-part="root"],
[data-scope="chips-box-grid-layout"] [data-layout-top-region] [data-part="frame-container"],
[data-scope="chips-box-grid-layout"] [data-layout-top-region] [data-part="iframe"] {
  width: 100%;
  height: 100%;
}

[data-scope="chips-box-grid-layout"] [data-layout-top-region] [data-part="status"] {
  display: none;
}

[data-scope="chips-box-grid-layout"] [data-layout-grid] {
  display: grid;
  flex: 1;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--chips-layout-size-grid-min-item, 160px)), 1fr));
  grid-auto-rows: max-content;
  gap: var(--chips-layout-gap-md, 12px);
  align-items: start;
  min-width: 0;
  min-height: 0;
  align-content: start;
}

[data-scope="chips-box-grid-layout"] [data-layout-grid][data-empty="true"] {
  grid-template-columns: minmax(0, 1fr);
  min-height: 100%;
}

[data-scope="chips-box-grid-layout"] [data-grid-entry] {
  display: grid;
  gap: var(--chips-layout-gap-sm, 8px);
  min-width: 0;
  align-content: start;
}

[data-scope="chips-box-grid-layout"] [data-grid-cover-shell] {
  width: 100%;
  overflow: hidden;
  border-radius: var(--chips-comp-box-root-radius, 12px);
  background: var(--chips-sys-color-surface, #ffffff);
}

[data-scope="chips-box-grid-layout"] [data-grid-cover-shell] [data-part="root"],
[data-scope="chips-box-grid-layout"] [data-grid-cover-shell] [data-part="frame-container"],
[data-scope="chips-box-grid-layout"] [data-grid-cover-shell] [data-part="iframe"] {
  width: 100%;
  height: 100%;
}

[data-scope="chips-box-grid-layout"] [data-grid-cover-shell] [data-part="iframe"] {
  display: block;
  border: none;
  background: transparent;
  pointer-events: none;
}

[data-scope="chips-box-grid-layout"] [data-grid-cover-shell] [data-part="status"] {
  display: none;
}

[data-scope="chips-box-grid-layout"] [data-grid-cover-placeholder] {
  width: 100%;
  height: 100%;
  min-height: 180px;
  display: grid;
  place-items: center;
  gap: var(--chips-layout-gap-sm, 8px);
  padding: var(--chips-layout-gap-lg, 16px);
  border: none;
  background: transparent;
  color: var(--chips-sys-color-on-surface, #0f172a);
  text-align: center;
  cursor: pointer;
}

[data-scope="chips-box-grid-layout"] [data-grid-cover-placeholder-title] {
  font-size: var(--chips-comp-text-root-font-size, 15px);
  line-height: 1.5;
}

[data-scope="chips-box-grid-layout"] [data-grid-cover-placeholder-text] {
  font-size: var(--chips-comp-label-root-font-size, 12px);
  color: var(--chips-sys-color-on-surface-muted, #64748b);
}

[data-scope="chips-box-grid-layout"] [data-grid-entry-body] {
  display: grid;
  justify-items: center;
}

[data-scope="chips-box-grid-layout"] [data-grid-entry-title] {
  border: none;
  padding: 0;
  margin: 0;
  background: none;
  color: var(--chips-sys-color-on-surface, #0f172a);
  font: inherit;
  font-size: var(--chips-comp-text-root-font-size, 15px);
  font-weight: 700;
  line-height: 1.5;
  text-align: center;
  cursor: pointer;
  width: 100%;
  min-width: 0;
}

[data-scope="chips-box-grid-layout"] [data-grid-entry-title]:focus-visible,
[data-scope="chips-box-grid-layout"] [data-grid-cover-placeholder]:focus-visible,
[data-scope="chips-box-grid-layout"] [data-layout-load-more]:focus-visible,
[data-scope="chips-box-grid-layout"] [data-layout-retry]:focus-visible {
  outline: var(--chips-layout-focus-outline-width, 2px) solid var(--chips-sys-color-focus-ring, currentColor);
  outline-offset: var(--chips-layout-focus-outline-offset, 2px);
}

[data-scope="chips-box-grid-layout"] [data-layout-empty] {
  position: relative;
  display: grid;
  place-items: center;
  gap: var(--chips-layout-gap-md, 12px);
  min-height: 100%;
  padding: 36px 20px;
  background: var(--chips-sys-color-surface, #ffffff);
  color: var(--chips-sys-color-on-surface-muted, #64748b);
  font-size: 14px;
  text-align: center;
}

[data-scope="chips-box-grid-layout"] [data-layout-empty-ghosts] {
  position: absolute;
  inset: 28px 24px;
  pointer-events: none;
  display: grid;
  grid-template-columns: repeat(3, minmax(92px, 148px));
  justify-content: center;
  align-content: center;
  gap: var(--chips-layout-gap-lg, 16px);
}

[data-scope="chips-box-grid-layout"] [data-layout-empty-ghost] {
  display: block;
  width: 100%;
  border-radius: var(--chips-comp-box-root-radius, 12px);
  background: var(--chips-sys-color-surface-muted, rgba(241, 245, 249, 0.92));
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle, rgba(226, 232, 240, 0.95));
  aspect-ratio: 3 / 4;
}

[data-scope="chips-box-grid-layout"] [data-layout-empty-ghost][data-size="lg"] {
  transform: translateY(-10px);
}

[data-scope="chips-box-grid-layout"] [data-layout-empty-ghost][data-size="md"] {
  transform: translateY(10px);
}

[data-scope="chips-box-grid-layout"] [data-layout-empty-ghost][data-size="sm"] {
  transform: translateY(-4px);
}

[data-scope="chips-box-grid-layout"] [data-layout-empty-title] {
  position: relative;
  z-index: 1;
  font-size: 18px;
  color: var(--chips-sys-color-on-surface, #0f172a);
}

[data-scope="chips-box-grid-layout"] [data-layout-empty-text] {
  position: relative;
  z-index: 1;
  max-width: 320px;
  color: var(--chips-sys-color-on-surface-muted, #64748b);
  line-height: 1.7;
}

[data-scope="chips-box-grid-layout"] [data-layout-footer] {
  display: grid;
  justify-items: center;
  padding: var(--chips-layout-gap-md, 12px) 0;
}

[data-scope="chips-box-grid-layout"] [data-layout-load-more],
[data-scope="chips-box-grid-layout"] [data-layout-retry] {
  min-height: 40px;
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle, rgba(148, 163, 184, 0.28));
  border-radius: var(--chips-comp-button-root-radius, 10px);
  background: var(--chips-comp-button-root-surface, var(--chips-sys-color-surface, #ffffff));
  color: var(--chips-comp-button-root-color, var(--chips-sys-color-on-surface, #0f172a));
  padding: 0 var(--chips-layout-gap-lg, 16px);
  font: inherit;
  cursor: pointer;
}

[data-scope="chips-box-grid-layout"] [data-layout-load-more]:disabled {
  cursor: default;
  opacity: 0.64;
}

[data-scope="chips-box-grid-layout"] [data-layout-page-error] {
  display: flex;
  align-items: center;
  gap: var(--chips-layout-gap-sm, 8px);
  color: var(--chips-sys-color-danger, #b42318);
}

@media (max-width: 767px) {
  [data-scope="chips-box-grid-layout"] [data-layout-shell] {
    padding: var(--chips-layout-gap-md, 12px);
    gap: var(--chips-layout-gap-md, 12px);
  }

  [data-scope="chips-box-grid-layout"] [data-layout-grid] {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--chips-layout-gap-sm, 8px);
  }

  [data-scope="chips-box-grid-layout"] [data-layout-empty] {
    min-height: 100%;
  }

  [data-scope="chips-box-grid-layout"] [data-layout-empty-ghosts] {
    inset: 20px 16px;
    grid-template-columns: repeat(2, minmax(92px, 132px));
    gap: var(--chips-layout-gap-sm, 8px);
  }
}
`;
