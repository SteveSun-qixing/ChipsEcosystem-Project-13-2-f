import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { Kernel } from '../../../packages/kernel/src';
import { NodePalAdapter } from '../../../packages/pal/src';
import { CardService } from '../../../packages/card-service/src';
import { BoxService } from '../../../packages/box-service/src';
import { StoreZipService } from '../../../packages/zip-service/src';
import { StructuredLogger } from '../../shared/logger';
import { createBridgeForKernel } from '../../preload/create-bridge';
import { PluginRuntime } from '../../runtime';
import { bindKernelToElectronIpc } from '../ipc/chips-ipc';
import { registerHostSchemas } from '../services/register-schemas';
import { registerHostServices } from '../services/register-host-services';

export interface HostApplicationOptions {
  workspacePath?: string;
}

export class HostApplication {
  public readonly kernel: Kernel;
  public readonly pal: NodePalAdapter;
  public readonly logger: StructuredLogger;
  public readonly workspacePath: string;
  public readonly runtime: PluginRuntime;
  private cardService?: CardService;
  private boxService?: BoxService;
  private zipService?: StoreZipService;
  private ipcBinding?: { active: boolean; dispose(): void };

  private started = false;

  public constructor(options?: HostApplicationOptions) {
    this.kernel = new Kernel();
    this.pal = new NodePalAdapter();
    this.logger = new StructuredLogger();
    this.workspacePath = options?.workspacePath ?? path.join(os.homedir(), '.chips-host');
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

    await registerHostServices({
      kernel: this.kernel,
      pal: this.pal,
      workspacePath: this.workspacePath,
      logger: this.logger,
      getCardService: () => {
        this.cardService ??= new CardService();
        return this.cardService;
      },
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

    this.ipcBinding = bindKernelToElectronIpc(this.kernel);

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

  public createBridge() {
    return createBridgeForKernel(this.kernel);
  }
}
