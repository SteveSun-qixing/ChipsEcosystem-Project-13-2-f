import { Stats } from "node:fs";
import type { TemplateFileInfo } from "./types";
export declare function ensureDirectory(dir: string): Promise<void>;
export declare function statPath(p: string): Promise<Stats | null>;
export declare function listTemplateFiles(rootDir: string): Promise<TemplateFileInfo[]>;
export declare function readTextFile(filePath: string): Promise<string>;
export declare function writeTextFile(filePath: string, content: string): Promise<void>;
export declare function copyBinaryFile(sourcePath: string, targetPath: string): Promise<void>;
