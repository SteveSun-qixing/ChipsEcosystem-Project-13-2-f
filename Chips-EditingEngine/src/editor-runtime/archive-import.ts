import type { FileEntry, ZipEntryMeta } from 'chips-sdk';
import type {
    BasecardArchiveImportRequest,
    BasecardArchiveImportResult,
} from '../basecard-runtime/contracts';
import { generateId62 } from '../utils/id';

interface ArchiveImportServices {
    getPathForFile(file: unknown): string;
    listZipEntries(zipPath: string): Promise<ZipEntryMeta[]>;
    extractZip(zipPath: string, outputDir: string): Promise<string>;
    listFiles(dir: string, options?: { recursive?: boolean }): Promise<FileEntry[]>;
    move(sourcePath: string, destPath: string): Promise<void>;
    delete(path: string, options?: { recursive?: boolean }): Promise<void>;
    exists(path: string): Promise<boolean>;
}

function joinPath(...parts: string[]): string {
    return parts.filter(Boolean).join('/').replace(/\\/g, '/').replace(/\/+/g, '/');
}

function normalizeRelativePath(value: string): string | null {
    const normalized = value.replace(/\\/g, '/').trim();
    if (!normalized) {
        return null;
    }

    const segments = normalized
        .replace(/^\.?\//, '')
        .split('/')
        .filter((segment) => segment.length > 0 && segment !== '.');
    if (segments.length === 0 || segments.some((segment) => segment === '..')) {
        return null;
    }

    return segments.join('/');
}

function sanitizeRootDirName(value: string): string {
    const withoutExtension = value.replace(/\.zip$/i, '').trim();
    const normalized = withoutExtension
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[-._]+|[-._]+$/g, '')
        .toLowerCase();

    return normalized.length > 0 ? normalized : 'archive-bundle';
}

function toRelativeChildPath(rootDir: string, absolutePath: string): string | null {
    const normalizedRoot = rootDir.replace(/\\/g, '/').replace(/\/+$/, '');
    const normalizedPath = absolutePath.replace(/\\/g, '/');
    if (normalizedPath === normalizedRoot) {
        return '';
    }
    if (!normalizedPath.startsWith(`${normalizedRoot}/`)) {
        return null;
    }
    return normalizedPath.slice(normalizedRoot.length + 1);
}

function isIgnoredArchiveArtifact(relativePath: string): boolean {
    const normalized = normalizeRelativePath(relativePath);
    if (!normalized) {
        return false;
    }

    const segments = normalized.split('/');
    return segments.includes('__MACOSX') || segments[segments.length - 1] === '.DS_Store';
}

export function resolveArchivePayloadRoot(
    entries: readonly Pick<ZipEntryMeta, 'path'>[],
    entryFileInput?: string,
): { payloadRoot: string; entryFile: string } {
    const entryFile = normalizeRelativePath(entryFileInput ?? 'index.html');
    if (!entryFile) {
        throw new Error('网页压缩包入口文件无效。');
    }

    const filePaths = entries
        .map((entry) => entry.path)
        .filter((entryPath) => !entryPath.endsWith('/'))
        .filter((entryPath) => !isIgnoredArchiveArtifact(entryPath));

    if (filePaths.includes(entryFile)) {
        return {
            payloadRoot: '',
            entryFile,
        };
    }

    const topLevelDirs = Array.from(
        new Set(
            filePaths
                .map((entryPath) => entryPath.split('/')[0] ?? '')
                .filter((segment) => segment.length > 0),
        ),
    );

    if (topLevelDirs.length === 1) {
        const [topLevelDir] = topLevelDirs;
        if (topLevelDir && filePaths.includes(`${topLevelDir}/${entryFile}`)) {
            return {
                payloadRoot: topLevelDir,
                entryFile,
            };
        }
    }

    throw new Error('网页压缩包根目录必须包含入口文件 index.html，或仅包含一个顶层目录且其下存在 index.html。');
}

