import { inflateSync } from "node:zlib";
import { createColorPickerError } from "./errors";
import type { DecodedPng } from "./types";

const PNG_SIGNATURE = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const readUInt32 = (bytes: Uint8Array, offset: number): number => {
  return (
    ((bytes[offset] ?? 0) << 24) |
    ((bytes[offset + 1] ?? 0) << 16) |
    ((bytes[offset + 2] ?? 0) << 8) |
    (bytes[offset + 3] ?? 0)
  ) >>> 0;
};

const readChunkType = (bytes: Uint8Array, offset: number): string => {
  return String.fromCharCode(bytes[offset] ?? 0, bytes[offset + 1] ?? 0, bytes[offset + 2] ?? 0, bytes[offset + 3] ?? 0);
};

const assertPng = (input: Uint8Array): void => {
  if (input.length < PNG_SIGNATURE.length) {
    throw createColorPickerError("COLOR_PICKER_PNG_INVALID", "PNG sample is truncated.");
  }

  for (let index = 0; index < PNG_SIGNATURE.length; index += 1) {
    if (input[index] !== PNG_SIGNATURE[index]) {
      throw createColorPickerError("COLOR_PICKER_PNG_INVALID", "PNG sample has an invalid signature.");
    }
  }
};

const paethPredictor = (left: number, up: number, upLeft: number): number => {
  const predictor = left + up - upLeft;
  const distanceLeft = Math.abs(predictor - left);
  const distanceUp = Math.abs(predictor - up);
  const distanceUpLeft = Math.abs(predictor - upLeft);

  if (distanceLeft <= distanceUp && distanceLeft <= distanceUpLeft) {
    return left;
  }
  if (distanceUp <= distanceUpLeft) {
    return up;
  }
  return upLeft;
};

const reverseFilters = (
  inflated: Uint8Array,
  width: number,
  height: number,
  bytesPerPixel: number,
): Uint8Array => {
  const stride = width * bytesPerPixel;
  const expectedLength = height * (stride + 1);
  if (inflated.length < expectedLength) {
    throw createColorPickerError("COLOR_PICKER_PNG_INVALID", "PNG sample data is shorter than expected.");
  }

  const output = new Uint8Array(width * height * bytesPerPixel);
  let sourceOffset = 0;

  for (let row = 0; row < height; row += 1) {
    const filter = inflated[sourceOffset] ?? 0;
    sourceOffset += 1;
    const rowOffset = row * stride;

    for (let index = 0; index < stride; index += 1) {
      const rawByte = inflated[sourceOffset + index] ?? 0;
      const left = index >= bytesPerPixel ? output[rowOffset + index - bytesPerPixel] ?? 0 : 0;
      const up = row > 0 ? output[rowOffset + index - stride] ?? 0 : 0;
      const upLeft = row > 0 && index >= bytesPerPixel ? output[rowOffset + index - stride - bytesPerPixel] ?? 0 : 0;

      switch (filter) {
        case 0:
          output[rowOffset + index] = rawByte;
          break;
        case 1:
          output[rowOffset + index] = (rawByte + left) & 0xff;
          break;
        case 2:
          output[rowOffset + index] = (rawByte + up) & 0xff;
          break;
        case 3:
          output[rowOffset + index] = (rawByte + Math.floor((left + up) / 2)) & 0xff;
          break;
        case 4:
          output[rowOffset + index] = (rawByte + paethPredictor(left, up, upLeft)) & 0xff;
          break;
        default:
          throw createColorPickerError("COLOR_PICKER_PNG_INVALID", `PNG sample uses unsupported filter type: ${filter}.`);
      }
    }

    sourceOffset += stride;
  }

  return output;
};

const expandToRgba = (decoded: Uint8Array, width: number, height: number, colorType: number): Uint8Array => {
  const rgba = new Uint8Array(width * height * 4);

  if (colorType === 6) {
    rgba.set(decoded);
    return rgba;
  }

  if (colorType === 2) {
    for (let sourceOffset = 0, targetOffset = 0; sourceOffset < decoded.length; sourceOffset += 3, targetOffset += 4) {
      rgba[targetOffset] = decoded[sourceOffset] ?? 0;
      rgba[targetOffset + 1] = decoded[sourceOffset + 1] ?? 0;
      rgba[targetOffset + 2] = decoded[sourceOffset + 2] ?? 0;
      rgba[targetOffset + 3] = 255;
    }
    return rgba;
  }

  for (let sourceOffset = 0, targetOffset = 0; sourceOffset < decoded.length; sourceOffset += 1, targetOffset += 4) {
    const gray = decoded[sourceOffset] ?? 0;
    rgba[targetOffset] = gray;
    rgba[targetOffset + 1] = gray;
    rgba[targetOffset + 2] = gray;
    rgba[targetOffset + 3] = 255;
  }
  return rgba;
};

export const decodePng = (input: Uint8Array): DecodedPng => {
  assertPng(input);

  let offset = PNG_SIGNATURE.length;
  let width: number | undefined;
  let height: number | undefined;
  let bitDepth: number | undefined;
  let colorType: number | undefined;
  let compressionMethod: number | undefined;
  let filterMethod: number | undefined;
  let interlaceMethod: number | undefined;
  const idatChunks: Uint8Array[] = [];

  while (offset + 8 <= input.length) {
    const chunkLength = readUInt32(input, offset);
    const typeOffset = offset + 4;
    const dataOffset = offset + 8;
    const dataEnd = dataOffset + chunkLength;
    const crcEnd = dataEnd + 4;

    if (crcEnd > input.length) {
      throw createColorPickerError("COLOR_PICKER_PNG_INVALID", "PNG sample chunk length exceeds file size.");
    }

    const type = readChunkType(input, typeOffset);
    const chunkData = input.slice(dataOffset, dataEnd);

    if (type === "IHDR") {
      width = readUInt32(chunkData, 0);
      height = readUInt32(chunkData, 4);
      bitDepth = chunkData[8];
      colorType = chunkData[9];
      compressionMethod = chunkData[10];
      filterMethod = chunkData[11];
      interlaceMethod = chunkData[12];
    } else if (type === "IDAT") {
      idatChunks.push(chunkData);
    } else if (type === "IEND") {
      break;
    }

    offset = crcEnd;
  }

  if (!width || !height || bitDepth === undefined || colorType === undefined) {
    throw createColorPickerError("COLOR_PICKER_PNG_INVALID", "PNG sample is missing IHDR metadata.");
  }

  if (compressionMethod !== 0 || filterMethod !== 0 || interlaceMethod !== 0) {
    throw createColorPickerError("COLOR_PICKER_PNG_INVALID", "PNG sample uses an unsupported encoding mode.");
  }

  if (bitDepth !== 8) {
    throw createColorPickerError("COLOR_PICKER_PNG_INVALID", `PNG sample bit depth ${bitDepth} is not supported.`);
  }

  if (colorType !== 0 && colorType !== 2 && colorType !== 6) {
    throw createColorPickerError("COLOR_PICKER_PNG_INVALID", `PNG sample color type ${colorType} is not supported.`);
  }

  if (idatChunks.length === 0) {
    throw createColorPickerError("COLOR_PICKER_PNG_INVALID", "PNG sample does not contain IDAT data.");
  }

  const compressed = Buffer.concat(idatChunks.map((chunk) => Buffer.from(chunk)));
  const inflated = new Uint8Array(inflateSync(compressed));
  const bytesPerPixel = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const decoded = reverseFilters(inflated, width, height, bytesPerPixel);

  return {
    width,
    height,
    pixels: expandToRgba(decoded, width, height, colorType),
  };
};
