import { HostApplication } from 'chips-host/src/main/core/host-application';
import * as crypto from 'crypto';
import { env } from '../config/env.js';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

interface ModuleInvokeResult<TOutput> {
  mode: 'sync' | 'job';
  output?: TOutput;
  jobId?: string;
}

interface ModuleJobView<TOutput> {
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  output?: TOutput;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
    retryable?: boolean;
  };
}

interface MinimalPluginManifest {
  entry?: string | Record<string, unknown>;
  preview?: string;
  ui?: {
    layout?: {
      contract?: string;
      minFunctionalSet?: string;
    };
    launcher?: {
      icon?: string;
    };
  };
  module?: {
    provides?: Array<{
      methods?: Array<{
        inputSchema?: string;
        outputSchema?: string;
      }>;
    }>;
  };
}

export interface FileConvertResult {
  outputPath: string;
  artifacts: Array<{
    type: string;
    path: string;
    entryFile?: string;
    mimeType?: string;
  }>;
  warnings?: Array<{
    code: string;
    message: string;
    details?: unknown;
  }>;
}

const MODULE_JOB_POLL_MS = 50;

export class HostIntegrationService {
  private static instance: HostIntegrationService;
  private host!: HostApplication;
  private workspacePath: string;
  private initialized = false;
  private ecosystemRoot?: string;
  private readonly kernelCaller = {
    id: 'community-platform-server',
    type: 'app',
    permissions: ['plugin.manage', 'theme.read', 'theme.write', 'module.invoke', 'module.read', 'card.write']
  } as const;

  private constructor() {
    this.workspacePath = path.resolve(process.cwd(), '.chips-server-host');
  }

  public static getInstance(): HostIntegrationService {
    if (!HostIntegrationService.instance) {
      HostIntegrationService.instance = new HostIntegrationService();
    }
    return HostIntegrationService.instance;
  }

  public async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await fs.rm(this.workspacePath, { recursive: true, force: true });
    await fs.mkdir(this.workspacePath, { recursive: true });

    this.host = new HostApplication({
      workspacePath: this.workspacePath,
      builtInPlugins: []
    });

    try {
      await this.host.start();
    } catch (error) {
      console.warn('[HostIntegration] Host start failed, wiping workspace and retrying...', error);
      await fs.rm(this.workspacePath, { recursive: true, force: true });
      await fs.mkdir(this.workspacePath, { recursive: true });
      this.host = new HostApplication({
        workspacePath: this.workspacePath,
        builtInPlugins: []
      });
      await this.host.start();
    }

    const pluginSources = this.resolvePluginSources();
    for (const source of pluginSources.cardPlugins) {
      await this.installAndEnablePlugin(source);
    }
    for (const source of pluginSources.modulePlugins) {
      await this.installAndEnablePlugin(source);
    }
    for (const source of pluginSources.themePlugins) {
      await this.installAndEnablePlugin(source);
    }

    await this.host.kernel.invoke(
      'theme.apply',
      { id: env.HOST_ACTIVE_THEME_ID },
      this.createKernelContext()
    );

