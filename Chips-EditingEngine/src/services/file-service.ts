import { getChipsClient } from './bridge-client';
import type { FileStat, FileEntry, FileDeleteOptions, FileListOptions } from 'chips-sdk';

/**
 * 文件服务 — 封装 Chips Host 提供的文件操作路由。
 *
 * Host 支持的路由（来自 register-schemas.ts / register-host-services.ts）：
 *   file.read, file.write, file.stat, file.list, file.watch
 *   file.mkdir, file.delete, file.move, file.copy
 */
export const fileService = {
    async readText(path: string): Promise<string> {
        const result = await getChipsClient().file.read(path, { encoding: 'utf-8' });
        const content = (result as any)?.content ?? result;
        if (typeof content !== 'string') {
            throw new Error(`Expected text content for ${path}`);
        }
        return content;
    },

    async readBinary(path: string): Promise<Uint8Array> {
        const result = await getChipsClient().file.read(path, { encoding: 'binary' });
        const content = (result as any)?.content ?? result;
        if (content instanceof Uint8Array) return content;
        if (typeof content === 'string') {
            const buf = Buffer.from(content, 'base64');
            return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
        }
        throw new Error(`Expected binary content for ${path}`);
    },

    async writeText(path: string, content: string): Promise<void> {
        await getChipsClient().file.write(path, content, { encoding: 'utf-8' });
    },

    async writeBinary(path: string, content: Uint8Array): Promise<void> {
        await getChipsClient().file.write(path, content, { encoding: 'binary' });
    },

    async list(dir: string, options?: FileListOptions): Promise<FileEntry[]> {
        const result = await getChipsClient().file.list(dir, options);
        const entries = (result as any)?.entries ?? result;
        return Array.isArray(entries) ? entries : [];
    },

    async stat(path: string): Promise<FileStat> {
        const result = await getChipsClient().file.stat(path);
        return ((result as any)?.meta ?? result) as FileStat;
    },

    async exists(path: string): Promise<boolean> {
        try {
            await this.stat(path);
            return true;
        } catch {
            return false;
        }
    },

    async mkdir(path: string): Promise<void> {
        await getChipsClient().file.mkdir(path);
    },

    async ensureDir(path: string): Promise<void> {
        const exists = await this.exists(path);
        if (!exists) {
            await this.mkdir(path);
        }
    },

    async delete(path: string, options?: FileDeleteOptions): Promise<void> {
        await getChipsClient().file.delete(path, options);
    },

    async move(sourcePath: string, destPath: string): Promise<void> {
        await getChipsClient().file.move(sourcePath, destPath);
    },

    async copy(sourcePath: string, destPath: string): Promise<void> {
        await getChipsClient().file.copy(sourcePath, destPath);
    },
};
