export type YamlValue = string | number | boolean | null | YamlValue[] | { [key: string]: YamlValue };

const parseScalar = (raw: string): YamlValue => {
  const value = raw.trim();
  if (value === 'null') {
    return null;
  }
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  if (/^-?\d+$/.test(value)) {
    return Number(value);
  }
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
};

export const parseYamlLite = (text: string): Record<string, YamlValue> => {
  const root: Record<string, YamlValue> = {};
  const stack: Array<{ indent: number; container: Record<string, YamlValue> | YamlValue[]; lastKey?: string }> = [
    { indent: -1, container: root }
  ];

  const lines = text.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, '  ');
    if (!line.trim() || line.trim().startsWith('#')) {
      continue;
    }

    const indent = line.match(/^\s*/)?.[0].length ?? 0;
    const content = line.trim();

    while (stack.length > 1 && indent <= stack[stack.length - 1]!.indent) {
      stack.pop();
    }

    const frame = stack[stack.length - 1]!;

    if (content.startsWith('- ')) {
      const itemValue = parseScalar(content.slice(2));
      if (!Array.isArray(frame.container)) {
        if (!frame.lastKey || typeof frame.container !== 'object') {
          throw new Error('Invalid list placement in YAML content');
        }
        const nextArray: YamlValue[] = [];
        (frame.container as Record<string, YamlValue>)[frame.lastKey] = nextArray;
        frame.container = nextArray;
      }
      (frame.container as YamlValue[]).push(itemValue);
      continue;
    }

    const separatorIndex = content.indexOf(':');
    if (separatorIndex < 0) {
      continue;
    }

    const key = content.slice(0, separatorIndex).trim();
    const valueText = content.slice(separatorIndex + 1).trim();

    if (Array.isArray(frame.container)) {
      throw new Error('Cannot assign key-value inside scalar array item');
    }

    if (valueText === '') {
      const child: Record<string, YamlValue> = {};
      frame.container[key] = child;
      frame.lastKey = key;
      stack.push({ indent, container: child });
      continue;
    }

    frame.container[key] = parseScalar(valueText);
    frame.lastKey = key;
  }

  return root;
};

export const stringifyYamlLite = (input: Record<string, YamlValue>, indent = 0): string => {
  const lines: string[] = [];
  const prefix = ' '.repeat(indent);

  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) {
      lines.push(`${prefix}${key}:`);
      for (const item of value) {
        lines.push(`${prefix}  - ${String(item)}`);
      }
      continue;
    }

    if (value && typeof value === 'object') {
      lines.push(`${prefix}${key}:`);
      lines.push(stringifyYamlLite(value as Record<string, YamlValue>, indent + 2));
      continue;
    }

    lines.push(`${prefix}${key}: ${String(value)}`);
  }

  return lines.filter((line) => line.length > 0).join('\n');
};
