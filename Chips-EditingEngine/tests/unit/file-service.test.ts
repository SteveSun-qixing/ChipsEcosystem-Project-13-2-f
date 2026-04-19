// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

const readMock = vi.fn();

vi.mock('../../src/services/bridge-client', () => ({
  getChipsClient: () => ({
    file: {
      read: readMock,
    },
  }),
}));

describe('fileService.readBinary', () => {
  afterEach(() => {
    readMock.mockReset();
  });

  it('decodes base64 binary payloads without relying on Buffer', async () => {
    const previousBuffer = (globalThis as typeof globalThis & { Buffer?: unknown }).Buffer;
    Object.defineProperty(globalThis, 'Buffer', {
      configurable: true,
      writable: true,
      value: undefined,
    });

    try {
      readMock.mockResolvedValue({
        content: 'AQIDBA==',
      });

      const { fileService } = await import('../../src/services/file-service');
      const result = await fileService.readBinary('/tmp/demo.bin');

      expect(Array.from(result)).toEqual([1, 2, 3, 4]);
      expect(readMock).toHaveBeenCalledWith('/tmp/demo.bin', { encoding: 'binary' });
    } finally {
      Object.defineProperty(globalThis, 'Buffer', {
        configurable: true,
        writable: true,
        value: previousBuffer,
      });
    }
  });

  it('accepts serialized Buffer json payloads', async () => {
    readMock.mockResolvedValue({
      content: {
        type: 'Buffer',
        data: [5, 6, 7],
      },
    });

    const { fileService } = await import('../../src/services/file-service');
    const result = await fileService.readBinary('/tmp/demo.bin');

    expect(Array.from(result)).toEqual([5, 6, 7]);
  });

  it('accepts latin1 byte-string payloads returned by file.read(binary)', async () => {
    readMock.mockResolvedValue({
      content: String.fromCharCode(0x89, 0x50, 0x4e, 0x47),
    });

    const { fileService } = await import('../../src/services/file-service');
    const result = await fileService.readBinary('/tmp/demo.png');

    expect(Array.from(result)).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });
});
