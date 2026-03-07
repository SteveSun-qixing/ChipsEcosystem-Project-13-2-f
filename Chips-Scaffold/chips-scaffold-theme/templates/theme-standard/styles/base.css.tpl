:root {
  /* 语义色彩 */
  --chips-color-primary: #2196f3;
  --chips-color-on-primary: #ffffff;
  --chips-color-surface: #ffffff;
  --chips-color-on-surface: #1c1b1f;
  --chips-color-border-subtle: #eeeeee;

  /* 尺寸与圆角 */
  --chips-radius-sm: 4px;
  --chips-radius-md: 8px;
  --chips-space-1: 4px;
  --chips-space-2: 8px;
  --chips-space-3: 12px;
  --chips-space-4: 16px;
}

body {
  margin: 0;
  padding: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background-color: var(--chips-color-background, #fafafa);
  color: var(--chips-color-on-surface);
}

