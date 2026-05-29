import type { ReadStream, WriteStream } from 'node:tty';
import type { CliCommandManifestMeta, CliCommandParameterManifestMeta } from '../../runtime';
import type { BuiltinCliCommandDefinition } from './builtin-commands';

export interface InteractiveCliCommandView {
  commandId: string;
  commandPath: string[];
  commandPathKey: string;
  owner: {
    pluginId: string;
    pluginType: 'app' | 'card' | 'layout' | 'module' | 'theme';
    pluginName: string;
    pluginVersion: string;
    source?: 'official' | 'third-party' | 'local';
  };
  enabled: boolean;
  declaration: CliCommandManifestMeta;
  system?: {
    description: string;
  };
}

export type InteractiveKey =
  | { name: 'up' }
  | { name: 'down' }
  | { name: 'left' }
  | { name: 'right' }
  | { name: 'enter' }
  | { name: 'backspace' }
  | { name: 'space' }
  | { name: 'ctrl+c' }
  | { name: 'ctrl+backslash' }
  | { name: 'char'; value: string };

export type InteractiveItemKind = 'segment' | 'owner' | 'parameter' | 'flag-group' | 'complete';

export interface InteractiveParameterRef {
  kind: 'argument' | 'option';
  parameter: CliCommandParameterManifestMeta;
}

export interface InteractiveItem {
  kind: InteractiveItemKind;
  label: string;
  description: string;
  segment?: string;
  command?: InteractiveCliCommandView;
  parameter?: InteractiveParameterRef;
  flags?: InteractiveParameterRef[];
}

export interface InteractiveInputState {
  parameter: InteractiveParameterRef;
  value: string;
  cursor: number;
}

export interface InteractiveSelectionState {
  parameter: InteractiveParameterRef;
  selectedIndex: number;
}

export interface InteractiveSliderState {
  parameter: InteractiveParameterRef;
  value: number;
}

export interface InteractiveChecklistState {
  title: string;
  parameters?: InteractiveParameterRef[];
  parameter?: InteractiveParameterRef;
  selectedIndex: number;
  selectedValues: string[];
}

export interface InteractiveExecutionState {
  commandLine: string;
  tokens: string[];
  pluginId?: string;
  startedAt: number;
  outputLines: string[];
  errorLines: string[];
  progress?: number;
  cancelRequested?: boolean;
}

export interface InteractiveResultState {
  commandLine: string;
  tokens: string[];
  pluginId?: string;
  code: number;
  output: string;
  errorOutput?: string;
  durationMs: number;
  scrollOffset: number;
  cancelled?: boolean;
}

export interface InteractiveMessage {
  kind: 'error' | 'info';
  text: string;
}

export interface InteractiveModel {
  commands: InteractiveCliCommandView[];
  tokens: string[];
  pluginId?: string;
  selectedIndex: number;
  mode: 'browse' | 'input' | 'select' | 'slider' | 'checklist' | 'executing' | 'result';
  input?: InteractiveInputState;
  selection?: InteractiveSelectionState;
  slider?: InteractiveSliderState;
  checklist?: InteractiveChecklistState;
  execution?: InteractiveExecutionState;
  result?: InteractiveResultState;
  message?: InteractiveMessage;
}

export interface InteractiveView {
  commandLine: string;
  shellCommandLine: string;
  title: string;
  status: string;
  items: InteractiveItem[];
  selectedIndex: number;
  mode: InteractiveModel['mode'] | 'complete';
  guidance: string;
  detail: string;
  executable: boolean;
}

export type InteractiveEffect =
  | { kind: 'execute'; tokens: string[]; pluginId?: string; commandLine: string }
  | { kind: 'cancel-execution' }
  | { kind: 'exit'; code: number };

export interface InteractiveUpdate {
  model: InteractiveModel;
  effect?: InteractiveEffect;
}

export interface InteractiveExecutionRequest {
  tokens: string[];
  pluginId?: string;
  commandLine: string;
  signal?: AbortSignal;
  onOutput?: (chunk: string) => void;
  onErrorOutput?: (chunk: string) => void;
}

export interface InteractiveExecutionResult {
  code: number;
  output: string;
  errorOutput?: string;
}

export interface InteractiveSessionOptions {
  commands: InteractiveCliCommandView[];
  builtinCommands?: BuiltinCliCommandDefinition[];
  stdin: ReadStream;
  stdout: WriteStream;
  execute: (request: InteractiveExecutionRequest) => Promise<InteractiveExecutionResult>;
}

interface TokenizedLine {
  tokens: string[];
  endsWithWhitespace: boolean;
}

interface InvocationAnalysis {
  positional: string[];
  optionsWithValues: Set<string>;
}

interface BrowseState {
  title: string;
  status: string;
  items: InteractiveItem[];
  executable: boolean;
}

const CONTROL_SEQUENCE_KEYS = new Map<string, InteractiveKey>([
  ['\u001b[A', { name: 'up' }],
  ['\u001b[B', { name: 'down' }],
  ['\u001b[D', { name: 'left' }],
  ['\u001b[C', { name: 'right' }]
]);

const IGNORED_CONTROL_SEQUENCES = new Set([
  '\u001b[13;5u',
  '\u001b\r',
  '\u001b\n'
]);

const ANSI_PATTERN = /\u001b\[[0-?]*[ -/]*[@-~]/g;
const DEFAULT_TERMINAL_WIDTH = 88;
const MIN_TERMINAL_WIDTH = 12;
const MAX_TERMINAL_WIDTH = 120;
const MIN_FULL_TERMINAL_HEIGHT = 10;
const RESULT_OUTPUT_HEIGHT = 12;
const EXECUTION_OUTPUT_HEIGHT = 8;

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const stripAnsi = (value: string): string => value.replace(ANSI_PATTERN, '');

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

const cellWidth = (character: string): number => {
  const codePoint = character.codePointAt(0);
  if (typeof codePoint !== 'number') {
    return 0;
  }
  if (codePoint === 0 || codePoint < 32 || (codePoint >= 0x7f && codePoint < 0xa0)) {
    return 0;
  }
  if (codePoint === 0x200d || codePoint === 0xfe0e || codePoint === 0xfe0f || isCombiningCodePoint(codePoint)) {
    return 0;
  }
  return isWideCodePoint(codePoint) ? 2 : 1;
};

const visibleLength = (value: string): number => [...stripAnsi(value)].reduce((total, character) => total + cellWidth(character), 0);

const truncatePlainToWidth = (value: string, width: number): string => {
  if (width <= 0) {
    return '';
  }
  const ellipsis = width > 1 ? '…' : '';
  const targetWidth = width - visibleLength(ellipsis);
  let used = 0;
  let output = '';
  for (const character of value) {
    const charWidth = cellWidth(character);
    if (used + charWidth > targetWidth) {
      break;
    }
    output += character;
    used += charWidth;
  }
  return `${output}${ellipsis}`;
};

const padAnsi = (value: string, width: number): string => {
  const visible = visibleLength(value);
  if (visible >= width) {
    const plain = stripAnsi(value);
    return truncatePlainToWidth(plain, width);
  }
  return `${value}${' '.repeat(width - visible)}`;
};

const stringifyChoice = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
};

const getParameterChoices = (parameter: CliCommandParameterManifestMeta): string[] => {
  return [...(parameter.choices ?? parameter.ui?.choices ?? [])].map(stringifyChoice);
};

const getParameterControl = (parameter: CliCommandParameterManifestMeta): string => {
  if (parameter.ui?.control) {
    return parameter.ui.control;
  }
  if (parameter.type === 'enum') {
    return 'select';
  }
  if (parameter.type === 'stringList') {
    return 'multiSelect';
  }
  if (parameter.type === 'boolean') {
    return 'toggle';
  }
  if (parameter.type === 'integer' || parameter.type === 'number') {
    return 'slider';
  }
  if (parameter.type === 'path') {
    return 'pathInput';
  }
  if (parameter.type === 'json' || parameter.type === 'text') {
    return 'pasteBox';
  }
  return 'textarea';
};

const compareCommandPath = (left: InteractiveCliCommandView, right: InteractiveCliCommandView): number => {
  const byPath = left.commandPathKey.localeCompare(right.commandPathKey);
  if (byPath !== 0) {
    return byPath;
  }
  return left.commandId.localeCompare(right.commandId);
};

