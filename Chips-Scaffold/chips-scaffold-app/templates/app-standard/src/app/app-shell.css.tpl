.app-shell {
  min-block-size: 100vh;
  color: var(--chips-sys-color-text-primary, var(--chips-base-color-neutral-950));
  background: var(--chips-sys-color-surface-canvas, var(--chips-base-color-neutral-0));
}

.app-shell__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--chips-base-space-4);
  padding: var(--chips-base-space-4) var(--chips-base-space-5);
  border-block-end: 1px solid var(--chips-sys-color-border-subtle, var(--chips-base-color-neutral-200));
}

.app-shell__title-group {
  min-inline-size: 0;
}

.app-shell__title {
  margin: 0;
  overflow-wrap: anywhere;
}

.app-shell__subtitle {
  color: var(--chips-sys-color-text-secondary, var(--chips-base-color-neutral-600));
}

.app-shell__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: var(--chips-base-space-3);
}

.app-shell__command-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--chips-base-space-3);
  padding: var(--chips-base-space-2) var(--chips-base-space-5);
  border-block-end: 1px solid var(--chips-sys-color-border-subtle, var(--chips-base-color-neutral-200));
}

.app-shell__sidebar,
.app-shell__content,
.app-shell__detail {
  min-inline-size: 0;
}

.app-shell__sidebar {
  inline-size: min(18rem, 28vw);
  padding: var(--chips-base-space-4);
  border-inline-end: 1px solid var(--chips-sys-color-border-subtle, var(--chips-base-color-neutral-200));
}

.app-shell__content {
  min-block-size: calc(100vh - 8rem);
}

.app-shell__scroll {
  max-block-size: calc(100vh - 8rem);
  padding: var(--chips-base-space-5);
}

.app-shell__detail {
  inline-size: min(24rem, 32vw);
  padding: var(--chips-base-space-4);
  border-inline-start: 1px solid var(--chips-sys-color-border-subtle, var(--chips-base-color-neutral-200));
  background: var(--chips-sys-color-surface-muted, var(--chips-base-color-neutral-50));
}

.app-shell__scene-heading {
  display: grid;
  gap: var(--chips-base-space-2);
}

.app-shell__scene-title,
.app-shell__panel-title {
  margin: 0;
}

.app-view-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: var(--chips-base-space-4);
}

.app-status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: var(--chips-base-space-3);
}

.app-status-item {
  display: grid;
  gap: var(--chips-base-space-1);
  min-inline-size: 0;
  padding: var(--chips-base-space-3);
  border: 1px solid var(--chips-sys-color-border-subtle, var(--chips-base-color-neutral-200));
  border-radius: var(--chips-base-radius-2);
}

.app-status-item__value {
  overflow-wrap: anywhere;
  color: var(--chips-sys-color-text-secondary, var(--chips-base-color-neutral-600));
}

.app-scene-list__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--chips-base-space-3);
  inline-size: 100%;
}

@media (max-width: 760px) {
  .app-shell__header,
  .app-shell__command-row {
    align-items: stretch;
    flex-direction: column;
  }

  .app-shell__sidebar,
  .app-shell__detail {
    inline-size: auto;
    border-inline: 0;
  }

  .app-shell__scroll {
    max-block-size: none;
  }
}
