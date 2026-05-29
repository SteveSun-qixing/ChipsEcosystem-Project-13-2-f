import { concatBytes, numberToUint32BE, utf8Bytes, writeUint16LE, writeUint32LE } from "./binary";

export interface IcoImageEntry {
  size: number;
  pngBytes: Uint8Array;
}

export interface IcnsImageEntry {
  type: string;
  pngBytes: Uint8Array;
}

export const createIcoFile = (entries: IcoImageEntry[]): Uint8Array => {
  const sortedEntries = [...entries].sort((left, right) => left.size - right.size);
  const headerLength = 6 + sortedEntries.length * 16;
  const totalLength = headerLength + sortedEntries.reduce((sum, entry) => sum + entry.pngBytes.byteLength, 0);
  const output = new Uint8Array(totalLength);
  const view = new DataView(output.buffer);

  writeUint16LE(view, 0, 0);
  writeUint16LE(view, 2, 1);
  writeUint16LE(view, 4, sortedEntries.length);

  let imageOffset = headerLength;
  sortedEntries.forEach((entry, index) => {
    const directoryOffset = 6 + index * 16;
    const dimension = entry.size >= 256 ? 0 : entry.size;

    view.setUint8(directoryOffset, dimension);
    view.setUint8(directoryOffset + 1, dimension);
    view.setUint8(directoryOffset + 2, 0);
    view.setUint8(directoryOffset + 3, 0);
    writeUint16LE(view, directoryOffset + 4, 1);
    writeUint16LE(view, directoryOffset + 6, 32);
    writeUint32LE(view, directoryOffset + 8, entry.pngBytes.byteLength);
    writeUint32LE(view, directoryOffset + 12, imageOffset);

    output.set(entry.pngBytes, imageOffset);
    imageOffset += entry.pngBytes.byteLength;
  });

  return output;
};

const resolveIcnsType = (size: number): string => {
  if (size <= 16) {
    return "ic04";
  }
  if (size <= 32) {
    return "ic05";
  }
  if (size <= 64) {
    return "ic12";
  }
  if (size <= 128) {
    return "ic07";
  }
  if (size <= 256) {
    return "ic08";
  }
  return "ic09";
};

export const createIcnsFile = (entries: IcnsImageEntry[]): Uint8Array => {
  const parts = entries.map((entry) => {
    const length = 8 + entry.pngBytes.byteLength;
    return concatBytes([utf8Bytes(entry.type), numberToUint32BE(length), entry.pngBytes]);
  });
  const totalLength = 8 + parts.reduce((sum, part) => sum + part.byteLength, 0);

  return concatBytes([utf8Bytes("icns"), numberToUint32BE(totalLength), ...parts]);
};

export const createIcnsFileFromPng = (size: number, pngBytes: Uint8Array): Uint8Array =>
  createIcnsFile([{ type: resolveIcnsType(size), pngBytes }]);