const createBuiltinInteractiveCommand = (definition: BuiltinCliCommandDefinition): InteractiveCliCommandView => {
  const commandPathKey = definition.commandPath.join(' ');
  const commandId = `chips.system.${definition.commandPath.join('.')}`;
  return {
    commandId,
    commandPath: definition.commandPath,
    commandPathKey,
    owner: {
      pluginId: 'chips.system',
      pluginType: 'module',
      pluginName: 'Chips System',
      pluginVersion: '0.1.0',
      source: 'official'
    },
    enabled: true,
    system: {
      description: definition.description
    },
    declaration: {
      commandId,
      commandPath: definition.commandPath,
      titleKey: `cli.system.${definition.commandPath.join('.')}.title`,
      descriptionKey: `cli.system.${definition.commandPath.join('.')}.description`,
      examples: [],
      permissions: [],
      target: {
        type: 'module',
        capability: 'host.cli',
        method: commandPathKey
      },
      arguments: definition.arguments ?? [],
      options: definition.options ?? []
    }
  };
};

export const createInteractiveModel = (
  commands: InteractiveCliCommandView[],
  builtinCommands: BuiltinCliCommandDefinition[] = []
): InteractiveModel => ({
  commands: [
    ...builtinCommands.map(createBuiltinInteractiveCommand),
    ...commands
  ].filter((command) => command.enabled).sort(compareCommandPath),
  tokens: [],
  selectedIndex: 0,
  mode: 'browse'
});

