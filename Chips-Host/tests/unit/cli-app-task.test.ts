import { describe, expect, it } from 'vitest';
import { __cliTestHooks } from '../../src/main/cli/index';
import type { CliCommandTargetManifestMeta } from '../../src/runtime';

describe('app CLI task execution', () => {
  const createAppCommand = (target: Extract<CliCommandTargetManifestMeta, { type: 'app' }>) => ({
    commandId: 'chips.cli.task.app.cli.run',
    commandPath: ['demo', 'app-task'],
    commandPathKey: 'demo app-task',
    owner: {
      pluginId: 'chips.cli.task.app',
      pluginType: 'app',
      pluginName: 'CLI Task App',
      pluginVersion: '1.0.0'
    },
    enabled: true,
    declaration: {
      commandId: 'chips.cli.task.app.cli.run',
      commandPath: ['demo', 'app-task'],
      titleKey: 'cli.task.title',
      examples: [],
      permissions: [],
      target,
      arguments: [],
      options: [],
      job: {
        wait: true
      }
    },
    conflicts: []
  }) as unknown as Parameters<typeof __cliTestHooks.executeAppCliCommand>[1];

  it('creates a task, invokes the app command as CLI, and waits for completion', async () => {
    const calls: Array<{ action: string; payload: unknown }> = [];
    let pollCount = 0;
    const runtime = {
      async invoke(action: string, payload: unknown): Promise<unknown> {
        calls.push({ action, payload });
        switch (action) {
          case 'cli.task.create':
            return {
              task: {
                taskId: 'cli-task-1',
                pluginId: 'chips.cli.task.app',
                commandId: 'chips.cli.task.app.cli.run',
                commandPath: ['demo', 'app-task'],
                status: 'running',
                createdAt: 1,
                updatedAt: 1
              }
            };
          case 'surface.open':
            return {
              surface: {
                id: 'surface-1',
                context: {
                  sceneId: 'scene-1',
                  surfaceId: 'surface-1',
                  sessionId: 'session-1'
                }
              }
            };
          case 'command.get':
            return {
              command: {
                commandId: 'chips.cli.task.app.run'
              }
            };
          case 'command.invoke':
            return {
              invocationId: 'invocation-1',
              dispatched: true
            };
          case 'cli.task.bindInvocation':
            return {
              task: {
                taskId: 'cli-task-1',
                pluginId: 'chips.cli.task.app',
                commandId: 'chips.cli.task.app.cli.run',
                status: 'running',
                createdAt: 1,
                updatedAt: 2,
                invocationId: 'invocation-1'
              }
            };
          case 'surface.focus':
            return { ack: true };
          case 'cli.task.get':
            pollCount += 1;
            return {
              task: {
                taskId: 'cli-task-1',
                pluginId: 'chips.cli.task.app',
                commandId: 'chips.cli.task.app.cli.run',
                commandPath: ['demo', 'app-task'],
                status: pollCount === 1 ? 'running' : 'completed',
                createdAt: 1,
                updatedAt: pollCount + 2,
                progress: {
                  stage: 'writing',
                  percent: 50
                },
                output: pollCount === 1 ? undefined : {
                  files: ['/tmp/notebook.png']
                }
              }
            };
          default:
            throw new Error(`Unexpected action: ${action}`);
        }
      }
    };
    const command = createAppCommand({
      type: 'app',
      pluginId: 'chips.cli.task.app',
      commandId: 'chips.cli.task.app.run',
      surface: {
        open: true,
        focus: true
      }
    });
    const target = command.declaration.target as Extract<typeof command.declaration.target, { type: 'app' }>;

    const result = await __cliTestHooks.executeAppCliCommand(
      runtime as Parameters<typeof __cliTestHooks.executeAppCliCommand>[0],
      command,
      target,
      { subject: 'notebook' }
    );

    expect(result).toMatchObject({
      ok: true,
      output: {
        files: ['/tmp/notebook.png']
      },
      task: {
        status: 'completed'
      }
    });
    expect(calls.find((call) => call.action === 'command.invoke')?.payload).toMatchObject({
      commandId: 'chips.cli.task.app.run',
      source: 'cli',
      payload: {
        subject: 'notebook'
      },
      context: {
        pluginId: 'chips.cli.task.app',
        sceneId: 'scene-1',
        surfaceId: 'surface-1',
        taskId: 'cli-task-1',
        command: {
          source: 'cli',
          taskId: 'cli-task-1'
        }
      }
    });
    expect(calls.find((call) => call.action === 'surface.open')?.payload).toMatchObject({
      request: {
        presentation: {
          visible: false
        }
      }
    });
    expect(calls.find((call) => call.action === 'cli.task.bindInvocation')?.payload).toMatchObject({
      taskId: 'cli-task-1',
      invocationId: 'invocation-1',
      surfaceId: 'surface-1',
      sessionId: 'session-1'
    });
    expect(calls.map((call) => call.action)).not.toContain('surface.focus');
  });

  it('delegates app command targets to the Electron runner outside Electron', async () => {
    const command = createAppCommand({
      type: 'app',
      pluginId: 'chips.cli.task.app',
      commandId: 'chips.cli.task.app.run',
      surface: {
        open: true,
        focus: true
      }
    });
    const delegated: Array<{ workspace: string; commandId: string; payload: Record<string, unknown> }> = [];

    const result = await __cliTestHooks.executeCliCommandTarget(
      { invoke: async () => undefined } as unknown as Parameters<typeof __cliTestHooks.executeCliCommandTarget>[0],
      command,
      { subject: 'notebook' },
      [],
      {
        workspace: '/tmp/chips-workspace',
        isElectronRuntime: false,
        executeAppCliCommandInElectron: async (workspace, delegatedCommand, payload) => {
          delegated.push({ workspace, commandId: delegatedCommand.commandId, payload });
          return { ok: true, delegated: true };
        }
      }
    );

    expect(result).toEqual({ ok: true, delegated: true });
    expect(delegated).toEqual([
      {
        workspace: '/tmp/chips-workspace',
        commandId: 'chips.cli.task.app.cli.run',
        payload: {
          subject: 'notebook'
        }
      }
    ]);
  });

  it('keeps app open targets in the current runtime instead of short-lived delegation', async () => {
    const calls: Array<{ action: string; payload: unknown }> = [];
    const command = createAppCommand({
      type: 'app',
      pluginId: 'chips.cli.task.app',
      surface: {
        open: true,
        focus: true
      }
    });

    const result = await __cliTestHooks.executeCliCommandTarget(
      {
        async invoke(action: string, payload: unknown): Promise<unknown> {
          calls.push({ action, payload });
          if (action === 'surface.open') {
            return {
              surface: {
                id: 'surface-open-only',
                context: {
                  sceneId: 'scene-open-only',
                  surfaceId: 'surface-open-only',
                  sessionId: 'session-open-only'
                }
              }
            };
          }
          if (action === 'surface.focus') {
            return { ack: true };
          }
          throw new Error(`Unexpected action: ${action}`);
        }
      } as Parameters<typeof __cliTestHooks.executeCliCommandTarget>[0],
      command,
      { subject: 'notebook' },
      [],
      {
        workspace: '/tmp/chips-workspace',
        isElectronRuntime: false,
        executeAppCliCommandInElectron: async () => {
          throw new Error('open-only app targets must not use short-lived Electron runner');
        }
      }
    );

    expect(result).toMatchObject({
      ok: true,
      target: {
        type: 'app',
        pluginId: 'chips.cli.task.app'
      },
      surface: {
        id: 'surface-open-only'
      }
    });
    expect(calls.map((call) => call.action)).toEqual(['surface.open', 'surface.focus']);
  });

  it('uses a hidden surface for app command targets even when manifest does not request open', async () => {
    const calls: Array<{ action: string; payload: unknown }> = [];
    const command = createAppCommand({
      type: 'app',
      pluginId: 'chips.cli.task.app',
      commandId: 'chips.cli.task.app.run',
      surface: {
        focus: true
      },
      launchParams: {
        mode: 'batch'
      }
    });

    await __cliTestHooks.executeAppCliCommand(
      {
        async invoke(action: string, payload: unknown): Promise<unknown> {
          calls.push({ action, payload });
          if (action === 'cli.task.create') {
            return {
              task: {
                taskId: 'cli-task-hidden',
                pluginId: 'chips.cli.task.app',
                commandId: 'chips.cli.task.app.cli.run',
                commandPath: ['demo', 'app-task'],
                status: 'running',
                createdAt: 1,
                updatedAt: 1
              }
            };
          }
          if (action === 'surface.open') {
            return {
              surface: {
                id: 'surface-hidden',
                context: {
                  sceneId: 'scene-hidden',
                  surfaceId: 'surface-hidden',
                  sessionId: 'session-hidden'
                }
              }
            };
          }
          if (action === 'command.get') {
            return {
              command: {
                commandId: 'chips.cli.task.app.run'
              }
            };
          }
          if (action === 'command.invoke') {
            return {
              invocationId: 'invocation-hidden',
              dispatched: true
            };
          }
          if (action === 'cli.task.bindInvocation') {
            return {
              task: {
                taskId: 'cli-task-hidden',
                pluginId: 'chips.cli.task.app',
                commandId: 'chips.cli.task.app.cli.run',
                status: 'running',
                createdAt: 1,
                updatedAt: 2,
                invocationId: 'invocation-hidden'
              }
            };
          }
          if (action === 'cli.task.get') {
            return {
              task: {
                taskId: 'cli-task-hidden',
                pluginId: 'chips.cli.task.app',
                commandId: 'chips.cli.task.app.cli.run',
                commandPath: ['demo', 'app-task'],
                status: 'completed',
                createdAt: 1,
                updatedAt: 3
              }
            };
          }
          throw new Error(`Unexpected action: ${action}`);
        }
      } as Parameters<typeof __cliTestHooks.executeAppCliCommand>[0],
      command,
      command.declaration.target as Extract<typeof command.declaration.target, { type: 'app' }>,
      { subject: 'notebook' }
    );

    expect(calls.find((call) => call.action === 'surface.open')?.payload).toMatchObject({
      request: {
        target: {
          type: 'plugin',
          pluginId: 'chips.cli.task.app',
          launchParams: {
            mode: 'batch'
          }
        },
        presentation: {
          visible: false
        }
      }
    });
    expect(calls.map((call) => call.action)).not.toContain('plugin.launch');
    expect(calls.map((call) => call.action)).not.toContain('surface.focus');
  });
});
