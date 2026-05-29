import { describe, expect, it } from 'vitest';
import {
  applyInteractiveKey,
  createInteractiveModel,
  decodeInteractiveKeys,
  getInteractiveView,
  renderInteractiveScreen,
  tokenizeInteractiveCommandLine,
  type InteractiveCliCommandView,
  type InteractiveModel
} from '../../src/main/cli/interactive';
import { BUILTIN_INTERACTIVE_COMMANDS } from '../../src/main/cli/builtin-commands';

const stripAnsi = (value: string): string => value.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '');

const isCombiningCodePoint = (codePoint: number): boolean => (
  (codePoint >= 0x0300 && codePoint <= 0x036f) ||
  (codePoint >= 0x1ab0 && codePoint <= 0x1aff) ||
  (codePoint >= 0x1dc0 && codePoint <= 0x1dff) ||
  (codePoint >= 0x20d0 && codePoint <= 0x20ff) ||
  (codePoint >= 0xfe20 && codePoint <= 0xfe2f)
);

const isWideCodePoint = (codePoint: number): boolean => (
  codePoint >= 0x1100 && (
    codePoint <= 0x115f ||
    codePoint === 0x2329 ||
    codePoint === 0x232a ||
    (codePoint >= 0x2e80 && codePoint <= 0xa4cf && codePoint !== 0x303f) ||
    (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
    (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
    (codePoint >= 0xfe10 && codePoint <= 0xfe19) ||
    (codePoint >= 0xfe30 && codePoint <= 0xfe6f) ||
    (codePoint >= 0xff00 && codePoint <= 0xff60) ||
    (codePoint >= 0xffe0 && codePoint <= 0xffe6) ||
    (codePoint >= 0x1f300 && codePoint <= 0x1faff) ||
    (codePoint >= 0x20000 && codePoint <= 0x3fffd)
  )
);

const displayWidth = (value: string): number => [...stripAnsi(value)].reduce((total, character) => {
  const codePoint = character.codePointAt(0);
  if (typeof codePoint !== 'number') {
    return total;
  }
  if (codePoint === 0 || codePoint < 32 || (codePoint >= 0x7f && codePoint < 0xa0)) {
    return total;
  }
  if (codePoint === 0x200d || codePoint === 0xfe0e || codePoint === 0xfe0f || isCombiningCodePoint(codePoint)) {
    return total;
  }
  return total + (isWideCodePoint(codePoint) ? 2 : 1);
}, 0);

const createCommand = (
  commandPath: string[],
  overrides: Partial<InteractiveCliCommandView['declaration']> = {}
): InteractiveCliCommandView => ({
  commandId: `chips.test.cli.${commandPath.join('.')}`,
  commandPath,
  commandPathKey: commandPath.join(' '),
  owner: {
    pluginId: 'chips.test.plugin',
    pluginType: 'module',
    pluginName: 'Test Plugin',
    pluginVersion: '1.0.0'
  },
  enabled: true,
  declaration: {
    commandId: `chips.test.cli.${commandPath.join('.')}`,
    commandPath,
    titleKey: 'cli.test.title',
    examples: [],
    permissions: [],
    target: {
      type: 'module',
      capability: 'test.run',
      method: 'run'
    },
    arguments: [],
    options: [],
    ...overrides
  }
});

const createBuildCommand = (): InteractiveCliCommandView => createCommand(['build'], {
  options: [
    {
      name: 'parallel',
      type: 'integer',
      required: true,
      mapsTo: 'parallel',
      ui: {
        control: 'slider',
        min: 1,
        max: 8,
        step: 1
      }
    },
    {
      name: 'tag',
      type: 'string',
      required: true,
      mapsTo: 'tag',
      ui: {
        control: 'pasteBox'
      }
    },
    {
      name: 'verbose',
      type: 'boolean',
      mapsTo: 'verbose'
    },
    {
      name: 'dry-run',
      type: 'boolean',
      mapsTo: 'dryRun'
    }
  ]
});

describe('interactive cli model', () => {
  it('tokenizes quoted command lines and keeps whitespace state', () => {
    expect(tokenizeInteractiveCommandLine('icon generate "app icon.svg" ')).toEqual({
      tokens: ['icon', 'generate', 'app icon.svg'],
      endsWithWhitespace: true
    });
  });

  it('browses command segments and completes with enter', () => {
    let model = createInteractiveModel([
      createCommand(['icon', 'generate']),
      createCommand(['icon', 'inspect'])
    ]);

    expect(getInteractiveView(model).items.map((item) => item.label)).toEqual(['icon']);

    model = applyInteractiveKey(model, { name: 'enter' }).model;
    expect(model.tokens).toEqual(['icon']);
    expect(getInteractiveView(model).items.map((item) => item.label)).toEqual(['generate', 'inspect']);

    model = applyInteractiveKey(model, { name: 'enter' }).model;
    expect(model.tokens).toEqual(['icon', 'generate']);
    expect(getInteractiveView(model).executable).toBe(true);
  });

  it('includes system commands in the top-level TUI tree', () => {
    const model = createInteractiveModel([], BUILTIN_INTERACTIVE_COMMANDS);
    const view = getInteractiveView(model);

    expect(view.items.map((item) => item.label)).toEqual(
      expect.arrayContaining(['help', 'plugin', 'status', 'theme'])
    );

    let next = { ...model, tokens: ['plugin'] };
    expect(getInteractiveView(next).items.map((item) => item.label)).toEqual(
      expect.arrayContaining(['install', 'list'])
    );

    next = { ...next, tokens: ['plugin', 'install'] };
    const exact = getInteractiveView(next);
    expect(exact.status).toContain('缺少 manifestPath');
    expect(exact.items.map((item) => item.label)).toEqual(['<manifestPath>']);
  });

  it('uses a generic no-match status for system and plugin command browsing', () => {
    const model = { ...createInteractiveModel([], BUILTIN_INTERACTIVE_COMMANDS), tokens: ['chips'] };
    expect(getInteractiveView(model).status).toBe('没有匹配的命令。');
  });

  it('executes complete commands with Enter', () => {
    const model = { ...createInteractiveModel([], BUILTIN_INTERACTIVE_COMMANDS), tokens: ['status'] };
    expect(getInteractiveView(model).executable).toBe(true);

    const updated = applyInteractiveKey(model, { name: 'enter' });
    expect(updated.effect).toMatchObject({
      kind: 'execute',
      tokens: ['status'],
      commandLine: 'chips status'
    });
  });

  it('walks required slider and paste input controls before execution', () => {
    let model = createInteractiveModel([createBuildCommand()]);
    model = applyInteractiveKey(model, { name: 'enter' }).model;

    expect(model.tokens).toEqual(['build']);
    expect(model.mode).toBe('slider');
    expect(getInteractiveView(model).title).toContain('parallel');

    model = applyInteractiveKey(model, { name: 'right' }).model;
    model = applyInteractiveKey(model, { name: 'right' }).model;
    model = applyInteractiveKey(model, { name: 'right' }).model;
    model = applyInteractiveKey(model, { name: 'enter' }).model;
    expect(model.tokens).toEqual(['build', '--parallel=4']);
    expect(model.mode).toBe('input');

    for (const character of 'myapp:1.0') {
      model = applyInteractiveKey(model, { name: 'char', value: character }).model;
    }
    model = applyInteractiveKey(model, { name: 'enter' }).model;

    expect(model.tokens).toEqual(['build', '--parallel=4', '--tag=myapp:1.0']);
    expect(getInteractiveView(model).executable).toBe(true);
    const updated = applyInteractiveKey(model, { name: 'enter' });
    expect(updated.effect).toMatchObject({
      kind: 'execute',
      tokens: ['build', '--parallel=4', '--tag=myapp:1.0'],
      commandLine: 'chips build --parallel=4 --tag=myapp:1.0'
    });
  });

  it('keeps Backspace inside text input scoped to text editing', () => {
    let model = {
      ...createInteractiveModel([createCommand(['open'], {
        arguments: [
          {
            name: 'targetPath',
            position: 0,
            type: 'path',
            required: true,
            mapsTo: 'targetPath',
            ui: { control: 'pathInput' }
          }
        ]
      })]),
      tokens: ['open']
    };
    model = applyInteractiveKey(model, { name: 'enter' }).model;
    expect(model.mode).toBe('input');

    for (const character of '/tmp/a') {
      model = applyInteractiveKey(model, { name: 'char', value: character }).model;
    }
    model = applyInteractiveKey(model, { name: 'backspace' }).model;

    expect(model.mode).toBe('input');
    expect(model.input?.value).toBe('/tmp/');
    expect(model.tokens).toEqual(['open']);
  });

  it('uses checklist mode for optional boolean flags', () => {
    let model = {
      ...createInteractiveModel([createBuildCommand()]),
      tokens: ['build', '--parallel=4', '--tag=myapp:1.0']
    };
    expect(getInteractiveView(model).items.map((item) => item.label)).toEqual(['命令已完整', '附加选项']);

    model = applyInteractiveKey(model, { name: 'down' }).model;
    model = applyInteractiveKey(model, { name: 'enter' }).model;
    expect(model.mode).toBe('checklist');
    expect(stripAnsi(renderInteractiveScreen(model))).toContain('[ ] --verbose');

    model = applyInteractiveKey(model, { name: 'space' }).model;
    model = applyInteractiveKey(model, { name: 'down' }).model;
    model = applyInteractiveKey(model, { name: 'space' }).model;
    model = applyInteractiveKey(model, { name: 'enter' }).model;

    expect(model.tokens).toEqual(['build', '--parallel=4', '--tag=myapp:1.0', '--verbose', '--dry-run']);
  });

  it('resets command construction with Ctrl+C and exits with Ctrl+backslash', () => {
    let model = { ...createInteractiveModel([createCommand(['icon', 'generate'])]), tokens: ['icon'] };
    model = applyInteractiveKey(model, { name: 'ctrl+c' }).model;
    expect(model.tokens).toEqual([]);
    expect(model.mode).toBe('browse');

    const exit = applyInteractiveKey(model, { name: 'ctrl+backslash' });
    expect(exit.effect).toEqual({ kind: 'exit', code: 0 });
  });

  it('ignores unsupported modified Enter sequences and decodes Ctrl+backslash', () => {
    expect(decodeInteractiveKeys('\u001b[13;5u')).toEqual([]);
    expect(decodeInteractiveKeys('\u001c')).toEqual([{ name: 'ctrl+backslash' }]);
  });

  it('renders the three-region TUI with command and hint bars', () => {
    const model = createInteractiveModel([createBuildCommand()]);
    const screen = stripAnsi(renderInteractiveScreen(model, 88));

    expect(screen).toContain('chips >');
    expect(screen).toContain('请选择指令');
    expect(screen).toContain('快捷键');
    expect(screen).toContain('命令完整后 Enter 执行');
    expect(screen).toContain('╭');
    expect(screen).toContain('╰');
  });

  it('keeps framed layout stable for narrow terminals and wide glyphs', () => {
    const model = {
      ...createInteractiveModel([
        createCommand(['部署', '构建'], {
          options: [
            {
              name: 'tag',
              type: 'string',
              required: true,
              mapsTo: 'tag',
              ui: { control: 'pasteBox' }
            }
          ]
        }),
        createCommand(['emoji', '✅'])
      ])
    };

    const screen = renderInteractiveScreen(model, 40);
    const plainLines = screen.split('\n');

    expect(screen).not.toMatch(/\u001b\[[0-?]*[ -/]*[@-~]/);
    expect(plainLines[0]).toBe(`╭${'─'.repeat(38)}╮`);
    expect(plainLines.at(-1)).toBe(`╰${'─'.repeat(38)}╯`);
    for (const line of screen.split('\n')) {
      expect(displayWidth(line)).toBeLessThanOrEqual(40);
    }
  });

  it('fits rendering inside short terminal heights without overflow', () => {
    const model = createInteractiveModel([
      createCommand(['alpha']),
      createCommand(['beta']),
      createCommand(['gamma']),
      createCommand(['delta']),
      createCommand(['epsilon'])
    ]);

    const screen = renderInteractiveScreen(model, 44, 12);
    const lines = screen.split('\n');

    expect(screen).not.toMatch(/\u001b\[[0-?]*[ -/]*[@-~]/);
    expect(lines).toHaveLength(12);
    expect(lines[0]).toBe(`╭${'─'.repeat(42)}╮`);
    expect(lines.at(-1)).toBe(`╰${'─'.repeat(42)}╯`);
    for (const line of lines) {
      expect(displayWidth(line)).toBeLessThanOrEqual(44);
    }
  });

  it('renders result panels with scroll and rerun controls', () => {
    let model: InteractiveModel = {
      ...createInteractiveModel([createBuildCommand()]),
      mode: 'result' as const,
      result: {
        commandLine: 'chips build --parallel=4 --tag=myapp:1.0',
        tokens: ['build', '--parallel=4', '--tag=myapp:1.0'],
        code: 0,
        output: Array.from({ length: 20 }, (_, index) => `line ${index + 1}`).join('\n'),
        durationMs: 2300,
        scrollOffset: 0
      }
    };

    const screen = stripAnsi(renderInteractiveScreen(model, 88));
    expect(screen).toContain('执行结果');
    expect(screen).toContain('状态: 成功');
    expect(screen).toContain('Enter 返回构建界面');

    model = applyInteractiveKey(model, { name: 'down' }).model;
    expect(model.result?.scrollOffset).toBe(1);

    const rerun = applyInteractiveKey(model, { name: 'char', value: 'r' });
    expect(rerun.effect).toMatchObject({
      kind: 'execute',
      tokens: ['build', '--parallel=4', '--tag=myapp:1.0']
    });
  });
});
