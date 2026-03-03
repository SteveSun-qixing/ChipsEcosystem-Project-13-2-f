export interface ZipEntryInput {
  path: string;
  data: Buffer;
}

export interface ZipEntryMeta {
  path: string;
  size: number;
  compressedSize: number;
  crc32: number;
  offset: number;
}