export const tokenizeInteractiveCommandLine = (line: string): TokenizedLine => {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | undefined;
  let escaping = false;

  for (const character of line) {
    if (escaping) {
      current += character;
      escaping = false;
      continue;
    }
    if (character === '\\') {
      escaping = true;
      continue;
    }
    if (quote) {
      if (character === quote) {
        quote = undefined;
      } else {
        current += character;
      }
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (/\s/.test(character)) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
      continue;
    }
    current += character;
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return {
    tokens,
    endsWithWhitespace: /\s$/.test(line)
  };
};

export const quoteInteractiveToken = (token: string): string => {
  if (token.length === 0) {
    return '""';
  }
  if (/^[A-Za-z0-9._/:=@%+,-]+$/.test(token)) {
    return token;
  }
  return JSON.stringify(token);
};

const buildShellCommandLine = (tokens: string[], pluginId?: string): string => {
  const prefix = pluginId ? ['--plugin', pluginId] : [];
  return ['chips', ...prefix, ...tokens].map(quoteInteractiveToken).join(' ');
};

const buildDisplayCommandLine = (tokens: string[], pluginId?: string, pending = ''): string => {
  const prefix = pluginId ? ['--plugin', pluginId] : [];
  const body = [...prefix, ...tokens].map(quoteInteractiveToken).join(' ');
  const pendingText = pending.length > 0 ? `${body ? ' ' : ''}${pending}` : '';
  return `chips >${body || pendingText ? ' ' : ''}${body}${pendingText}`;
};

const commandPathStartsWith = (command: InteractiveCliCommandView, prefix: string[]): boolean => {
  if (prefix.length > command.commandPath.length) {
    return false;
  }
  return prefix.every((segment, index) => command.commandPath[index]?.toLowerCase() === segment.toLowerCase());
};

const commandPathEquals = (command: InteractiveCliCommandView, tokens: string[]): boolean => {
  if (tokens.length < command.commandPath.length) {
    return false;
  }
  return command.commandPath.every((segment, index) => tokens[index]?.toLowerCase() === segment.toLowerCase());
};

const getExactCommands = (model: InteractiveModel, tokens = model.tokens): InteractiveCliCommandView[] => {
  return model.commands
    .filter((command) => commandPathEquals(command, tokens))
    .filter((command) => !model.pluginId || command.owner.pluginId === model.pluginId)
    .sort(compareCommandPath);
};

const isDeclaredOptionToken = (
  token: string,
  byLong: Map<string, CliCommandParameterManifestMeta>,
  byShort: Map<string, CliCommandParameterManifestMeta>
): boolean => {
  if (token.startsWith('--no-')) {
    return byLong.get(token.slice('--no-'.length))?.type === 'boolean';
  }
  if (token.startsWith('--')) {
    const [name = ''] = token.slice(2).split(/=(.*)/s, 2);
    return byLong.has(name);
  }
  if (token.startsWith('-') && token.length > 1) {
    return byShort.has(token.slice(1, 2));
  }
  return false;
};

const analyzeInvocation = (
  command: InteractiveCliCommandView,
  invocationTokens: string[]
): InvocationAnalysis => {
  const positional: string[] = [];
  const optionsWithValues = new Set<string>();
  const options = command.declaration.options;
  const byLong = new Map(options.map((parameter) => [parameter.name, parameter]));
  const byShort = new Map(options.filter((parameter) => parameter.short).map((parameter) => [parameter.short!, parameter]));

  for (let index = 0; index < invocationTokens.length; index += 1) {
    const token = invocationTokens[index]!;
    if (token === '--') {
      positional.push(...invocationTokens.slice(index + 1));
      break;
    }
    if (token.startsWith('--no-')) {
      const name = token.slice('--no-'.length);
      if (byLong.get(name)?.type === 'boolean') {
        optionsWithValues.add(name);
        continue;
      }
    }
    if (token.startsWith('--')) {
      const [name = '', inlineValue] = token.slice(2).split(/=(.*)/s, 2);
      const parameter = byLong.get(name);
      if (!parameter) {
        continue;
      }
      if (parameter.type === 'boolean') {
        optionsWithValues.add(parameter.name);
        continue;
      }
      if (typeof inlineValue === 'string' && inlineValue.length > 0) {
        optionsWithValues.add(parameter.name);
        continue;
      }
      const nextToken = invocationTokens[index + 1];
      if (nextToken && !isDeclaredOptionToken(nextToken, byLong, byShort)) {
        optionsWithValues.add(parameter.name);
        index += 1;
      }
      continue;
    }
    if (token.startsWith('-') && token.length > 1) {
      const short = token.slice(1, 2);
      const parameter = byShort.get(short);
      if (!parameter) {
        continue;
      }
      if (parameter.type === 'boolean') {
        optionsWithValues.add(parameter.name);
        continue;
      }
      if (token.length > 2) {
        optionsWithValues.add(parameter.name);
        continue;
      }
      const nextToken = invocationTokens[index + 1];
      if (nextToken && !isDeclaredOptionToken(nextToken, byLong, byShort)) {
        optionsWithValues.add(parameter.name);
        index += 1;
      }
      continue;
    }
    positional.push(token);
  }

  return { positional, optionsWithValues };
};

const getInvocationTokens = (command: InteractiveCliCommandView, tokens: string[]): string[] => {
  return tokens.slice(command.commandPath.length);
};

const getMissingRequiredParameters = (
  command: InteractiveCliCommandView,
  invocationTokens: string[]
): InteractiveParameterRef[] => {
  const analysis = analyzeInvocation(command, invocationTokens);
  const missing: InteractiveParameterRef[] = [];
  const args = [...command.declaration.arguments].sort((left, right) => (left.position ?? 0) - (right.position ?? 0));

  for (const [index, parameter] of args.entries()) {
    const position = parameter.position ?? index;
    if (parameter.required && typeof parameter.default === 'undefined' && typeof analysis.positional[position] === 'undefined') {
      missing.push({ kind: 'argument', parameter });
    }
  }

  for (const parameter of command.declaration.options) {
    if (
      parameter.required &&
      typeof parameter.default === 'undefined' &&
      !analysis.optionsWithValues.has(parameter.name)
    ) {
      missing.push({ kind: 'option', parameter });
    }
  }

  return missing;
};

const getUnusedOptionalParameters = (
  command: InteractiveCliCommandView,
  invocationTokens: string[]
): InteractiveParameterRef[] => {
  const analysis = analyzeInvocation(command, invocationTokens);
  const argumentItems = [...command.declaration.arguments]
    .sort((left, right) => (left.position ?? 0) - (right.position ?? 0))
    .filter((parameter) => !parameter.required)
    .map((parameter) => ({ kind: 'argument' as const, parameter }));
  const optionItems = command.declaration.options
    .filter((parameter) => !analysis.optionsWithValues.has(parameter.name))
    .filter((parameter) => !parameter.required)
    .map((parameter) => ({ kind: 'option' as const, parameter }));
  return [...argumentItems, ...optionItems];
};

const parameterLabel = (ref: InteractiveParameterRef): string => {
  if (ref.kind === 'argument') {
    return `<${ref.parameter.name}>`;
  }
  return `--${ref.parameter.name}`;
};

const parameterTitle = (ref: InteractiveParameterRef): string => {
  if (ref.kind === 'argument') {
    return ref.parameter.name;
  }
  return ref.parameter.name;
};

const describeCommand = (command: InteractiveCliCommandView): string => {
  if (command.system) {
    return `系统 · ${command.system.description}`;
  }
  return `${command.owner.pluginId} · ${command.declaration.target.type}`;
};

const describeParameter = (ref: InteractiveParameterRef): string => {
  const parts = [
    ref.kind === 'argument' ? '参数' : '选项',
    ref.parameter.type,
    getParameterControl(ref.parameter)
  ];
  if (ref.parameter.required) {
    parts.push('必填');
  }
  if (typeof ref.parameter.default !== 'undefined') {
    parts.push(`默认 ${stringifyChoice(ref.parameter.default)}`);
  }
  return parts.join(' · ');
};

const createParameterItem = (ref: InteractiveParameterRef): InteractiveItem => ({
  kind: 'parameter',
  label: parameterLabel(ref),
  description: describeParameter(ref),
  parameter: ref
});

const createFlagGroupItem = (flags: InteractiveParameterRef[]): InteractiveItem => ({
  kind: 'flag-group',
  label: '附加选项',
  description: `${flags.map((flag) => parameterLabel(flag)).join(' / ')}`,
  flags
});

const isBooleanOptionRef = (ref: InteractiveParameterRef): boolean => ref.kind === 'option' && ref.parameter.type === 'boolean';

const getBrowseState = (model: InteractiveModel): BrowseState => {
  const exactCommands = getExactCommands(model);
  const exactCommand = exactCommands.length === 1 ? exactCommands[0] : undefined;
  if (exactCommands.length > 1) {
    return {
      title: '请选择命令来源',
      status: `命令 ${model.tokens.join(' ')} 存在多个插件来源。`,
      executable: false,
      items: exactCommands.map((command) => ({
        kind: 'owner',
        label: command.owner.pluginId,
        description: `${command.owner.pluginName} ${command.owner.pluginVersion}`,
        command
      }))
    };
  }

  if (exactCommand) {
    const invocationTokens = getInvocationTokens(exactCommand, model.tokens);
    const missing = getMissingRequiredParameters(exactCommand, invocationTokens);
    if (missing.length > 0) {
      return {
        title: missing.length === 1 ? '请补充参数' : '请选择参数',
        status: `缺少 ${missing.map((ref) => ref.parameter.name).join(', ')}。`,
        executable: false,
        items: missing.map(createParameterItem)
      };
    }

    const optional = getUnusedOptionalParameters(exactCommand, invocationTokens);
    const booleanOptions = optional.filter(isBooleanOptionRef);
    const otherOptions = optional.filter((ref) => !isBooleanOptionRef(ref));
    const items: InteractiveItem[] = [{
      kind: 'complete',
      label: '命令已完整',
      description: describeCommand(exactCommand),
      command: exactCommand
    }];
    if (booleanOptions.length > 0) {
      items.push(createFlagGroupItem(booleanOptions));
    }
    items.push(...otherOptions.map(createParameterItem));
    return {
      title: '命令已完整',
      status: optional.length > 0 ? '按 Enter 执行，或选择附加参数继续补充。' : '按 Enter 执行。',
      executable: true,
      items
    };
  }

  const prefix = model.tokens;
  const segmentGroups = new Map<string, InteractiveCliCommandView[]>();
  for (const command of model.commands) {
    if (!commandPathStartsWith(command, prefix)) {
      continue;
    }
    const nextSegment = command.commandPath[prefix.length];
    if (!nextSegment) {
      continue;
    }
    const group = segmentGroups.get(nextSegment) ?? [];
    group.push(command);
    segmentGroups.set(nextSegment, group);
  }

  const items = [...segmentGroups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([segment, commands]) => {
      const leaf = commands.find((command) => command.commandPath.length === prefix.length + 1);
      return {
        kind: 'segment' as const,
        label: segment,
        description: leaf ? describeCommand(leaf) : `${commands.length} 条命令`,
        segment
      };
    });

  return {
    title: prefix.length === 0 ? '请选择指令' : '请选择下级指令',
    status: items.length > 0 ? '使用 ↑/↓ 移动，Enter 确认。' : '没有匹配的命令。',
    executable: false,
    items
  };
};

const getPendingCommandPreview = (model: InteractiveModel): string => {
  if (model.mode === 'input' && model.input) {
    const value = model.input.value;
    return model.input.parameter.kind === 'option'
      ? `--${model.input.parameter.parameter.name}=${value}`
      : value;
  }
  if (model.mode === 'slider' && model.slider) {
    return model.slider.parameter.kind === 'option'
      ? `--${model.slider.parameter.parameter.name}=${model.slider.value}`
      : String(model.slider.value);
  }
  if (model.mode === 'select' && model.selection) {
    const choices = getSelectChoices(model.selection.parameter.parameter);
    const value = choices[model.selection.selectedIndex] ?? '';
    return model.selection.parameter.kind === 'option'
      ? `--${model.selection.parameter.parameter.name}=${value}`
      : value;
  }
  return '';
};

const getSelectChoices = (parameter: CliCommandParameterManifestMeta): string[] => {
  const choices = getParameterChoices(parameter);
  if (choices.length > 0) {
    return choices;
  }
  if (parameter.type === 'boolean') {
    return ['true', 'false'];
  }
  return [];
};

const isExecutable = (model: InteractiveModel): boolean => {
  if (model.mode !== 'browse') {
    return false;
  }
  return getBrowseState(model).executable;
};

export const getInteractiveView = (model: InteractiveModel): InteractiveView => {
  const pending = getPendingCommandPreview(model);
  const commandLine = buildDisplayCommandLine(model.tokens, model.pluginId, pending);
  const shellCommandLine = buildShellCommandLine(model.tokens, model.pluginId);

  if (model.mode === 'result' && model.result) {
    return {
      commandLine: model.result.commandLine,
      shellCommandLine: model.result.commandLine,
      title: '执行结果',
      status: model.result.code === 0 && !model.result.cancelled ? '成功' : model.result.cancelled ? '已中止' : '失败',
      items: [],
      selectedIndex: 0,
      mode: 'result',
      guidance: '↑/↓ 滚动输出，Enter 返回构建界面，R 重新执行，Ctrl+C 退出。',
      detail: model.result.errorOutput?.trim() ? model.result.errorOutput.trim() : '错误: (无)',
      executable: false
    };
  }

  if (model.mode === 'executing' && model.execution) {
    return {
      commandLine: model.execution.commandLine,
      shellCommandLine: model.execution.commandLine,
      title: '实时输出',
      status: model.execution.cancelRequested ? '正在中止...' : '执行中',
      items: [],
      selectedIndex: 0,
      mode: 'executing',
      guidance: 'Ctrl+C 中止当前执行。',
      detail: '命令输出会实时滚动到下方结果区域。',
      executable: false
    };
  }

  if (model.mode === 'input' && model.input) {
    return {
      commandLine,
      shellCommandLine,
      title: `请输入${parameterTitle(model.input.parameter)}（支持粘贴）`,
      status: `${parameterLabel(model.input.parameter)} = ${model.input.value}`,
      items: [],
      selectedIndex: 0,
      mode: 'input',
      guidance: '可直接输入，Ctrl+V 粘贴，←/→ 移动光标，Enter 确认。',
      detail: describeParameter(model.input.parameter),
      executable: false
    };
  }

  if (model.mode === 'slider' && model.slider) {
    const parameter = model.slider.parameter.parameter;
    const min = getSliderMin(parameter);
    const max = getSliderMax(parameter, min);
    return {
      commandLine,
      shellCommandLine,
      title: `设置${parameterTitle(model.slider.parameter)} (${min}-${max})`,
      status: `${parameterLabel(model.slider.parameter)} = ${model.slider.value}`,
      items: [],
      selectedIndex: 0,
      mode: 'slider',
      guidance: '← 减小，→ 增大，Enter 确认。',
      detail: describeParameter(model.slider.parameter),
      executable: false
    };
  }

  if (model.mode === 'select' && model.selection) {
    const choices = getSelectChoices(model.selection.parameter.parameter);
    const items = choices.map((choice) => ({
      kind: 'parameter' as const,
      label: choice,
      description: describeParameter(model.selection!.parameter),
      parameter: model.selection!.parameter
    }));
    return {
      commandLine,
      shellCommandLine,
      title: '请选择参数值',
      status: `${parameterLabel(model.selection.parameter)} = ${choices[model.selection.selectedIndex] ?? ''}`,
      items,
      selectedIndex: model.selection.selectedIndex,
      mode: 'select',
      guidance: '↑/↓ 移动，Enter 确认。',
      detail: describeParameter(model.selection.parameter),
      executable: false
    };
  }

  if (model.mode === 'checklist' && model.checklist) {
    const items = getChecklistItems(model.checklist);
    return {
      commandLine,
      shellCommandLine,
      title: model.checklist.title,
      status: `已选择 ${model.checklist.selectedValues.length} 项。`,
      items,
      selectedIndex: model.checklist.selectedIndex,
      mode: 'checklist',
      guidance: '↑/↓ 或 ←/→ 移动，Space 切换，Enter 完成。',
      detail: '多选项会按空格连接追加到命令框。',
      executable: false
    };
  }

  const browse = getBrowseState(model);
  const selectedIndex = clamp(model.selectedIndex, 0, Math.max(0, browse.items.length - 1));
  const selected = browse.items[selectedIndex];
  return {
    commandLine,
    shellCommandLine,
    title: browse.title,
    status: browse.status,
    items: browse.items,
    selectedIndex,
    mode: browse.executable ? 'complete' : 'browse',
    guidance: describeBrowseGuidance(selected, browse.executable),
    detail: describeSelectedItem(selected),
    executable: browse.executable
  };
};

const describeBrowseGuidance = (selected: InteractiveItem | undefined, executable: boolean): string => {
  if (!selected) {
    return executable ? 'Enter 执行完整命令。' : '↑/↓ 移动，Enter 确认。';
  }
  if (selected.kind === 'complete') {
    return 'Enter 执行完整命令，Backspace 返回上级。';
  }
  if (selected.kind === 'parameter' && selected.parameter) {
    return `${parameterLabel(selected.parameter)}: Enter 进入参数控件。`;
  }
  if (selected.kind === 'flag-group') {
    return 'Enter 进入多选框，Space 切换附加选项。';
  }
  if (selected.kind === 'owner') {
    return 'Enter 选择这个插件来源。';
  }
  return '↑/↓ 移动，Enter 确认。';
};

const describeSelectedItem = (selected: InteractiveItem | undefined): string => {
  if (!selected) {
    return '当前没有候选。';
  }
  if (selected.kind === 'parameter' && selected.parameter) {
    return describeParameter(selected.parameter);
  }
  return selected.description;
};

const resetToInitial = (model: InteractiveModel): InteractiveModel => ({
  ...model,
  tokens: [],
  pluginId: undefined,
  selectedIndex: 0,
  mode: 'browse',
  input: undefined,
  selection: undefined,
  slider: undefined,
  checklist: undefined,
  execution: undefined,
  result: undefined,
  message: undefined
});

const withMessage = (model: InteractiveModel, text: string, kind: InteractiveMessage['kind'] = 'error'): InteractiveModel => ({
  ...model,
  message: { kind, text }
});

const clearMessage = (model: InteractiveModel): InteractiveModel => model.message ? { ...model, message: undefined } : model;

const withBrowseSelection = (model: InteractiveModel, selectedIndex: number): InteractiveModel => ({
  ...model,
  selectedIndex: Math.max(0, selectedIndex),
  message: undefined
});

const getSliderMin = (parameter: CliCommandParameterManifestMeta): number => {
  const min = parameter.ui?.min ?? parameter.validation?.min ?? 0;
  return Number.isFinite(min) ? min : 0;
};

const getSliderMax = (parameter: CliCommandParameterManifestMeta, min = getSliderMin(parameter)): number => {
  const max = parameter.ui?.max ?? parameter.validation?.max ?? Math.max(min + 10, 10);
  return Number.isFinite(max) ? max : Math.max(min + 10, 10);
};

const getSliderStep = (parameter: CliCommandParameterManifestMeta): number => {
  const step = parameter.ui?.step ?? 1;
  return Number.isFinite(step) && step > 0 ? step : 1;
};

const getDefaultNumericValue = (parameter: CliCommandParameterManifestMeta): number => {
  if (typeof parameter.default === 'number' && Number.isFinite(parameter.default)) {
    return parameter.default;
  }
  return getSliderMin(parameter);
};

const startParameterControl = (model: InteractiveModel, parameter: InteractiveParameterRef): InteractiveModel => {
  const control = getParameterControl(parameter.parameter);
  if (control === 'select' || control === 'toggle') {
    return {
      ...model,
      mode: 'select',
      selection: {
        parameter,
        selectedIndex: 0
      },
      selectedIndex: 0,
      message: undefined
    };
  }
  if (control === 'multiSelect') {
    const defaultValues = Array.isArray(parameter.parameter.default)
      ? parameter.parameter.default.map(stringifyChoice)
      : [];
    return {
      ...model,
      mode: 'checklist',
      checklist: {
        title: '请选择附加选项（空格选中，Enter 完成）',
        parameter,
        selectedIndex: 0,
        selectedValues: defaultValues
      },
      selectedIndex: 0,
      message: undefined
    };
  }
  if (control === 'slider' || control === 'stepper') {
    const min = getSliderMin(parameter.parameter);
    const max = getSliderMax(parameter.parameter, min);
    return {
      ...model,
      mode: 'slider',
      slider: {
        parameter,
        value: clamp(getDefaultNumericValue(parameter.parameter), min, max)
      },
      selectedIndex: 0,
      message: undefined
    };
  }
  const defaultValue = typeof parameter.parameter.default === 'string' ? parameter.parameter.default : '';
  return {
    ...model,
    mode: 'input',
    input: {
      parameter,
      value: defaultValue,
      cursor: defaultValue.length
    },
    selectedIndex: 0,
    message: undefined
  };
};

const startFlagChecklist = (model: InteractiveModel, flags: InteractiveParameterRef[]): InteractiveModel => ({
  ...model,
  mode: 'checklist',
  checklist: {
    title: '请选择附加选项（空格选中，Enter 完成）',
    parameters: flags,
    selectedIndex: 0,
    selectedValues: []
  },
  selectedIndex: 0,
  message: undefined
});

const appendParameterToken = (tokens: string[], ref: InteractiveParameterRef, value: string): string[] => {
  if (ref.kind === 'argument') {
    return [...tokens, value];
  }
  if (ref.parameter.type === 'boolean') {
    return [...tokens, value === 'false' ? `--no-${ref.parameter.name}` : `--${ref.parameter.name}`];
  }
  return [...tokens, `--${ref.parameter.name}=${value}`];
};

const maybeAutoStartRequiredParameter = (model: InteractiveModel): InteractiveModel => {
  if (model.mode !== 'browse') {
    return model;
  }
  const exactCommands = getExactCommands(model);
  if (exactCommands.length !== 1) {
    return model;
  }
  const command = exactCommands[0]!;
  const missing = getMissingRequiredParameters(command, getInvocationTokens(command, model.tokens));
  if (missing.length > 0) {
    return startParameterControl(model, missing[0]!);
  }
  return model;
};

const commitParameterValue = (model: InteractiveModel, ref: InteractiveParameterRef, value: string): InteractiveModel => {
  if (ref.parameter.required && value.length === 0 && typeof ref.parameter.default === 'undefined') {
    return withMessage(model, `${parameterLabel(ref)} 不能为空`);
  }
  return maybeAutoStartRequiredParameter({
    ...model,
    mode: 'browse',
    tokens: appendParameterToken(model.tokens, ref, value),
    selectedIndex: 0,
    input: undefined,
    selection: undefined,
    slider: undefined,
    checklist: undefined,
    message: undefined
  });
};

const commitSelection = (model: InteractiveModel): InteractiveModel => {
  const selection = model.selection;
  if (!selection) {
    return { ...model, mode: 'browse' };
  }
  const choices = getSelectChoices(selection.parameter.parameter);
  const value = choices[selection.selectedIndex] ?? '';
  return commitParameterValue(model, selection.parameter, value);
};

const commitSlider = (model: InteractiveModel): InteractiveModel => {
  if (!model.slider) {
    return { ...model, mode: 'browse' };
  }
  return commitParameterValue(model, model.slider.parameter, String(model.slider.value));
};

const getChecklistItems = (checklist: InteractiveChecklistState): InteractiveItem[] => {
  if (checklist.parameters) {
    return checklist.parameters.map((parameterRef) => {
      const label = parameterLabel(parameterRef);
      return {
        kind: 'parameter' as const,
        label: `${checklist.selectedValues.includes(label) ? '[✓]' : '[ ]'} ${label}`,
        description: describeParameter(parameterRef),
        parameter: parameterRef
      };
    });
  }
  const parameter = checklist.parameter;
  if (!parameter) {
    return [];
  }
  return getParameterChoices(parameter.parameter).map((choice) => ({
    kind: 'parameter' as const,
    label: `${checklist.selectedValues.includes(choice) ? '[✓]' : '[ ]'} ${choice}`,
    description: describeParameter(parameter),
    parameter
  }));
};

const commitChecklist = (model: InteractiveModel): InteractiveModel => {
  const checklist = model.checklist;
  if (!checklist) {
    return { ...model, mode: 'browse' };
  }
  let nextTokens = model.tokens;
  if (checklist.parameters) {
    for (const ref of checklist.parameters) {
      const label = parameterLabel(ref);
      if (checklist.selectedValues.includes(label)) {
        nextTokens = appendParameterToken(nextTokens, ref, 'true');
      }
    }
  } else if (checklist.parameter) {
    nextTokens = appendParameterToken(nextTokens, checklist.parameter, checklist.selectedValues.join(','));
  }
  return maybeAutoStartRequiredParameter({
    ...model,
    mode: 'browse',
    tokens: nextTokens,
    selectedIndex: 0,
    checklist: undefined,
    message: undefined
  });
};

const applyBrowseSelection = (model: InteractiveModel, item: InteractiveItem): InteractiveUpdate => {
  if (item.kind === 'segment' && item.segment) {
    return {
      model: maybeAutoStartRequiredParameter({
        ...model,
        tokens: [...model.tokens, item.segment],
        selectedIndex: 0,
        message: undefined
      })
    };
  }
  if (item.kind === 'owner' && item.command) {
    return {
      model: {
        ...model,
        pluginId: item.command.owner.pluginId,
        selectedIndex: 0,
        message: undefined
      }
    };
  }
  if (item.kind === 'parameter' && item.parameter) {
    return { model: startParameterControl(model, item.parameter) };
  }
  if (item.kind === 'flag-group' && item.flags) {
    return { model: startFlagChecklist(model, item.flags) };
  }
  return { model: clearMessage(model) };
};

const createExecuteEffect = (model: InteractiveModel): InteractiveUpdate => {
  if (!isExecutable(model)) {
    return { model: withMessage(model, '当前命令还不完整，不能执行') };
  }
  const commandLine = buildShellCommandLine(model.tokens, model.pluginId);
  return {
    model: clearMessage(model),
    effect: {
      kind: 'execute',
      tokens: model.tokens,
      pluginId: model.pluginId,
      commandLine
    }
  };
};

const removeLastCommittedFragment = (model: InteractiveModel): InteractiveModel => {
  if (model.tokens.length === 0 && !model.pluginId) {
    return withMessage(model, '已经在最上级');
  }
  if (model.pluginId) {
    return {
      ...model,
      pluginId: undefined,
      selectedIndex: 0,
      message: undefined
    };
  }
  return {
    ...model,
    tokens: model.tokens.slice(0, -1),
    selectedIndex: 0,
    message: undefined
  };
};

const updateTextInput = (model: InteractiveModel, key: InteractiveKey): InteractiveUpdate => {
  const input = model.input;
  if (!input) {
    return { model: { ...model, mode: 'browse' } };
  }
  if (key.name === 'enter') {
    return { model: commitParameterValue(model, input.parameter, input.value) };
  }
  if (key.name === 'left') {
    return { model: { ...model, input: { ...input, cursor: clamp(input.cursor - 1, 0, input.value.length) } } };
  }
  if (key.name === 'right') {
    return { model: { ...model, input: { ...input, cursor: clamp(input.cursor + 1, 0, input.value.length) } } };
  }
  if (key.name === 'backspace') {
    if (input.cursor === 0) {
      return { model };
    }
    return {
      model: {
        ...model,
        input: {
          ...input,
          value: `${input.value.slice(0, input.cursor - 1)}${input.value.slice(input.cursor)}`,
          cursor: input.cursor - 1
        }
      }
    };
  }
  if (key.name === 'space' || key.name === 'char') {
    const value = key.name === 'space' ? ' ' : key.value;
    return {
      model: {
        ...model,
        input: {
          ...input,
          value: `${input.value.slice(0, input.cursor)}${value}${input.value.slice(input.cursor)}`,
          cursor: input.cursor + value.length
        },
        message: undefined
      }
    };
  }
  return { model };
};

const updateSelection = (model: InteractiveModel, key: InteractiveKey): InteractiveUpdate => {
  const selection = model.selection;
  if (!selection) {
    return { model: { ...model, mode: 'browse' } };
  }
  const choices = getSelectChoices(selection.parameter.parameter);
  if (key.name === 'enter') {
    return { model: commitSelection(model) };
  }
  if (key.name === 'up' || key.name === 'left') {
    return {
      model: {
        ...model,
        selection: {
          ...selection,
          selectedIndex: clamp(selection.selectedIndex - 1, 0, Math.max(0, choices.length - 1))
        }
      }
    };
  }
  if (key.name === 'down' || key.name === 'right') {
    return {
      model: {
        ...model,
        selection: {
          ...selection,
          selectedIndex: clamp(selection.selectedIndex + 1, 0, Math.max(0, choices.length - 1))
        }
      }
    };
  }
  if (key.name === 'backspace') {
    return {
      model: removeLastCommittedFragment({
        ...model,
        mode: 'browse',
        selection: undefined,
        selectedIndex: 0
      })
    };
  }
  return { model };
};

const updateSlider = (model: InteractiveModel, key: InteractiveKey): InteractiveUpdate => {
  const slider = model.slider;
  if (!slider) {
    return { model: { ...model, mode: 'browse' } };
  }
  const parameter = slider.parameter.parameter;
  const min = getSliderMin(parameter);
  const max = getSliderMax(parameter, min);
  const step = getSliderStep(parameter);
  if (key.name === 'enter') {
    return { model: commitSlider(model) };
  }
  if (key.name === 'left' || key.name === 'right') {
    const direction = key.name === 'right' ? 1 : -1;
    return {
      model: {
        ...model,
        slider: {
          ...slider,
          value: clamp(slider.value + direction * step, min, max)
        },
        message: undefined
      }
    };
  }
  if (key.name === 'backspace') {
    return {
      model: removeLastCommittedFragment({
        ...model,
        mode: 'browse',
        slider: undefined,
        selectedIndex: 0
      })
    };
  }
  return { model };
};

const updateChecklist = (model: InteractiveModel, key: InteractiveKey): InteractiveUpdate => {
  const checklist = model.checklist;
  if (!checklist) {
    return { model: { ...model, mode: 'browse' } };
  }
  const items = getChecklistItems(checklist);
  if (key.name === 'enter') {
    return { model: commitChecklist(model) };
  }
  if (key.name === 'up' || key.name === 'left') {
    return {
      model: {
        ...model,
        checklist: {
          ...checklist,
          selectedIndex: clamp(checklist.selectedIndex - 1, 0, Math.max(0, items.length - 1))
        }
      }
    };
  }
  if (key.name === 'down' || key.name === 'right') {
    return {
      model: {
        ...model,
        checklist: {
          ...checklist,
          selectedIndex: clamp(checklist.selectedIndex + 1, 0, Math.max(0, items.length - 1))
        }
      }
    };
  }
  if (key.name === 'space') {
    const item = items[checklist.selectedIndex];
    if (!item) {
      return { model };
    }
    const rawLabel = checklist.parameters && item.parameter
      ? parameterLabel(item.parameter)
      : item.label.replace(/^\[[ ✓]\]\s+/, '');
    const selectedValues = checklist.selectedValues.includes(rawLabel)
      ? checklist.selectedValues.filter((value) => value !== rawLabel)
      : [...checklist.selectedValues, rawLabel];
    return {
      model: {
        ...model,
        checklist: {
          ...checklist,
          selectedValues
        },
        message: undefined
      }
    };
  }
  if (key.name === 'backspace') {
    return {
      model: removeLastCommittedFragment({
        ...model,
        mode: 'browse',
        checklist: undefined,
        selectedIndex: 0
      })
    };
  }
  return { model };
};

const updateResult = (model: InteractiveModel, key: InteractiveKey): InteractiveUpdate => {
  const result = model.result;
  if (!result) {
    return { model: resetToInitial(model) };
  }
  if (key.name === 'ctrl+c') {
    return { model, effect: { kind: 'exit', code: result.code } };
  }
  if (key.name === 'enter') {
    return { model: resetToInitial(model) };
  }
  if (key.name === 'char' && key.value.toLowerCase() === 'r') {
    return {
      model: resetToInitial({
        ...model,
        tokens: result.tokens,
        pluginId: result.pluginId
      }),
      effect: {
        kind: 'execute',
        tokens: result.tokens,
        pluginId: result.pluginId,
        commandLine: result.commandLine
      }
    };
  }
  if (key.name === 'up' || key.name === 'down') {
    const outputLines = splitOutputLines(result.output);
    const maxOffset = Math.max(0, outputLines.length - RESULT_OUTPUT_HEIGHT);
    return {
      model: {
        ...model,
        result: {
          ...result,
          scrollOffset: clamp(result.scrollOffset + (key.name === 'down' ? 1 : -1), 0, maxOffset)
        }
      }
    };
  }
  return { model };
};

export const applyInteractiveKey = (model: InteractiveModel, key: InteractiveKey): InteractiveUpdate => {
  if (key.name === 'ctrl+backslash') {
    return { model, effect: { kind: 'exit', code: 0 } };
  }
  if (model.mode === 'result') {
    return updateResult(model, key);
  }
  if (model.mode === 'executing') {
    if (key.name === 'ctrl+c') {
      return {
        model: {
          ...model,
          execution: model.execution ? { ...model.execution, cancelRequested: true } : model.execution
        },
        effect: { kind: 'cancel-execution' }
      };
    }
    return { model };
  }
  if (key.name === 'ctrl+c') {
    return { model: resetToInitial(model) };
  }
  if (model.mode === 'input') {
    return updateTextInput(model, key);
  }
  if (model.mode === 'select') {
    return updateSelection(model, key);
  }
  if (model.mode === 'slider') {
    return updateSlider(model, key);
  }
  if (model.mode === 'checklist') {
    return updateChecklist(model, key);
  }

  const view = getInteractiveView(model);
  if (key.name === 'up') {
    return { model: withBrowseSelection(model, clamp(model.selectedIndex - 1, 0, Math.max(0, view.items.length - 1))) };
  }
  if (key.name === 'down') {
    return { model: withBrowseSelection(model, clamp(model.selectedIndex + 1, 0, Math.max(0, view.items.length - 1))) };
  }
  if (key.name === 'backspace') {
    return { model: removeLastCommittedFragment(model) };
  }
  if (key.name === 'enter') {
    const selected = view.items[view.selectedIndex];
    if (view.executable && selected?.kind === 'complete') {
      return createExecuteEffect(model);
    }
    if (selected) {
      return applyBrowseSelection(model, selected);
    }
    return { model };
  }
  return { model };
};

export const decodeInteractiveKeys = (input: string): InteractiveKey[] => {
  if (IGNORED_CONTROL_SEQUENCES.has(input)) {
    return [];
  }
  const mapped = CONTROL_SEQUENCE_KEYS.get(input);
  if (mapped) {
    return [mapped];
  }
  if (input === '\u0003') {
    return [{ name: 'ctrl+c' }];
  }
  if (input === '\u001c') {
    return [{ name: 'ctrl+backslash' }];
  }
  if (input === '\r' || input === '\n') {
    return [{ name: 'enter' }];
  }
  if (input === '\u007f' || input === '\b') {
    return [{ name: 'backspace' }];
  }
  if (input === '\u001b' || input === '\t') {
    return [];
  }
  const keys: InteractiveKey[] = [];
  for (const character of input) {
    keys.push(character === ' ' ? { name: 'space' } : { name: 'char', value: character });
  }
  return keys;
};

const normalizeRenderWidth = (width?: number): number => {
  const normalized = typeof width === 'number' && Number.isFinite(width)
    ? Math.floor(width)
    : DEFAULT_TERMINAL_WIDTH;
  return clamp(normalized, MIN_TERMINAL_WIDTH, MAX_TERMINAL_WIDTH);
};

const normalizeRenderHeight = (height?: number): number | undefined => {
  if (typeof height !== 'number' || !Number.isFinite(height)) {
    return undefined;
  }
  return Math.max(1, Math.floor(height));
};

const frameLine = (content: string, width: number): string => {
  const inner = width - 4;
  return `│ ${padAnsi(content, inner)} │`;
};

const topBorder = (width: number): string => `╭${'─'.repeat(width - 2)}╮`;
const bottomBorder = (width: number): string => `╰${'─'.repeat(width - 2)}╯`;
const separator = (width: number): string => `├${'─'.repeat(width - 2)}┤`;

const renderInnerBox = (title: string, lines: string[], width: number, maxContentLines?: number): string[] => {
  const innerWidth = width - 8;
  const maxTitleWidth = Math.max(0, innerWidth - 3);
  const safeTitle = truncatePlainToWidth(`─[ ${title} ]`, maxTitleWidth);
  const top = `┌${safeTitle}${'─'.repeat(Math.max(0, innerWidth - visibleLength(safeTitle) - 2))}┐`;
  const bottom = `└${'─'.repeat(innerWidth - 2)}┘`;
  const normalizedMaxContentLines = typeof maxContentLines === 'number'
    ? Math.max(0, Math.floor(maxContentLines))
    : undefined;
  const visibleLines = typeof normalizedMaxContentLines === 'number'
    ? lines.slice(0, normalizedMaxContentLines)
    : lines;
  if (
    typeof normalizedMaxContentLines === 'number' &&
    lines.length > normalizedMaxContentLines &&
    normalizedMaxContentLines > 0
  ) {
    visibleLines[normalizedMaxContentLines - 1] = `… 还有 ${lines.length - normalizedMaxContentLines + 1} 行，放大窗口查看更多`;
  }
  return [
    frameLine(top, width),
    ...visibleLines.map((line) => frameLine(`│ ${padAnsi(line, innerWidth - 4)} │`, width)),
    frameLine(bottom, width)
  ];
};

const renderCommandBar = (model: InteractiveModel, view: InteractiveView): string[] => {
  const statusIcon = model.mode === 'executing'
    ? '执行中'
    : model.mode === 'result'
      ? model.result?.code === 0 ? '任务完成' : '任务失败'
      : view.commandLine;
  if (model.mode === 'executing' || model.mode === 'result') {
    return [`${statusIcon}  ${view.commandLine}`];
  }
  return [`${view.commandLine}_`];
};

const renderListArea = (view: InteractiveView, width: number, heightBudget?: number): string[] => {
  const lines = view.items.length === 0
    ? ['无可选项']
    : view.items.map((item, index) => {
      const active = index === view.selectedIndex;
      const label = item.label;
      const plain = `${active ? '›' : ' '} ${padAnsi(label, 18)} ${item.description}`;
      return active ? `> ${plain}` : `  ${plain}`;
    });
  return renderInnerBox(view.title, lines, width, typeof heightBudget === 'number' ? heightBudget - 2 : undefined);
};

const renderInputArea = (model: InteractiveModel, view: InteractiveView, width: number, heightBudget?: number): string[] => {
  const input = model.input;
  const value = input
    ? `${input.value.slice(0, input.cursor)}_${input.value.slice(input.cursor)}`
    : '_';
  return renderInnerBox(view.title, [
    `> ${value}`,
    '可直接输入，Ctrl+V 粘贴，Enter 确认'
  ], width, typeof heightBudget === 'number' ? heightBudget - 2 : undefined);
};

const renderSliderBar = (slider: InteractiveSliderState): string => {
  const min = getSliderMin(slider.parameter.parameter);
  const max = getSliderMax(slider.parameter.parameter, min);
  const ratio = max === min ? 1 : (slider.value - min) / (max - min);
  const filled = clamp(Math.round(ratio * 20), 0, 20);
  return `${'█'.repeat(filled)}${'░'.repeat(20 - filled)} ${slider.value}`;
};

const renderSliderArea = (model: InteractiveModel, view: InteractiveView, width: number, heightBudget?: number): string[] => {
  if (!model.slider) {
    return renderInnerBox(view.title, ['无滑块状态'], width, typeof heightBudget === 'number' ? heightBudget - 2 : undefined);
  }
  return renderInnerBox(view.title, [
    renderSliderBar(model.slider),
    '← 减小    → 增大    Enter 确认'
  ], width, typeof heightBudget === 'number' ? heightBudget - 2 : undefined);
};

const renderChecklistArea = (view: InteractiveView, width: number, heightBudget?: number): string[] => {
  const lines = view.items.map((item, index) => {
    const active = index === view.selectedIndex;
    const label = item.label;
    const plain = `${active ? '›' : ' '} ${label}`;
    return active ? `> ${plain}` : `  ${plain}`;
  });
  return renderInnerBox(
    view.title,
    lines.length > 0 ? lines : ['无可选项'],
    width,
    typeof heightBudget === 'number' ? heightBudget - 2 : undefined
  );
};

const splitOutputLines = (output: string): string[] => {
  if (output.length === 0) {
    return ['(无输出)'];
  }
  return output.replace(/\r/g, '\n').split('\n').filter((line, index, lines) => line.length > 0 || index < lines.length - 1);
};

const tailLines = (lines: string[], max: number): string[] => lines.slice(Math.max(0, lines.length - max));

const formatDuration = (durationMs: number): string => {
  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }
  return `${(durationMs / 1000).toFixed(1)}s`;
};

