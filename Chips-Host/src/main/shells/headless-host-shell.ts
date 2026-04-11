import { HeadlessPalAdapter, type PALAdapter } from '../../../packages/pal/src';
import { HostCore, type HostCoreOptions } from '../core/host-core';

export interface HeadlessHostShellOptions extends Omit<HostCoreOptions, 'pal'> {}

export class HeadlessHostShell {
  public readonly core: HostCore;

  public constructor(options?: HeadlessHostShellOptions) {
    this.core = new HostCore({
      ...options,
      pal: new HeadlessPalAdapter()
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
    await this.core.start();
  }

  public async stop(): Promise<void> {
    await this.core.stop();
  }

  public isRunning(): boolean {
    return this.core.isRunning();
  }

  public createBridge() {
    return this.core.createBridge();
  }

  public takeStartupLaunchPluginId(): string | undefined {
    return this.core.takeStartupLaunchPluginId();
  }
}