async function cleanupIgnoredArchiveArtifacts(
    rootDir: string,
    services: Pick<ArchiveImportServices, 'listFiles' | 'delete'>,
): Promise<void> {
    const entries = await services.listFiles(rootDir, { recursive: true });
    const directoriesToDelete = new Set<string>();

    for (const entry of entries) {
        const relativePath = toRelativeChildPath(rootDir, entry.path);
        if (relativePath === null || relativePath.length === 0) {
            continue;
        }

        if (entry.isDirectory && relativePath.split('/').includes('__MACOSX')) {
            directoriesToDelete.add(entry.path);
            continue;
        }

        if (entry.isFile && isIgnoredArchiveArtifact(relativePath)) {
            await services.delete(entry.path);
        }
    }

    for (const directoryPath of Array.from(directoriesToDelete).sort((left, right) => right.length - left.length)) {
        await services.delete(directoryPath, { recursive: true });
    }
}

async function collectImportedResourcePaths(
    cardRootDir: string,
    bundleRootDir: string,
    services: Pick<ArchiveImportServices, 'listFiles'>,
): Promise<string[]> {
    const bundleAbsoluteDir = joinPath(cardRootDir, bundleRootDir);
    const entries = await services.listFiles(bundleAbsoluteDir, { recursive: true });
    return entries
        .filter((entry) => entry.isFile)
        .map((entry) => toRelativeChildPath(cardRootDir, entry.path))
        .filter((entryPath): entryPath is string => typeof entryPath === 'string' && entryPath.length > 0)
        .sort((left, right) => left.localeCompare(right));
}

async function chooseBundleRootDir(
    cardRootDir: string,
    preferredRootDir: string | undefined,
    services: Pick<ArchiveImportServices, 'exists'>,
): Promise<string> {
    const normalizedPreferred = preferredRootDir ? sanitizeRootDirName(preferredRootDir) : 'archive-bundle';

    while (true) {
        const candidate = `${normalizedPreferred}-${generateId62(6).toLowerCase()}`;
        if (!(await services.exists(joinPath(cardRootDir, candidate)))) {
            return candidate;
        }
    }
}

export async function importArchiveBundleIntoCardRoot(input: {
    cardRootDir: string;
    request: BasecardArchiveImportRequest;
    services: ArchiveImportServices;
}): Promise<BasecardArchiveImportResult> {
    const { cardRootDir, request, services } = input;
    const zipPath = services.getPathForFile(request.file);
    if (!zipPath) {
        throw new Error('当前宿主无法读取所选压缩包文件路径。');
    }

    const { payloadRoot, entryFile } = resolveArchivePayloadRoot(
        await services.listZipEntries(zipPath),
        request.entryFile,
    );
    const stageRootDir = joinPath(cardRootDir, '.card', '__archive_import__', generateId62(8).toLowerCase());
    const stageExtractDir = joinPath(stageRootDir, 'payload');
    const bundleRootDir = await chooseBundleRootDir(cardRootDir, request.preferredRootDir ?? request.file.name, services);
    const finalBundleDir = joinPath(cardRootDir, bundleRootDir);
    let shouldCleanupFinalDir = true;

    try {
        await services.extractZip(zipPath, stageExtractDir);
        await cleanupIgnoredArchiveArtifacts(stageExtractDir, services);

        const payloadSourceDir = payloadRoot
            ? joinPath(stageExtractDir, payloadRoot)
            : stageExtractDir;
        const entryAbsolutePath = joinPath(payloadSourceDir, entryFile);
        if (!(await services.exists(entryAbsolutePath))) {
            throw new Error('网页压缩包中缺少入口文件 index.html。');
        }

        await services.move(payloadSourceDir, finalBundleDir);
        const resourcePaths = await collectImportedResourcePaths(cardRootDir, bundleRootDir, services);
        if (resourcePaths.length === 0) {
            throw new Error('网页压缩包中没有可导入的网页文件。');
        }

        shouldCleanupFinalDir = false;
        return {
            rootDir: bundleRootDir,
            entryFile,
            resourcePaths,
        };
    } catch (error) {
        if (shouldCleanupFinalDir && (await services.exists(finalBundleDir))) {
            await services.delete(finalBundleDir, { recursive: true });
        }
        throw error;
    } finally {
        if (await services.exists(stageRootDir)) {
            await services.delete(stageRootDir, { recursive: true });
        }
    }
}
