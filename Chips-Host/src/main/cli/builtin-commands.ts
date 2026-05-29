import type { CliCommandParameterManifestMeta } from '../../runtime';

export interface BuiltinCliCommandDefinition {
  commandPath: string[];
  description: string;
  arguments?: CliCommandParameterManifestMeta[];
  options?: CliCommandParameterManifestMeta[];
}

export const FIXED_COMMAND_ROOTS = [
  'help',
  'host',
  'start',
  'stop',
  'status',
  'config',
  'logs',
  'theme',
  'plugin',
  'update',
  'doctor',
  'open',
  'completion'
] as const;

export const FIXED_COMMANDS = new Set<string>(FIXED_COMMAND_ROOTS);

export const GLOBAL_COMPLETION_OPTIONS = ['--interactive', '--json', '--plugin'];

export const BUILTIN_COMPLETION_TREE = new Map<string, { subcommands?: string[]; options?: string[] }>([
  ['help', { options: [] }],
  ['start', { options: [] }],
  ['stop', { options: [] }],
  ['status', { options: ['--json'] }],
  ['config', { subcommands: ['list', 'set', 'reset'] }],
  ['logs', { options: ['--follow', '--level', '--lines'] }],
  ['theme', { subcommands: ['list', 'current', 'apply', 'resolve', 'contract', 'validate'] }],
  ['plugin', { subcommands: ['list', 'install', 'uninstall', 'enable', 'disable', 'query'] }],
  ['update', { subcommands: ['check', 'install'] }],
  ['doctor', { options: ['--fix', '--verbose'] }],
  ['open', { options: [] }],
  ['completion', { subcommands: ['bash', 'zsh', 'fish'] }]
]);

const stringArgument = (
  name: string,
  position: number,
  required = false,
  control: NonNullable<CliCommandParameterManifestMeta['ui']>['control'] = 'textarea'
): CliCommandParameterManifestMeta => ({
  name,
  position,
  type: 'string',
  required,
  ui: {
    control
  }
});

const pathArgument = (name: string, position: number, required = false): CliCommandParameterManifestMeta => ({
  name,
  position,
  type: 'path',
  required,
  ui: {
    control: 'pathInput'
  }
});

const enumArgument = (
  name: string,
  position: number,
  choices: string[],
  required = false
): CliCommandParameterManifestMeta => ({
  name,
  position,
  type: 'enum',
  required,
  choices,
  ui: {
    control: 'select',
    choices
  }
});

export const BUILTIN_INTERACTIVE_COMMANDS: BuiltinCliCommandDefinition[] = [
  {
    commandPath: ['help'],
    description: '显示 Host CLI 帮助'
  },
  {
    commandPath: ['start'],
    description: '启动当前工作区 Host 状态'
  },
  {
    commandPath: ['stop'],
    description: '停止当前工作区 Host 状态'
  },
  {
    commandPath: ['status'],
    description: '查看当前工作区状态'
  },
  {
    commandPath: ['config', 'list'],
    description: '列出当前工作区配置'
  },
  {
    commandPath: ['config', 'set'],
    description: '写入配置项',
    arguments: [stringArgument('key', 0, true), stringArgument('value', 1)]
  },
  {
    commandPath: ['config', 'reset'],
    description: '重置配置项',
    arguments: [stringArgument('key', 0)]
  },
  {
    commandPath: ['logs'],
    description: '导出 Host 日志'
  },
  {
    commandPath: ['theme', 'list'],
    description: '列出可用主题'
  },
  {
    commandPath: ['theme', 'current'],
    description: '查看当前主题'
  },
  {
    commandPath: ['theme', 'apply'],
    description: '应用指定主题',
    arguments: [stringArgument('id', 0, true)]
  },
  {
    commandPath: ['theme', 'resolve'],
    description: '解析主题链',
    arguments: [stringArgument('id', 0)]
  },
  {
    commandPath: ['theme', 'contract'],
    description: '查看主题组件契约',
    arguments: [stringArgument('component', 0)]
  },
  {
    commandPath: ['theme', 'validate'],
    description: '校验已安装主题'
  },
  {
    commandPath: ['plugin', 'list'],
    description: '列出已安装插件'
  },
  {
    commandPath: ['plugin', 'install'],
    description: '安装插件 manifest',
    arguments: [pathArgument('manifestPath', 0, true)]
  },
  {
    commandPath: ['plugin', 'uninstall'],
    description: '卸载插件',
    arguments: [stringArgument('pluginId', 0, true)]
  },
  {
    commandPath: ['plugin', 'enable'],
    description: '启用插件',
    arguments: [stringArgument('pluginId', 0, true)]
  },
  {
    commandPath: ['plugin', 'disable'],
    description: '禁用插件',
    arguments: [stringArgument('pluginId', 0, true)]
  },
  {
    commandPath: ['plugin', 'query'],
    description: '按类型和能力查询插件',
    arguments: [stringArgument('type', 0), stringArgument('capability', 1)]
  },
  {
    commandPath: ['update', 'check'],
    description: '检查 Host 更新'
  },
  {
    commandPath: ['update', 'install'],
    description: '安装 Host 更新'
  },
  {
    commandPath: ['doctor'],
    description: '检查工作区健康状态'
  },
  {
    commandPath: ['open'],
    description: '按文件关联打开资源',
    arguments: [pathArgument('targetPath', 0, true)]
  },
  {
    commandPath: ['completion', 'bash'],
    description: '输出 Bash 补全脚本'
  },
  {
    commandPath: ['completion', 'zsh'],
    description: '输出 Zsh 补全脚本'
  },
  {
    commandPath: ['completion', 'fish'],
    description: '输出 Fish 补全脚本'
  }
];

export const isBuiltinCliCommandRoot = (token: string | undefined): boolean => {
  return Boolean(token && FIXED_COMMANDS.has(token.toLowerCase()));
};
