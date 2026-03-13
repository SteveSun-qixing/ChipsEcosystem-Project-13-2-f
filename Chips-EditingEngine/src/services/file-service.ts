import { getChipsClient } from './bridge-client';
import type { FileStat, FileReadOptions, FileContent, FileEntry } from 'chips-sdk';

/**
 * 文件服务 — 封装 Chips Host 提供的文件操作路由。
 *
 * Host 支持的路由（来自 register-schemas.ts / register-host-services.ts）：
 *   file.read, file.write, file.stat, file.list, file.watch
 *
 * 注意：Host 未暴露 mkdir / delete / move / copy 路由。
 * 需要这类操作须通过 platform.shellOpenPath 或设计工作区时避免依赖这些能力。
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

    async list(dir: string): Promise<FileEntry[]> {
        const result = await getChipsClient().file.list(dir);
        // SDK list returns entries directly or wrapped in { entries }
        const entries = (result as any)?.entries ?? result;
        return Array.isArray(entries) ? entries : [];
    },

    async stat(path: string): Promise<FileStat> {
        const result = await getChipsClient().file.stat(path);
        // SDK stat returns meta directly or wrapped in { meta }
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

    /**
     * Host 不支持 mkdir 路由。
     * 当需要创建目录时，可通过 file.write 写入一个占位文件来隐式创建父目录（仅对支持的平台有效），
     * 或者在设计上要求工作区目录已经存在。
     * 此处提供一个 no-op 实现，确保现有调用不会崩溃。
     */
    async mkdir(_path: string): Promise<void> {
        // Host does not expose file.mkdir route.
        // Workspace directories should be pre-created or selected by the user.
        console.warn('[FileService] mkdir is not supported via Host IPC. Path:', _path);
    },

    /**
     * 确保目录存在。如果不存在，记录警告但不抛出错误。
     */
    async ensureDir(path: string): Promise<void> {
        const exists = await this.exists(path);
        if (!exists) {
            console.warn('[FileService] Directory does not exist and cannot be created via Host IPC:', path);
        }
    },

    /**
     * Host 不支持 delete 路由 — no-op with warning。
     */
    async delete(_path: string): Promise<void> {
        console.warn('[FileService] delete is not supported via Host IPC. Path:', _path);
    },

    /**
     * Host 不支持 move 路由 — no-op with warning。
     */
    async move(_sourcePath: string, _destPath: string): Promise<void> {
        console.warn('[FileService] move is not supported via Host IPC.');
    },

    /**
     * Host 不支持 copy 路由 — no-op with warning。
     */
    async copy(_sourcePath: string, _destPath: string): Promise<void> {
        console.warn('[FileService] copy is not supported via Host IPC.');
    },
};