    this.initialized = true;
    console.log('[HostIntegration] Service initialized successfully');
  }

  public async packCard(cardDir: string, outputPath: string): Promise<string> {
    if (!this.initialized) {
      await this.init();
    }

    const result = await this.host.kernel.invoke<{ cardDir: string; outputPath: string }, { cardFile: string }>(
      'card.pack',
      { cardDir, outputPath },
      this.createKernelContext()
    );
    return result.cardFile;
  }

  public async convertCardToHtml(params: {
    cardFile: string;
    outputPath: string;
    overwrite?: boolean;
    locale?: string;
    themeId?: string;
  }): Promise<FileConvertResult> {
    const { cardFile, outputPath, overwrite = true, locale, themeId } = params;

    return this.invokeModule<FileConvertResult>({
      capability: 'converter.file.convert',
      method: 'convert',
      input: {
        source: {
          type: 'card',
          path: cardFile,
        },
        target: {
          type: 'html',
        },
        output: {
          path: outputPath,
          overwrite,
        },
        options: {
          html: {
            packageMode: 'directory',
            includeAssets: true,
            includeManifest: false,
          },
          ...(locale ? { locale } : {}),
          ...(themeId ? { themeId } : {}),
        },
      },
    });
  }

  public async stop(): Promise<void> {
    if (this.host) {
      await this.host.stop();
    }
  }

  private async installAndEnablePlugin(sourcePath: string): Promise<string> {
    const stagedSource = await this.preparePluginInstallSource(sourcePath);
    try {
      const installResult = await this.host.kernel.invoke<{ manifestPath: string }, { pluginId: string }>(
        'plugin.install',
        { manifestPath: stagedSource.installPath },
        this.createKernelContext()
      );
      await this.host.kernel.invoke(
        'plugin.enable',
        { pluginId: installResult.pluginId },
        this.createKernelContext()
      );
      console.log(`[HostIntegration] Installed and enabled plugin: ${installResult.pluginId}`);
      return installResult.pluginId;
    } finally {
      await stagedSource.cleanup();
    }
  }

  private async invokeModule<TOutput>(params: {
    capability: string;
    method: string;
    input: Record<string, unknown>;
    pluginId?: string;
    timeoutMs?: number;
  }): Promise<TOutput> {
    if (!this.initialized) {
      await this.init();
    }

    const started = await this.host.kernel.invoke<
      {
        capability: string;
        method: string;
        input: Record<string, unknown>;
        pluginId?: string;
        timeoutMs?: number;
      },
      ModuleInvokeResult<TOutput>
    >(
      'module.invoke',
      params,
      this.createKernelContext()
    );

    if (started.mode === 'sync') {
      return started.output as TOutput;
    }

    if (!started.jobId) {
      throw new Error(`Module ${params.capability}.${params.method} returned no job id`);
    }

    for (;;) {
      await this.sleep(MODULE_JOB_POLL_MS);

      const snapshot = await this.host.kernel.invoke<{ jobId: string }, { job: ModuleJobView<TOutput> }>(
        'module.job.get',
        { jobId: started.jobId },
        this.createKernelContext()
      );

      if (snapshot.job.status === 'completed') {
        return snapshot.job.output as TOutput;
      }

      if (snapshot.job.status === 'failed' || snapshot.job.status === 'cancelled') {
        const error = new Error(
          snapshot.job.error?.message ?? `Module ${params.capability}.${params.method} ${snapshot.job.status}`
        ) as Error & { code?: string; details?: unknown; retryable?: boolean };
        error.code = snapshot.job.error?.code;
        error.details = snapshot.job.error?.details;
        error.retryable = snapshot.job.error?.retryable;
        throw error;
      }
    }
  }

  private resolvePluginSources(): {
    cardPlugins: string[];
    themePlugins: string[];
    modulePlugins: string[];
  } {
    const root = this.resolveEcosystemRoot();

    const defaultCardPlugins = [
      path.join(root, 'Chips-BaseCardPlugin/richtext-BCP'),
      path.join(root, 'Chips-BaseCardPlugin/image-BCP'),
    ];
    const defaultThemePlugins = [
      path.join(root, 'ThemePack/Chips-default'),
    ];
    const defaultModulePlugins = [
      this.resolvePackagedPluginSource(path.join(root, 'Chips-ModulePlugin/Chips-CardtoHTML-Plugin')),
      this.resolvePackagedPluginSource(path.join(root, 'Chips-ModulePlugin/Chips-FileConversion-Plugin')),
    ];

    return {
      cardPlugins: this.resolveConfiguredPluginList(env.HOST_CARD_PLUGIN_PATHS, defaultCardPlugins),
      themePlugins: this.resolveConfiguredPluginList(env.HOST_THEME_PLUGIN_PATHS, defaultThemePlugins),
      modulePlugins: this.resolveConfiguredPluginList(env.HOST_MODULE_PLUGIN_PATHS, defaultModulePlugins),
    };
  }

  private resolveConfiguredPluginList(rawValue: string | undefined, defaults: string[]): string[] {
    const values = rawValue
      ? rawValue
          .split(/[\n,]+/)
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
          .map((item) => this.resolvePluginSourcePath(item))
      : defaults;

    return [...new Set(values)];
  }

  private resolvePluginSourcePath(value: string): string {
    if (path.isAbsolute(value)) {
      return value;
    }
    return path.resolve(this.resolveEcosystemRoot(), value);
  }

  private resolvePackagedPluginSource(pluginRoot: string): string {
    const distDir = path.join(pluginRoot, 'dist');
    if (fsSync.existsSync(distDir)) {
      const cpkFiles = fsSync
        .readdirSync(distDir)
        .filter((file) => file.endsWith('.cpk'))
        .sort();
      if (cpkFiles.length > 0) {
        return path.join(distDir, cpkFiles[0]);
      }
    }

    return pluginRoot;
  }

  private async preparePluginInstallSource(sourcePath: string): Promise<{
    installPath: string;
    cleanup: () => Promise<void>;
  }> {
    const absoluteSourcePath = path.resolve(sourcePath);
    const stats = await fs.stat(absoluteSourcePath);

    if (!stats.isDirectory()) {
      return {
        installPath: absoluteSourcePath,
        cleanup: async () => {},
      };
    }

    const manifestPath = path.join(absoluteSourcePath, 'manifest.yaml');
    const manifestRaw = await fs.readFile(manifestPath, 'utf-8');
    const manifest = yaml.load(manifestRaw) as MinimalPluginManifest;
    const stagingRoot = await fs.mkdtemp(path.join(this.workspacePath, 'plugin-stage-'));
    const stagedManifestPath = path.join(stagingRoot, 'manifest.yaml');

    await fs.copyFile(manifestPath, stagedManifestPath);

    const rootsToCopy = this.collectManifestAssetRoots(manifest);
    for (const root of rootsToCopy) {
      const sourceRootPath = path.join(absoluteSourcePath, root);
      if (!fsSync.existsSync(sourceRootPath)) {
        continue;
      }

      const stagedRootPath = path.join(stagingRoot, root);
      await fs.mkdir(path.dirname(stagedRootPath), { recursive: true });
      await fs.cp(sourceRootPath, stagedRootPath, { recursive: true });
    }

    return {
      installPath: stagedManifestPath,
      cleanup: async () => {
        await fs.rm(stagingRoot, { recursive: true, force: true });
      },
    };
  }

  private collectManifestAssetRoots(manifest: MinimalPluginManifest): string[] {
    const roots = new Set<string>();
    const pushAsset = (assetPath: unknown) => {
      if (typeof assetPath !== 'string') {
        return;
      }

      const normalized = assetPath.trim().replace(/^[.][\\/]/, '');
      if (!normalized) {
        return;
      }

      const firstSegment = normalized.split(/[\\/]+/)[0];
      if (firstSegment) {
        roots.add(firstSegment);
      }
    };

    if (typeof manifest.entry === 'string') {
      pushAsset(manifest.entry);
    } else if (manifest.entry && typeof manifest.entry === 'object') {
      for (const value of Object.values(manifest.entry)) {
        pushAsset(value);
      }
    }

    pushAsset(manifest.preview);
    pushAsset(manifest.ui?.layout?.contract);
    pushAsset(manifest.ui?.layout?.minFunctionalSet);
    pushAsset(manifest.ui?.launcher?.icon);

    for (const provide of manifest.module?.provides ?? []) {
      for (const method of provide.methods ?? []) {
        pushAsset(method.inputSchema);
        pushAsset(method.outputSchema);
      }
    }

    return [...roots];
  }

  private createKernelContext() {
    return {
      caller: this.kernelCaller,
      requestId: crypto.randomUUID()
    } as any;
  }

  private resolveEcosystemRoot(): string {
    if (this.ecosystemRoot) {
      return this.ecosystemRoot;
    }

    let current = process.cwd();
    for (let index = 0; index < 8; index += 1) {
      const marker = path.join(current, 'ThemePack', 'Chips-default', 'manifest.yaml');
      if (fsSync.existsSync(marker)) {
        this.ecosystemRoot = current;
        return current;
      }
      const parent = path.dirname(current);
      if (parent === current) {
        break;
      }
      current = parent;
    }

    throw new Error(`Failed to locate ecosystem workspace root from cwd: ${process.cwd()}`);
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const hostIntegration = HostIntegrationService.getInstance();
