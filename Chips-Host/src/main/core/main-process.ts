import type { HostApplicationOptions } from './host-application';
import { HostApplication } from './host-application';
import type { ElectronAppLike } from '../electron/electron-loader';
import { loadElectronModule } from '../electron/electron-loader';
import { registerChipsRenderDocumentScheme } from '../electron/render-document-protocol';
import { toStandardError } from '../../shared/errors';

registerChipsRenderDocumentScheme(loadElectronModule());

interface ProcessLike {
  on(event: 'uncaughtException' | 'unhandledRejection', listener: (error: unknown) => void): void;
  off(event: 'uncaughtException' | 'unhandledRejection', listener: (error: unknown) => void): void;
}

export interface HostMainProcessOptions {
  hostApplication?: HostApplication;
  processRef?: ProcessLike;
  electronApp?: ElectronAppLike | null;
}

export interface HostMainProcessStopOptions {
  quitElectronApp?: boolean;
}

export class HostMainProcess {
  private readonly hostApplication: HostApplication;
  private readonly processRef: ProcessLike;
  private readonly electronApp: ElectronAppLike | null;
  private started = false;
  private handlersBound = false;

  private readonly onUnhandledError = (error: unknown) => {
    const standard = toStandardError(error, 'HOST_UNHANDLED_ERROR');
    this.hostApplication.logger.write({
      level: 'error',
      message: standard.message,
      requestId: 'system-exception',
      namespace: 'host-main',
      action: 'exception',
      result: 'error',
      errorCode: standard.code,
      metadata: {
        details: standard.details,
        retryable: standard.retryable
      }
    });
  };

  private readonly onBeforeQuit = () => {
    void this.stop();
  };

  private readonly onWindowAllClosed = () => {
    this.hostApplication.logger.write({
      level: 'info',
      message: 'All plugin windows closed; Host remains resident in background',
      requestId: 'window-all-closed',
      namespace: 'host-main',
      action: 'window-all-closed',
      result: 'success'
    });
  };

  private readonly onActivate = () => {
    if (!this.hostApplication.isRunning()) {
      void this.hostApplication.start();
    }
  };

  public constructor(options?: HostMainProcessOptions) {
    this.hostApplication = options?.hostApplication ?? new HostApplication();
    this.processRef = options?.processRef ?? process;
    this.electronApp = options?.electronApp ?? loadElectronModule()?.app ?? null;
  }

  public async start(): Promise<void> {
    if (this.started) {
      return;
    }

    this.bindGlobalHandlers();
    if (this.electronApp) {
      registerChipsRenderDocumentScheme();
      await this.electronApp.whenReady();
    }

    await this.hostApplication.start();

    if (this.electronApp) {
      this.electronApp.on('before-quit', this.onBeforeQuit);
      this.electronApp.on('window-all-closed', this.onWindowAllClosed);
      this.electronApp.on('activate', this.onActivate);
      this.handlersBound = true;
    }

    this.started = true;
  }

  public async stop(options?: HostMainProcessStopOptions): Promise<void> {
    if (!this.started) {
      if (options?.quitElectronApp && this.electronApp) {
        this.electronApp.quit();
      }
      return;
    }

    if (this.electronApp && this.handlersBound) {
      this.electronApp.off('before-quit', this.onBeforeQuit);
      this.electronApp.off('window-all-closed', this.onWindowAllClosed);
      this.electronApp.off('activate', this.onActivate);
      this.handlersBound = false;
    }

    await this.hostApplication.stop();
    this.unbindGlobalHandlers();
    this.started = false;

    if (options?.quitElectronApp && this.electronApp) {
      this.electronApp.quit();
    }
  }

  public isRunning(): boolean {
    return this.started;
  }

  public getHostApplication(): HostApplication {
    return this.hostApplication;
  }

  private bindGlobalHandlers(): void {
    this.processRef.on('uncaughtException', this.onUnhandledError);
    this.processRef.on('unhandledRejection', this.onUnhandledError);
  }

  private unbindGlobalHandlers(): void {
    this.processRef.off('uncaughtException', this.onUnhandledError);
    this.processRef.off('unhandledRejection', this.onUnhandledError);
  }
}

export const bootstrapHostMainProcess = async (
  options?: HostMainProcessOptions & HostApplicationOptions
): Promise<HostMainProcess> => {
  const hostApplication = options?.hostApplication ?? new HostApplication({ workspacePath: options?.workspacePath });
  const mainProcess = new HostMainProcess({
    hostApplication,
    processRef: options?.processRef,
    electronApp: options?.electronApp
  });
  await mainProcess.start();
  return mainProcess;
};
