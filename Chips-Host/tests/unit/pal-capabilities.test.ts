import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { NodePalAdapter } from '../../packages/pal/src';

const MOCK_KEY = '__chipsElectronMock';

afterEach(() => {
  const target = globalThis as Record<string, unknown>;
  delete target[MOCK_KEY];
});

describe('Node PAL capabilities', () => {
  it('supports filesystem watch notifications', async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'chips-pal-watch-'));
    const filePath = path.join(workspace, 'demo.txt');
    await fs.writeFile(filePath, 'initial', 'utf-8');

    const pal = new NodePalAdapter();
    const eventPromise = new Promise<{ path: string }>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('watch timeout'));
      }, 4_000);

      let subscriptionRef: Awaited<ReturnType<typeof pal.fs.watch>> | undefined;
      void pal.fs
        .watch(filePath, async (event) => {
          clearTimeout(timer);
          await subscriptionRef?.close();
          resolve({ path: event.path });
        })
        .then((subscription) => {
          subscriptionRef = subscription;
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });

    await fs.writeFile(filePath, 'updated', 'utf-8');
    const event = await eventPromise;

    expect(path.resolve(event.path)).toContain('demo.txt');
    await fs.rm(workspace, { recursive: true, force: true });
  });

  it('supports clipboard image and file payloads via electron clipboard bridge', async () => {
    let text = '';
    let image: Uint8Array = Buffer.alloc(0);
    const buffers = new Map<string, Buffer>();

    (globalThis as Record<string, unknown>)[MOCK_KEY] = {
      clipboard: {
        readText: () => text,
        writeText: (value: string) => {
          text = value;
        },
        readImage: () => ({
          toPNG: () => Buffer.from(image)
        }),
        writeImage: (nativeImage: { toPNG: () => Buffer }) => {
          image = Buffer.from(nativeImage.toPNG());
        },
        readBuffer: (format: string) => buffers.get(format) ?? Buffer.alloc(0),
        writeBuffer: (format: string, value: Buffer) => {
          buffers.set(format, Buffer.from(value));
        }
      },
      nativeImage: {
        createFromBuffer: (value: Buffer) => ({
          toPNG: () => Buffer.from(value)
        })
      }
    };

    const pal = new NodePalAdapter();
    const encodedImage = Buffer.from('chips-image').toString('base64');
    await pal.clipboard.write({ base64: encodedImage }, 'image');
    const imagePayload = await pal.clipboard.read('image');

    await pal.clipboard.write(['/tmp/chips/a.card', '/tmp/chips/b.card'], 'files');
    const filesPayload = await pal.clipboard.read('files');

    expect(imagePayload).toMatchObject({ base64: encodedImage, mimeType: 'image/png' });
    expect(filesPayload).toEqual(['/tmp/chips/a.card', '/tmp/chips/b.card']);
    expect(text).toContain('/tmp/chips/a.card');
  });

  it('supports IPC channel create/send/receive/close', async () => {
    const pal = new NodePalAdapter();

    const shared = await pal.ipc.createChannel({
      name: 'shared-demo',
      transport: 'shared-memory'
    });
    await pal.ipc.send(shared.channelId, 'hello-shared');
    const sharedMessage = await pal.ipc.receive(shared.channelId, { timeoutMs: 2_000 });

    const namedPipe = await pal.ipc.createChannel({
      name: 'pipe-demo',
      transport: 'named-pipe'
    });
    const payload = Buffer.from('hello-pipe');
    await pal.ipc.send(namedPipe.channelId, payload);
    const pipeMessage = await pal.ipc.receive(namedPipe.channelId, { timeoutMs: 2_000 });

    const listed = await pal.ipc.listChannels();

    expect(sharedMessage.payload.toString('utf-8')).toBe('hello-shared');
    expect(pipeMessage.payload.toString('utf-8')).toBe('hello-pipe');
    expect(listed.map((item) => item.channelId)).toEqual(expect.arrayContaining([shared.channelId, namedPipe.channelId]));

    await pal.ipc.closeChannel(shared.channelId);
    await pal.ipc.closeChannel(namedPipe.channelId);
  });
});
