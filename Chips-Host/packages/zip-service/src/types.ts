export interface ZipEntryInput {
  path: string;
  data: Buffer;
  modifiedTime?: number;
}

export interface ZipEntryMeta {
  path: string;
  size: number;
  compressedSize: number;
  crc32: number;
  offset: number;
  isDirectory: boolean;
  compressionMethod: number;
  modifiedTime?: number;
}
