import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { Kernel } from '../../../packages/kernel/src';
import { NodePalAdapter } from '../../../packages/pal/src';
import { CardService } from '../../../packages/card-service/src';
import { CardInfoService } from '../../../packages/card-info-service/src';
import { BoxService } from '../../../packages/box-service/src';
import { StoreZipService } from '../../../packages/zip-service/src';
import { StructuredLogger } from '../../shared/logger';
import { createBridgeForKernel, HOST_INTERNAL_PERMISSIONS } from '../../preload/create-bridge';
import { PluginRuntime } from '../../runtime';
import { RuntimeClient } from '../../renderer/runtime-client';
import { bindKernelToElectronIpc } from '../ipc/chips-ipc';
import { registerHostSchemas } from '../services/register-schemas';
import { registerHostServices } from '../services/register-host-services';
import { loadElectronModule } from '../electron/electron-loader';
import {
  CHIPS_RENDER_DOCUMENT_SCHEME,
  registerChipsRenderDocumentProtocol,
} from '../electron/render-document-protocol';
import {
  DEFAULT_BUILT_IN_PLUGINS,
  ensureBuiltInPlugins,
  ensureBuiltInPluginShortcuts,
  resolveDefaultBuiltInPluginRoots,
  type BuiltInPluginDefinition
} from './built-in-plugins';

export interface HostApplicationOptions {
  workspacePath?: string;
  builtInPluginRoots?: string[];
  builtInPlugins?: BuiltInPluginDefinition[];
}

export class HostApplication {
  public readonly kernel: Kernel;
  public readonly pal: NodePalAdapter;
  public readonly logger: StructuredLogger;
  public readonly workspacePath: string;
  public readonly runtime: PluginRuntime;
  private readonly builtInPluginRoots: string[];
  private readonly builtInPlugins: BuiltInPluginDefinition[];
  private cardService?: CardService;
  private cardInfoService?: CardInfoService;
  private boxService?: BoxService;
  private zipService?: StoreZipService;
  private ipcBinding?: { active: boolean; dispose(): void };
  private disposeRenderDocumentProtocol?: () => void;
  private startupLaunchPluginId?: string;

  private started = false;

  public constructor(options?: HostApplicationOptions) {
    this.kernel = new Kernel();
    this.pal = new NodePalAdapter({
      window: {
        electronPreloadPath: path.resolve(__dirname, '../../preload/plugin-window.js')
      }
    });
    this.logger = new StructuredLogger();
    this.workspacePath = options?.workspacePath ?? path.join(os.homedir(), '.chips-host');
    this.builtInPluginRoots = options?.builtInPluginRoots ?? resolveDefaultBuiltInPluginRoots();
    this.builtInPlugins = options?.builtInPlugins ?? DEFAULT_BUILT_IN_PLUGINS;
    this.runtime = new PluginRuntime(this.workspacePath, {
      locale: 'zh-CN',
      themeId: 'chips-official.default-theme'
    });
  }

  public async start(): Promise<void> {
    if (this.started) {
      return;
    }

    registerHostSchemas();
    await this.runtime.load();
    const builtInBootstrap = await ensureBuiltInPlugins({
      runtime: this.runtime,
      pluginRoots: this.builtInPluginRoots,
      plugins: this.builtInPlugins
    });
    this.startupLaunchPluginId = builtInBootstrap.launchPluginId;

    await registerHostServices({
      kernel: this.kernel,
      pal: this.pal,
      workspacePath: this.workspacePath,
      logger: this.logger,
      getCardService: () => this.getCardService(),
      getCardInfoService: () => this.getCardInfoService(),
      getBoxService: () => {
        this.boxService ??= new BoxService();
        return this.boxService;
      },
      getZipService: () => {
        this.zipService ??= new StoreZipService();
        return this.zipService;
      },
      runtime: this.runtime
    });

    this.disposeRenderDocumentProtocol = registerChipsRenderDocumentProtocol((requestUrl) => {
      return this.getCardService().resolveManagedDocumentFilePath(requestUrl);
    });

    if (builtInBootstrap.shortcutPluginIds.length > 0) {
      try {
        await ensureBuiltInPluginShortcuts(new RuntimeClient(this.createBridge()), builtInBootstrap.shortcutPluginIds);
      } catch (error) {
        this.logger.write({
          level: 'warn',
          message: 'Failed to materialize built-in plugin shortcuts',
          requestId: 'built-in-shortcut-bootstrap',
          namespace: 'host',
          action: 'bootstrap.shortcuts',
          result: 'error',
          metadata: {
            pluginIds: builtInBootstrap.shortcutPluginIds,
            error
          }
        });
      }
    }

    this.ipcBinding = bindKernelToElectronIpc(this.kernel, {
      getPluginQuota: (pluginId) => {
        try {
          return this.runtime.getQuota(pluginId);
        } catch {
          return undefined;
        }
      },
      resolveScopedBridgeContext: (token) => {
        return this.runtime.resolveBridgeScope(token);
      }
    });

    await fs.writeFile(
      path.join(this.workspacePath, 'route-manifest.json'),
      JSON.stringify(this.kernel.getRouteManifest(), null, 2),
      'utf-8'
    );

    this.started = true;
    this.logger.write({
      level: 'info',
      message: 'Chips Host started',
      requestId: 'system-start',
      namespace: 'host',
      action: 'start',
      result: 'success'
    });
  }

  public async stop(): Promise<void> {
    if (!this.started) {
      return;
    }

    this.started = false;
    this.ipcBinding?.dispose();
    this.ipcBinding = undefined;
    this.disposeRenderDocumentProtocol?.();
    this.disposeRenderDocumentProtocol = undefined;
    this.logger.write({
      level: 'info',
      message: 'Chips Host stopped',
      requestId: 'system-stop',
      namespace: 'host',
      action: 'stop',
      result: 'success'
    });
  }

  public isRunning(): boolean {
    return this.started;
  }

  public takeStartupLaunchPluginId(): string | undefined {
    const nextPluginId = this.startupLaunchPluginId;
    this.startupLaunchPluginId = undefined;
    return nextPluginId;
  }

  public createBridge() {
    return createBridgeForKernel(this.kernel, {
      callerId: 'host-application',
      callerType: 'app',
      permissions: [...HOST_INTERNAL_PERMISSIONS]
    });
  }

  private getCardService(): CardService {
    if (!this.cardService) {
      const electron = loadElectronModule();
      this.cardService = new CardService({
        runtime: this.runtime,
        workspaceRoot: process.cwd(),
        managedDocumentScheme:
          electron?.protocol && typeof electron.protocol.handle === 'function' && electron?.net?.fetch
            ? CHIPS_RENDER_DOCUMENT_SCHEME
            : undefined,
      });
    }

    return this.cardService;
  }

  private getCardInfoService(): CardInfoService {
    if (!this.cardInfoService) {
      this.cardInfoService = new CardInfoService({
        validate: (cardFile) => this.getCardService().validate(cardFile),
        readMetadata: (cardFile) => this.getCardService().readMetadata(cardFile),
        renderCover: (cardFile) => this.getCardService().renderCover(cardFile)
      });
    }

    return this.cardInfoService;
  }
}