const renderProgress = (progress?: number): string => {
  const value = typeof progress === 'number' ? clamp(progress, 0, 100) : undefined;
  const filled = typeof value === 'number' ? Math.round((value / 100) * 24) : 6;
  const percent = typeof value === 'number' ? `${Math.round(value)}%` : '运行中';
  return `${'█'.repeat(filled)}${'░'.repeat(24 - filled)}  ${percent}`;
};

const renderExecutingArea = (model: InteractiveModel, width: number, heightBudget?: number): string[] => {
  const execution = model.execution;
  if (!execution) {
    return renderInnerBox('实时输出', ['等待执行...'], width, typeof heightBudget === 'number' ? heightBudget - 2 : undefined);
  }
  if (typeof heightBudget === 'number' && heightBudget < 7) {
    return renderInnerBox('执行中', [
      execution.cancelRequested ? '正在中止当前命令...' : '命令正在执行...',
      `进度: ${renderProgress(execution.progress)}`
    ], width, Math.max(0, heightBudget - 2));
  }
  const combined = [...execution.outputLines, ...execution.errorLines.map((line) => `ERR ${line}`)];
  const outputContentHeight = typeof heightBudget === 'number'
    ? Math.max(1, heightBudget - 6)
    : EXECUTION_OUTPUT_HEIGHT;
  return [
    ...renderInnerBox('实时输出', tailLines(combined.length > 0 ? combined : ['等待输出...'], outputContentHeight), width),
    ...renderInnerBox('进度', [renderProgress(execution.progress)], width),
    frameLine('提示: 按 Ctrl+C 中止进程', width)
  ];
};

