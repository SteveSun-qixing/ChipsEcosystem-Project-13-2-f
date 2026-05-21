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

[data-scope="chips-box-list-layout"] [data-layout-list] {
  display: grid;
  flex: 1;
  gap: 12px;
  align-content: start;
  min-height: 0;
  min-width: 0;
}

[data-scope="chips-box-list-layout"] [data-layout-list][data-empty="true"] {
  min-height: 100%;
}

[data-scope="chips-box-list-layout"] [data-list-entry] {
  display: grid;
  grid-template-columns: var(--chips-list-cover-width) minmax(0, 1fr);
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
  gap: 8px;
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

[data-scope="chips-box-list-layout"] [data-list-entry-title]:focus-visible,
[data-scope="chips-box-list-layout"] [data-list-cover-placeholder]:focus-visible {
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

[data-scope="chips-box-list-layout"] [data-layout-empty-title] {
  position: relative;
  z-index: 1;
  font-size: 18px;
  color: var(--chips-sys-color-on-surface, #0f172a);
}

[data-scope="chips-box-list-layout"] [data-layout-empty-text] {
  position: relative;
  z-index: 1;
  max-width: 320px;
  color: var(--chips-sys-color-on-surface-variant, #64748b);
  line-height: 1.7;
}

@media (max-width: 767px) {
  [data-scope="chips-box-list-layout"] {
    --chips-list-row-height: 112px;
    --chips-list-cover-width: 66px;
    --chips-list-cover-height: 88px;
  }

  [data-scope="chips-box-list-layout"] [data-layout-shell] {
    padding: 16px;
    gap: 14px;
  }

  [data-scope="chips-box-list-layout"] [data-list-entry] {
    gap: 12px;
    padding: 8px 10px;
  }

  [data-scope="chips-box-list-layout"] [data-list-entry-title] {
    font-size: 14px;
  }

  [data-scope="chips-box-list-layout"] [data-list-entry-date] {
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
