function collectChipsVariables(referenceElement: HTMLElement): Array<[string, string]> {
  const declarations = new Map<string, string>();
  const candidates = [
    referenceElement,
    referenceElement.ownerDocument.body,
    referenceElement.ownerDocument.documentElement,
  ].filter((candidate): candidate is HTMLElement => Boolean(candidate));

  for (const candidate of candidates) {
    const computedStyle = window.getComputedStyle(candidate);
    for (let index = 0; index < computedStyle.length; index += 1) {
      const propertyName = computedStyle.item(index);
      if (!propertyName.startsWith('--chips-')) {
        continue;
      }

      const propertyValue = computedStyle.getPropertyValue(propertyName).trim();
      if (!propertyValue) {
        continue;
      }

      declarations.set(propertyName, propertyValue);
    }
  }

  return Array.from(declarations.entries()).sort(([left], [right]) => left.localeCompare(right));
}

export function createBasecardFrameThemeCss(referenceElement: HTMLElement): string {
  const variables = collectChipsVariables(referenceElement);
  const variableBlock = variables.length > 0
    ? [
      ':root {',
      ...variables.map(([name, value]) => `  ${name}: ${value};`),
      '}',
    ].join('\n')
    : '';

  return [
    variableBlock,
    'html, body {',
    '  margin: 0;',
    '  padding: 0;',
    '  width: 100%;',
    '  min-height: 100%;',
    '  background: transparent;',
    '}',
    'body {',
    '  font: 15px/1.7 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;',
    '  color: var(--chips-sys-color-on-surface, #111111);',
    '  overflow: hidden;',
    '}',
    '[data-chips-basecard-frame-root] {',
    '  width: 100%;',
    '  min-height: 0;',
    '}',
    '.chips-basecard {',
    '  box-sizing: border-box;',
    '  width: 100%;',
    '  background: var(--chips-comp-card-shell-root-surface, var(--chips-sys-color-surface, #ffffff));',
    '  padding: 22px 24px;',
    '}',
    '.chips-basecard__body { color: var(--chips-sys-color-on-surface, #111111); }',
    '.chips-basecard__body > :first-child { margin-top: 0; }',
    '.chips-basecard__body > :last-child { margin-bottom: 0; }',
    '.chips-basecard__body a { color: var(--chips-sys-color-primary, #2563eb); }',
    '.chips-basecard__body img { max-width: 100%; height: auto; border-radius: 10px; }',
    '.chips-basecard__body blockquote {',
    '  margin: 16px 0;',
    '  padding: 0 0 0 16px;',
    '  border-left: 3px solid var(--chips-comp-card-shell-border-color, rgba(17, 17, 17, 0.16));',
    '}',
    '.chips-basecard__body hr {',
    '  border: none;',
    '  border-top: 1px solid var(--chips-comp-card-shell-border-color, rgba(17, 17, 17, 0.16));',
    '  margin: 18px 0;',
    '}',
    '.chips-basecard__body code {',
    '  padding: 1px 6px;',
    '  border-radius: 6px;',
    '  background: rgba(0, 0, 0, 0.05);',
    '}',
    '.chips-basecard__body pre {',
    '  overflow: auto;',
    '  padding: 14px;',
    '  border-radius: 10px;',
    '  background: rgba(0, 0, 0, 0.05);',
    '}',
  ].filter(Boolean).join('\n');
}