const renderResultArea = (model: InteractiveModel, width: number, heightBudget?: number): string[] => {
  const result = model.result;
  if (!result) {
    return renderInnerBox('执行结果', ['暂无结果'], width, typeof heightBudget === 'number' ? heightBudget - 2 : undefined);
  }
  const outputLines = splitOutputLines(result.output);
  const reservedShortcutHeight = 3;
  const outputHeight = typeof heightBudget === 'number'
    ? Math.max(1, heightBudget - reservedShortcutHeight - 5)
    : RESULT_OUTPUT_HEIGHT;
  const visibleOutput = outputLines.slice(result.scrollOffset, result.scrollOffset + outputHeight);
  const status = result.code === 0 && !result.cancelled
    ? `状态: 成功  退出码 ${result.code}`
    : result.cancelled
      ? `状态: 已中止  退出码 ${result.code}`
      : `状态: 失败  退出码 ${result.code}`;
  const errorSummary = result.errorOutput?.trim()
    ? `错误: ${result.errorOutput.trim().split('\n')[0]}`
    : '错误: (无)';
  if (typeof heightBudget === 'number' && heightBudget < 8) {
    return renderInnerBox('执行结果', [
      `${status}    耗时 ${formatDuration(result.durationMs)}`,
      errorSummary,
      'Enter 返回 / R 重试 / Ctrl+C 退出'
    ], width, Math.max(0, heightBudget - 2));
  }
  return [
    ...renderInnerBox('执行结果', [
      `${status}    耗时 ${formatDuration(result.durationMs)}`,
      '输出:',
      ...visibleOutput.map((line) => `  ${line}`),
      errorSummary
    ], width),
    ...renderInnerBox('快捷键', [
      `Enter 返回构建界面  │  R 重新执行  │  Ctrl+C 退出`
    ], width)
  ];
};

