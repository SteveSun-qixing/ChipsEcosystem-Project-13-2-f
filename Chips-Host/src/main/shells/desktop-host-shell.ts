import path from 'node:path';
import { DesktopPalAdapter, type PALAdapter } from '../../../packages/pal/src';
import { bindKernelToElectronIpc } from '../ipc/chips-ipc';
import { registerChipsRenderDocumentProtocol } from '../electron/render-document-protocol';
import { HostCore, type HostCoreOptions } from '../core/host-core';

export interface DesktopHostShellOptions extends Omit<HostCoreOptions, 'pal'> {}

export class DesktopHostShell {
  public readonly core: HostCore;
  private ipcBinding?: { active: boolean; dispose(): void };
  private disposeRenderDocumentProtocol?: () => void;
  private started = false;

  public constructor(options?: DesktopHostShellOptions) {
    const preloadPath = path.resolve(__dirname, '../../preload/plugin-window.js');
    const pal = new DesktopPalAdapter({
      window: {
        electronPreloadPath: preloadPath
      }
    });
    this.core = new HostCore({
      ...options,
      pal
    });
  }

  public get kernel() {
    return this.core.kernel;
  }

  public get pal(): PALAdapter {
    return this.core.pal;
  }

  public get logger() {
    return this.core.logger;
  }

  public get workspacePath() {
    return this.core.workspacePath;
  }

  public get runtime() {
    return this.core.runtime;
  }

  public async start(): Promise<void> {
    if (this.started) {
      return;
    }

    await this.core.start();
    this.disposeRenderDocumentProtocol = registerChipsRenderDocumentProtocol((requestUrl) => {
      return this.core.resolveManagedDocumentFilePath(requestUrl);
    });
    this.ipcBinding = bindKernelToElectronIpc(this.core.kernel, {
      getPluginQuota: (pluginId) => {
        try {
          return this.core.runtime.getQuota(pluginId);
        } catch {
          return undefined;
        }
      },
      resolveScopedBridgeContext: (token) => {
        return this.core.runtime.resolveBridgeScope(token);
      }
    });
    this.started = true;
  }

  public async stop(): Promise<void> {
    if (!this.started) {
      return;
    }

    this.ipcBinding?.dispose();
    this.ipcBinding = undefined;
    this.disposeRenderDocumentProtocol?.();
    this.disposeRenderDocumentProtocol = undefined;
    await this.core.stop();
    this.started = false;
  }

  public isRunning(): boolean {
    return this.started;
  }

  public createBridge() {
    return this.core.createBridge();
  }

  public takeStartupLaunchPluginId(): string | undefined {
    return this.core.takeStartupLaunchPluginId();
  }
}
