export const GRID_LAYOUT_STYLE = `
[data-scope="chips-box-grid-layout"] {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100%;
  overflow: visible;
  background: #ffffff;
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
  gap: 20px;
  padding: 20px;
  min-height: 100%;
  box-sizing: border-box;
}

[data-scope="chips-box-grid-layout"] [data-layout-top-region] {
  width: 100%;
  min-height: clamp(132px, 24vw, 288px);
  border-radius: 24px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: 0 20px 42px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(12px);
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
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  grid-auto-rows: max-content;
  gap: 18px;
  align-items: start;
  min-height: 0;
  align-content: start;
}

[data-scope="chips-box-grid-layout"] [data-layout-grid][data-empty="true"] {
  grid-template-columns: minmax(0, 1fr);
  min-height: 100%;
}

[data-scope="chips-box-grid-layout"] [data-grid-entry] {
  display: grid;
  gap: 12px;
  min-width: 0;
  align-content: start;
}

[data-scope="chips-box-grid-layout"] [data-grid-cover-shell] {
  width: 100%;
  overflow: hidden;
  border-radius: 18px;
  background: #ffffff;
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
  gap: 10px;
  padding: 18px;
  border: none;
  background: transparent;
  color: #334155;
  text-align: center;
  cursor: pointer;
}

[data-scope="chips-box-grid-layout"] [data-grid-cover-placeholder-title] {
  font-size: 15px;
  line-height: 1.5;
}

[data-scope="chips-box-grid-layout"] [data-grid-cover-placeholder-text] {
  font-size: 12px;
  color: #64748b;
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
  color: #0f172a;
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.5;
  text-align: center;
  cursor: pointer;
  width: 100%;
  min-width: 0;
}

[data-scope="chips-box-grid-layout"] [data-grid-entry-title]:focus-visible,
[data-scope="chips-box-grid-layout"] [data-grid-cover-placeholder]:focus-visible {
  outline: 2px solid rgba(15, 23, 42, 0.75);
  outline-offset: 2px;
}

[data-scope="chips-box-grid-layout"] [data-layout-empty] {
  position: relative;
  display: grid;
  place-items: center;
  gap: 14px;
  min-height: 100%;
  padding: 36px 20px;
  background: #ffffff;
  color: #475569;
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
  gap: 22px;
}

[data-scope="chips-box-grid-layout"] [data-layout-empty-ghost] {
  display: block;
  width: 100%;
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(241, 245, 249, 0.95) 0%, rgba(226, 232, 240, 0.88) 100%);
  border: 1px solid rgba(226, 232, 240, 0.95);
  box-shadow: 0 12px 24px rgba(148, 163, 184, 0.08);
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
  color: #0f172a;
}

[data-scope="chips-box-grid-layout"] [data-layout-empty-text] {
  position: relative;
  z-index: 1;
  max-width: 320px;
  color: #64748b;
  line-height: 1.7;
}

@media (max-width: 767px) {
  [data-scope="chips-box-grid-layout"] [data-layout-shell] {
    padding: 16px;
    gap: 16px;
  }

  [data-scope="chips-box-grid-layout"] [data-layout-grid] {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  [data-scope="chips-box-grid-layout"] [data-grid-entry] {
    padding: 12px;
    border-radius: 20px;
  }

  [data-scope="chips-box-grid-layout"] [data-layout-empty] {
    min-height: 100%;
  }

  [data-scope="chips-box-grid-layout"] [data-layout-empty-ghosts] {
    inset: 20px 16px;
    grid-template-columns: repeat(2, minmax(92px, 132px));
    gap: 14px;
  }
}
`;