const renderDynamicArea = (model: InteractiveModel, view: InteractiveView, width: number, heightBudget?: number): string[] => {
  if (model.mode === 'input') {
    return renderInputArea(model, view, width, heightBudget);
  }
  if (model.mode === 'slider') {
    return renderSliderArea(model, view, width, heightBudget);
  }
  if (model.mode === 'select') {
    return renderListArea(view, width, heightBudget);
  }
  if (model.mode === 'checklist') {
    return renderChecklistArea(view, width, heightBudget);
  }
  if (model.mode === 'executing') {
    return renderExecutingArea(model, width, heightBudget);
  }
  if (model.mode === 'result') {
    return renderResultArea(model, width, heightBudget);
  }
  return renderListArea(view, width, heightBudget);
};

const renderHintBar = (model: InteractiveModel, view: InteractiveView, width: number): string[] => {
  if (model.mode === 'result' || model.mode === 'executing') {
    return [];
  }
  const firstLine = (() => {
    if (view.executable) {
      return 'Enter 执行  │  ↑/↓ 选择附加项  │  Backspace 返回';
    }
    if (model.mode === 'input') {
      return '直接输入 / Ctrl+V 粘贴  │  ←/→ 移动光标  │  Enter 确认';
    }
    if (model.mode === 'slider') {
      return '←/→ 调节数值  │  Enter 确认';
    }
    if (model.mode === 'checklist') {
      return '↑/↓/←/→ 移动  │  Space 切换  │  Enter 完成';
    }
    return '↑/↓ 移动  │  Enter 确认';
  })();
  const executeHint = view.executable
    ? '▶ Enter 执行'
    : '命令完整后 Enter 执行';
  const fixed = `Backspace 返回上级  │  Ctrl+C 取消命令  │  ${executeHint}  │  Ctrl+\\ 退出`;
  const lines = [firstLine, fixed];
  if (model.message) {
    lines.push(model.message.text);
  }
  return renderInnerBox('快捷键', lines, width);
};

