import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createError } from '../../../src/shared/errors';

type ResourceHandlerPluginType = 'app' | 'card' | 'layout' | 'module' | 'theme';

interface QueryPluginRecord {
  id: string;
  enabled: boolean;
  type: ResourceHandlerPluginType;
  capabilities?: string[];
}

export interface ResourceOpenRequest {
  intent?: string;
  resource: {
    resourceId: string;
    mimeType?: string;
    title?: string;
    fileName?: string;
  };
}

export interface ResourceOpenResolvedResource {
  resourceId: string;
  filePath?: string;
  mimeType?: string;
  extension?: string;
  fileName?: string;
}

export interface ResourceOpenResult {
  mode: 'plugin' | 'shell' | 'external';
  pluginId?: string;
  windowId?: string;
  matchedCapability?: string;
  resolved: ResourceOpenResolvedResource;
}

export interface ResourceOpenServiceOptions {
  queryHandlerPlugins(): Promise<QueryPluginRecord[]>;
  launchPlugin(pluginId: string, launchParams: Record<string, unknown>): Promise<{ windowId: string }>;
  resolveResourceFilePath(resourceId: string): string | null;
  openPath(filePath: string): Promise<void>;
  openExternalUrl(url: string): Promise<void>;
}

const MIME_BY_EXTENSION: Record<string, string> = {
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

const normalizeIntent = (value: string | undefined): string => {
  const normalized = value?.trim().toLowerCase();
  return normalized && normalized.length > 0 ? normalized : 'view';
};

const normalizeMimeType = (value: string | undefined): string | undefined => {
  const normalized = value?.trim().toLowerCase();
  return normalized && normalized.length > 0 ? normalized : undefined;
};

const inferMimeType = (extension: string | undefined): string | undefined => {
  if (!extension) {
    return undefined;
  }
  return MIME_BY_EXTENSION[extension.toLowerCase()];
};

const buildResourceHandlerCapabilities = (intent: string, mimeType: string | undefined): string[] => {
  if (!mimeType) {
    return [];
  }

  const capabilities = [`resource-handler:${intent}:${mimeType}`];
  const slashIndex = mimeType.indexOf('/');
  if (slashIndex > 0) {
    capabilities.push(`resource-handler:${intent}:${mimeType.slice(0, slashIndex)}/*`);
  }

  return capabilities;
};

const resolveExtension = (filePath: string | undefined, resourceId: string): string | undefined => {
  const candidate = filePath ?? resourceId;
  const extension = path.extname(candidate).trim().toLowerCase();
  return extension.length > 0 ? extension : undefined;
};

export class ResourceOpenService {
  public constructor(private readonly options: ResourceOpenServiceOptions) {}

  public async openResource(request: ResourceOpenRequest): Promise<ResourceOpenResult> {
    const intent = normalizeIntent(request.intent);
    const resourceId = request.resource.resourceId.trim();
    if (!resourceId) {
      throw createError('INVALID_ARGUMENT', 'resource.resourceId is required.');
    }

    const filePath = this.resolveFilePath(resourceId);
    const extension = resolveExtension(filePath ?? undefined, resourceId);
    const mimeType = normalizeMimeType(request.resource.mimeType) ?? inferMimeType(extension);
    const fileName = request.resource.fileName?.trim() || (filePath ? path.basename(filePath) : undefined);
    const title = request.resource.title?.trim() || fileName;
    const matchedPlugin = await this.resolveHandlerPlugin(intent, mimeType, extension);

    const resolved: ResourceOpenResolvedResource = {
      resourceId,
      filePath: filePath ?? undefined,
      mimeType,
      extension,
      fileName,
    };

    if (matchedPlugin) {
      const launched = await this.options.launchPlugin(matchedPlugin.pluginId, {
        ...(filePath ? { targetPath: filePath } : undefined),
        trigger: 'resource-open-service',
        resourceOpen: {
          intent,
          resourceId,
          filePath: filePath ?? undefined,
          mimeType,
          extension,
          fileName,
          title,
          matchedCapability: matchedPlugin.capability,
        },
      });
      return {
        mode: 'plugin',
        pluginId: matchedPlugin.pluginId,
        windowId: launched.windowId,
        matchedCapability: matchedPlugin.capability,
        resolved,
      };
    }

    if (filePath) {
      await this.options.openPath(filePath);
      return {
        mode: 'shell',
        resolved,
      };
    }

    if (this.isExternalUrl(resourceId)) {
      await this.options.openExternalUrl(resourceId);
      return {
        mode: 'external',
        resolved,
      };
    }

    throw createError('RESOURCE_HANDLER_MISSING', 'No enabled app plugin can open the requested resource.', {
      intent,
      resourceId,
      mimeType,
      extension,
    });
  }

  private resolveFilePath(resourceId: string): string | null {
    try {
      const parsed = new URL(resourceId);
      if (parsed.protocol === 'file:') {
        return fileURLToPath(parsed);
      }
    } catch {
      return path.resolve(resourceId);
    }

    return this.options.resolveResourceFilePath(resourceId);
  }

  private isExternalUrl(resourceId: string): boolean {
    try {
      const parsed = new URL(resourceId);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private async resolveHandlerPlugin(
    intent: string,
    mimeType: string | undefined,
    extension: string | undefined,
  ): Promise<{ pluginId: string; capability: string } | null> {
    const plugins = (await this.options.queryHandlerPlugins())
      .filter((plugin) => plugin.enabled && plugin.type === 'app')
      .map((plugin) => ({
        pluginId: plugin.id,
        capabilities: [...new Set(plugin.capabilities ?? [])],
      }));

    const candidates = [
      ...buildResourceHandlerCapabilities(intent, mimeType),
      ...(extension ? [`file-handler:${extension}`] : []),
    ];

    for (const capability of candidates) {
      const matched = plugins.find((plugin) => plugin.capabilities.includes(capability));
      if (matched) {
        return {
          pluginId: matched.pluginId,
          capability,
        };
      }
    }

    return null;
  }
}
