import type { Client, PluginRecord } from 'chips-sdk';
import type {
  BoxLayoutDescriptor,
  BoxLayoutDefinitionModule,
  BoxLayoutModuleLoader,
  LoadedLayoutDescriptor,
} from './contracts';
import { gridLayoutDescriptor } from './registrations/grid';

const builtinLayoutDescriptors = [
  gridLayoutDescriptor,
] satisfies BoxLayoutDescriptor[];

const descriptorMap = new Map<string, BoxLayoutDescriptor>();
const installedDescriptorMap = new Map<string, BoxLayoutDescriptor>();
const descriptorCache = new Map<string, LoadedLayoutDescriptor>();
const registryListeners = new Set<() => void>();
let availableLayoutDescriptors = [...builtinLayoutDescriptors];
let registryVersion = 0;

function isIconDescriptor(icon: unknown): icon is { name: string } {
  return Boolean(icon)
    && typeof icon === 'object'
    && typeof (icon as { name?: unknown }).name === 'string'
    && (icon as { name: string }).name.trim().length > 0;
}

function toFileModuleUrl(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  if (/^[a-zA-Z]:\//.test(normalized)) {
    return encodeURI(`file:///${normalized}`);
  }
  return encodeURI(`file://${normalized.startsWith('/') ? normalized : `/${normalized}`}`);
}

async function defaultLayoutModuleLoader(moduleUrl: string): Promise<BoxLayoutDefinitionModule> {
  return import(/* @vite-ignore */ moduleUrl) as Promise<BoxLayoutDefinitionModule>;
}

function normalizeLayoutCacheKey(plugin: PluginRecord): string {
  return [
    plugin.id,
    plugin.version ?? '',
    plugin.installPath ?? '',
    plugin.entry ?? '',
    plugin.layout?.layoutType ?? '',
  ].join('::');
}

function applyDescriptors(nextDescriptors: BoxLayoutDescriptor[]): void {
  descriptorMap.clear();

  for (const descriptor of nextDescriptors) {
    descriptorMap.set(descriptor.layoutType, descriptor);
  }

  availableLayoutDescriptors = nextDescriptors;
  registryVersion += 1;
  registryListeners.forEach((listener) => listener());
}

function rebuildDescriptorRegistry(): void {
  applyDescriptors([
    ...builtinLayoutDescriptors,
    ...installedDescriptorMap.values(),
  ]);
}

function toInstalledDescriptor(plugin: PluginRecord, module: BoxLayoutDefinitionModule): BoxLayoutDescriptor {
  const definition = module.layoutDefinition;
  if (!definition) {
    throw new Error(`布局插件未导出 layoutDefinition: ${plugin.id}`);
  }
  if (typeof definition.layoutType !== 'string' || definition.layoutType.trim().length === 0) {
    throw new Error(`布局插件缺少 layoutType: ${plugin.id}`);
  }
  if (plugin.layout?.layoutType && definition.layoutType !== plugin.layout.layoutType) {
    throw new Error(`布局插件 layoutType 与 manifest 不一致: ${plugin.id}`);
  }
  if (typeof definition.createDefaultConfig !== 'function') {
    throw new Error(`布局插件缺少 createDefaultConfig: ${plugin.id}`);
  }
  if (typeof definition.normalizeConfig !== 'function') {
    throw new Error(`布局插件缺少 normalizeConfig: ${plugin.id}`);
  }
  if (typeof definition.validateConfig !== 'function') {
    throw new Error(`布局插件缺少 validateConfig: ${plugin.id}`);
  }
  if (typeof definition.renderView !== 'function') {
    throw new Error(`布局插件缺少 renderView: ${plugin.id}`);
  }
  if (definition.icon !== undefined && !isIconDescriptor(definition.icon)) {
    throw new Error(`布局插件 icon 必须为正式 IconDescriptor: ${plugin.id}`);
  }

  return {
    ...definition,
    pluginId: definition.pluginId || plugin.id,
    displayName: definition.displayName || plugin.layout?.displayName || plugin.name,
    description: definition.description || plugin.description,
  };
}

function isEnabledLayoutPlugin(record: PluginRecord): boolean {
  return record.type === 'layout'
    && record.enabled
    && typeof record.entry === 'string'
    && record.entry.trim().length > 0
    && typeof record.installPath === 'string'
    && record.installPath.trim().length > 0
    && typeof record.layout?.layoutType === 'string'
    && record.layout.layoutType.trim().length > 0;
}