const renderCompactScreen = (view: InteractiveView, width: number, height: number): string => {
  const availableContentLines = Math.max(0, height - 2);
  const content = [
    truncatePlainToWidth(view.commandLine, Math.max(0, width - 4)),
    '终端窗口太小，请放大后继续使用 TUI。'
  ].slice(0, availableContentLines);
  const lines = [
    topBorder(width),
    ...content.map((line) => frameLine(line, width)),
    bottomBorder(width)
  ];
  return lines.slice(0, height).join('\n');
};

export const renderInteractiveScreen = (model: InteractiveModel, width?: number, height?: number): string => {
  const normalizedWidth = normalizeRenderWidth(width);
  const normalizedHeight = normalizeRenderHeight(height);
  const view = getInteractiveView(model);
  if (typeof normalizedHeight === 'number' && normalizedHeight < MIN_FULL_TERMINAL_HEIGHT) {
    return renderCompactScreen(view, normalizedWidth, normalizedHeight);
  }
  const commandBar = renderCommandBar(model, view).map((line) => frameLine(line, normalizedWidth));
  const hintBar = renderHintBar(model, view, normalizedWidth);
  const fixedLineCount = 1 + commandBar.length + 1 + hintBar.length + 1;
  if (typeof normalizedHeight === 'number' && normalizedHeight < fixedLineCount + 2) {
    return renderCompactScreen(view, normalizedWidth, normalizedHeight);
  }
  const dynamicHeightBudget = typeof normalizedHeight === 'number'
    ? normalizedHeight - fixedLineCount
    : undefined;
  const lines = [
    topBorder(normalizedWidth),
    ...commandBar,
    separator(normalizedWidth),
    ...renderDynamicArea(model, view, normalizedWidth, dynamicHeightBudget),
    ...hintBar,
    bottomBorder(normalizedWidth)
  ];
  const fittedLines = typeof normalizedHeight === 'number'
    ? lines.slice(0, normalizedHeight)
    : lines;
  if (typeof normalizedHeight === 'number' && fittedLines.length > 0 && fittedLines.at(-1) !== bottomBorder(normalizedWidth)) {
    fittedLines[fittedLines.length - 1] = bottomBorder(normalizedWidth);
  }
  return fittedLines.join('\n');
};

