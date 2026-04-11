import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { Kernel } from '../../../packages/kernel/src';
import type { PALAdapter } from '../../../packages/pal/src';
import { CardService } from '../../../packages/card-service/src';
import { CardInfoService } from '../../../packages/card-info-service/src';
import { BoxService } from '../../../packages/box-service/src';
import { StoreZipService } from '../../../packages/zip-service/src';
import { StructuredLogger } from '../../shared/logger';
import { createBridgeForKernel, HOST_INTERNAL_PERMISSIONS } from '../../preload/create-bridge';
import { PluginRuntime } from '../../runtime';
import { RuntimeClient } from '../../renderer/runtime-client';
import { registerHostSchemas } from '../services/register-schemas';
import { registerHostServices } from '../services/register-host-services';
import { loadElectronModule } from '../electron/electron-loader';
import {
  CHIPS_RENDER_DOCUMENT_SCHEME,
} from '../electron/render-document-protocol';
import {
  DEFAULT_BUILT_IN_PLUGINS,
  ensureBuiltInPlugins,
  ensureBuiltInPluginShortcuts,
  resolveDefaultBuiltInPluginRoots,
  type BuiltInPluginDefinition
} from './built-in-plugins';

export interface HostCoreOptions {
  pal: PALAdapter;
  workspacePath?: string;
  builtInPluginRoots?: string[];
  builtInPlugins?: BuiltInPluginDefinition[];
}

export class HostCore {
  public readonly kernel: Kernel;
  public readonly pal: PALAdapter;
  public readonly logger: StructuredLogger;
  public readonly workspacePath: string;
  public readonly runtime: PluginRuntime;
  private readonly builtInPluginRoots: string[];
  private readonly builtInPlugins: BuiltInPluginDefinition[];
  private cardService?: CardService;
  private cardInfoService?: CardInfoService;
  private boxService?: BoxService;
  private zipService?: StoreZipService;
  private startupLaunchPluginId?: string;
  private started = false;

  public constructor(options: HostCoreOptions) {
    this.kernel = new Kernel();
    this.pal = options.pal;
    this.logger = new StructuredLogger();
    this.workspacePath = options.workspacePath ?? path.join(os.homedir(), '.chips-host');
    this.builtInPluginRoots = options.builtInPluginRoots ?? resolveDefaultBuiltInPluginRoots();
    this.builtInPlugins = options.builtInPlugins ?? DEFAULT_BUILT_IN_PLUGINS;
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

    await fs.writeFile(
      path.join(this.workspacePath, 'route-manifest.json'),
      JSON.stringify(this.kernel.getRouteManifest(), null, 2),
      'utf-8'
    );

    this.started = true;
    this.logger.write({
      level: 'info',
      message: 'Chips Host core started',
      requestId: 'system-start',
      namespace: 'host-core',
      action: 'start',
      result: 'success'
    });
  }

  public async stop(): Promise<void> {
    if (!this.started) {
      return;
    }

    this.started = false;
    this.logger.write({
      level: 'info',
      message: 'Chips Host core stopped',
      requestId: 'system-stop',
      namespace: 'host-core',
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
      callerId: 'host-core',
      callerType: 'app',
      permissions: [...HOST_INTERNAL_PERMISSIONS]
    });
  }

  public resolveManagedDocumentFilePath(requestUrl: string): string | null {
    return this.getCardService().resolveManagedDocumentFilePath(requestUrl) ?? null;
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