async function loadInstalledDescriptor(
  plugin: PluginRecord,
  moduleLoader: BoxLayoutModuleLoader,
): Promise<LoadedLayoutDescriptor> {
  const cacheKey = normalizeLayoutCacheKey(plugin);
  const cached = descriptorCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const entryPath = `${plugin.installPath}/${plugin.entry}`.replace(/\\/g, '/').replace(/\/+/g, '/');
  const moduleUrl = toFileModuleUrl(entryPath);
  const loadedModule = await moduleLoader(moduleUrl);
  const loadedDescriptor = {
    plugin,
    moduleUrl,
    layoutDescriptor: toInstalledDescriptor(plugin, loadedModule),
  } satisfies LoadedLayoutDescriptor;

  descriptorCache.set(cacheKey, loadedDescriptor);
  return loadedDescriptor;
}

export function clearLayoutDescriptorCache(): void {
  descriptorCache.clear();
}

export async function syncInstalledLayoutDescriptors(
  client: Client,
  moduleLoader: BoxLayoutModuleLoader = defaultLayoutModuleLoader,
): Promise<void> {
  if (!client?.plugin || typeof client.plugin.query !== 'function') {
    installedDescriptorMap.clear();
    rebuildDescriptorRegistry();
    return;
  }

  const installedPlugins = await client.plugin.query({ type: 'layout' });
  const nextInstalledDescriptors = new Map<string, BoxLayoutDescriptor>();

  for (const plugin of installedPlugins.filter(isEnabledLayoutPlugin)) {
    const loadedDescriptor = await loadInstalledDescriptor(plugin, moduleLoader);
    nextInstalledDescriptors.set(plugin.id, loadedDescriptor.layoutDescriptor);
  }

  installedDescriptorMap.clear();
  nextInstalledDescriptors.forEach((descriptor, pluginId) => {
    installedDescriptorMap.set(pluginId, descriptor);
  });
  rebuildDescriptorRegistry();
}

export function subscribeLayoutRegistry(listener: () => void): () => void {
  registryListeners.add(listener);
  return () => {
    registryListeners.delete(listener);
  };
}

export function getLayoutRegistryVersion(): number {
  return registryVersion;
}

rebuildDescriptorRegistry();

export function getRegisteredLayoutDescriptors(): BoxLayoutDescriptor[] {
  return availableLayoutDescriptors;
}

export function getInstalledLayoutDescriptors(): BoxLayoutDescriptor[] {
  return [...installedDescriptorMap.values()];
}

export function getLayoutDescriptor(layoutType: string): BoxLayoutDescriptor | null {
  return descriptorMap.get(layoutType) ?? null;
}

export async function loadLayoutDescriptor(
  client: Client,
  layoutType: string,
  moduleLoader: BoxLayoutModuleLoader = defaultLayoutModuleLoader,
): Promise<LoadedLayoutDescriptor> {
  const registeredDescriptor = getLayoutDescriptor(layoutType);
  if (registeredDescriptor) {
    return {
      layoutDescriptor: registeredDescriptor,
    };
  }

  if (!client?.plugin || typeof client.plugin.query !== 'function') {
    throw new Error(`未找到布局描述符: ${layoutType}`);
  }

  const installedPlugins = await client.plugin.query({ type: 'layout' });
  const plugin = installedPlugins.find((record) =>
    isEnabledLayoutPlugin(record) && record.layout?.layoutType === layoutType,
  );
  if (!plugin) {
    throw new Error(`未找到已启用的布局插件: ${layoutType}`);
  }

  const loadedDescriptor = await loadInstalledDescriptor(plugin, moduleLoader);
  installedDescriptorMap.set(plugin.id, loadedDescriptor.layoutDescriptor);
  rebuildDescriptorRegistry();
  return loadedDescriptor;
}

export async function loadLayoutDefinition(
  client: Client,
  layoutType: string,
  moduleLoader: BoxLayoutModuleLoader = defaultLayoutModuleLoader,
): Promise<BoxLayoutDescriptor> {
  const loadedDescriptor = await loadLayoutDescriptor(client, layoutType, moduleLoader);
  return loadedDescriptor.layoutDescriptor;
}