const appendExecutionChunk = (
  model: InteractiveModel,
  stream: 'stdout' | 'stderr',
  chunk: string
): InteractiveModel => {
  if (model.mode !== 'executing' || !model.execution) {
    return model;
  }
  const lines = chunk.replace(/\r/g, '\n').split('\n').filter((line) => line.length > 0);
  const percentMatch = chunk.match(/(\d{1,3})%/);
  const progress = percentMatch?.[1] ? clamp(Number(percentMatch[1]), 0, 100) : model.execution.progress;
  return {
    ...model,
    execution: {
      ...model.execution,
      progress,
      outputLines: stream === 'stdout' ? [...model.execution.outputLines, ...lines].slice(-200) : model.execution.outputLines,
      errorLines: stream === 'stderr' ? [...model.execution.errorLines, ...lines].slice(-80) : model.execution.errorLines
    }
  };
};

const startExecuting = (model: InteractiveModel, effect: Extract<InteractiveEffect, { kind: 'execute' }>): InteractiveModel => ({
  ...model,
  mode: 'executing',
  execution: {
    commandLine: effect.commandLine,
    tokens: effect.tokens,
    pluginId: effect.pluginId,
    startedAt: Date.now(),
    outputLines: [],
    errorLines: []
  },
  result: undefined,
  input: undefined,
  selection: undefined,
  slider: undefined,
  checklist: undefined,
  message: undefined
});

const finishExecuting = (
  model: InteractiveModel,
  effect: Extract<InteractiveEffect, { kind: 'execute' }>,
  result: InteractiveExecutionResult,
  startedAt: number,
  cancelled = false
): InteractiveModel => ({
  ...model,
  mode: 'result',
  execution: undefined,
  result: {
    commandLine: effect.commandLine,
    tokens: effect.tokens,
    pluginId: effect.pluginId,
    code: cancelled ? 130 : result.code,
    output: result.output,
    errorOutput: cancelled
      ? [result.errorOutput, '用户已请求中止命令。'].filter(Boolean).join('\n')
      : result.errorOutput,
    durationMs: Date.now() - startedAt,
    scrollOffset: 0,
    cancelled
  }
});

export const runInteractiveSession = async ({
  commands,
  builtinCommands,
  stdin,
  stdout,
  execute
}: InteractiveSessionOptions): Promise<number> => {
  let model = createInteractiveModel(commands, builtinCommands);
  let activeAbortController: AbortController | undefined;
  let activeExecutionEffect: Extract<InteractiveEffect, { kind: 'execute' }> | undefined;
  const rawModeWasEnabled = stdin.isRaw === true;
  const writeRaw = stdout.write.bind(stdout);
  let previousRenderLines: string[] = [];
  let previousRenderWidth = 0;
  let previousRenderHeight = 0;
  const render = (): void => {
    const width = normalizeRenderWidth(stdout.columns);
    const height = normalizeRenderHeight(stdout.rows);
    const screen = renderInteractiveScreen(model, width, height);
    const nextLines = screen.split('\n');
    const nextHeight = height ?? nextLines.length;
    const sizeChanged = previousRenderWidth !== width || previousRenderHeight !== nextHeight;
    const maxLines = Math.min(nextHeight, Math.max(previousRenderLines.length, nextLines.length));
    const chunks: string[] = [];

    for (let index = 0; index < maxLines; index += 1) {
      const nextLine = nextLines[index] ?? '';
      const previousLine = previousRenderLines[index] ?? '';
      if (sizeChanged || nextLine !== previousLine) {
        chunks.push(`\u001b[${index + 1};1H\u001b[2K${nextLine}`);
      }
    }

    if (chunks.length > 0) {
      writeRaw(chunks.join(''));
    }
    previousRenderLines = nextLines;
    previousRenderWidth = width;
    previousRenderHeight = nextHeight;
  };
  const restoreInput = (): void => {
    if (stdin.setRawMode) {
      stdin.setRawMode(rawModeWasEnabled);
    }
    stdin.pause();
  };

  return new Promise((resolve) => {
    const finish = (code: number): void => {
      restoreInput();
      stdin.off('data', onData);
      stdout.off('resize', render);
      previousRenderLines = [];
      writeRaw('\u001b[?25h\u001b[?1049l\n');
      resolve(code);
    };

    const startExecution = (effect: Extract<InteractiveEffect, { kind: 'execute' }>): void => {
      activeAbortController = new AbortController();
      activeExecutionEffect = effect;
      const startedAt = Date.now();
      model = startExecuting(model, effect);
      render();
      void execute({
        tokens: effect.tokens,
        pluginId: effect.pluginId,
        commandLine: effect.commandLine,
        signal: activeAbortController.signal,
        onOutput: (chunk) => {
          model = appendExecutionChunk(model, 'stdout', chunk);
          render();
        },
        onErrorOutput: (chunk) => {
          model = appendExecutionChunk(model, 'stderr', chunk);
          render();
        }
      })
        .then((result) => {
          const cancelled = activeAbortController?.signal.aborted === true;
          model = finishExecuting(model, effect, result, startedAt, cancelled);
          activeAbortController = undefined;
          activeExecutionEffect = undefined;
          render();
        })
        .catch((error) => {
          const output = error instanceof Error ? error.message : String(error);
          const cancelled = activeAbortController?.signal.aborted === true;
          model = finishExecuting(model, effect, {
            code: cancelled ? 130 : 1,
            output: '',
            errorOutput: output
          }, startedAt, cancelled);
          activeAbortController = undefined;
          activeExecutionEffect = undefined;
          render();
        });
    };

    const onData = (chunk: Buffer): void => {
      for (const key of decodeInteractiveKeys(chunk.toString('utf-8'))) {
        const updated = applyInteractiveKey(model, key);
        model = updated.model;
        if (updated.effect?.kind === 'exit') {
          finish(updated.effect.code);
          return;
        }
        if (updated.effect?.kind === 'cancel-execution') {
          activeAbortController?.abort();
          render();
          continue;
        }
        if (updated.effect?.kind === 'execute') {
          startExecution(updated.effect);
          return;
        }
      }
      if (activeExecutionEffect) {
        return;
      }
      render();
    };

    if (stdin.setRawMode) {
      stdin.setRawMode(true);
    }
    stdin.resume();
    stdin.on('data', onData);
    stdout.on('resize', render);
    writeRaw('\u001b[?1049h\u001b[?25l');
    render();
  });
};
