import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { CardInfoService } from '../../packages/card-info-service/src';

const workspaces: string[] = [];

const createWorkspace = async (): Promise<string> => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'chips-card-info-test-'));
  workspaces.push(workspace);
  return workspace;
};

afterEach(async () => {
  while (workspaces.length > 0) {
    const workspace = workspaces.pop();
    if (!workspace) {
      continue;
    }
    await fs.rm(workspace, { recursive: true, force: true });
  }
});

describe('CardInfoService', () => {
  it('returns normalized status, metadata and cover for ready cards', async () => {
    const workspace = await createWorkspace();
    const cardFile = path.join(workspace, 'demo.card');
    await fs.writeFile(cardFile, 'demo', 'utf-8');

    const service = new CardInfoService({
      validate: async () => ({ valid: true }),
      readMetadata: async () => ({
        chip_standards_version: '1.0.0',
        card_id: 'a1B2c3D4e5',
        name: 'Demo Card',
        created_at: '2026-03-24T10:00:00.000Z',
        modified_at: '2026-03-24T10:10:00.000Z',
        cover_ratio: '3:4',
        tags: ['旅行']
      }),
      renderCover: async () => ({
        title: 'Demo Card',
        coverUrl: 'file:///tmp/demo-cover.html',
        ratio: '3:4'
      })
    });

    await expect(service.readInfo(cardFile)).resolves.toEqual({
      cardFile,
      info: {
        status: {
          state: 'ready',
          exists: true,
          valid: true
        },
        metadata: {
          raw: {
            chip_standards_version: '1.0.0',
            card_id: 'a1B2c3D4e5',
            name: 'Demo Card',
            created_at: '2026-03-24T10:00:00.000Z',
            modified_at: '2026-03-24T10:10:00.000Z',
            cover_ratio: '3:4',
            tags: ['旅行']
          },
          chipStandardsVersion: '1.0.0',
          cardId: 'a1B2c3D4e5',
          name: 'Demo Card',
          createdAt: '2026-03-24T10:00:00.000Z',
          modifiedAt: '2026-03-24T10:10:00.000Z',
          coverRatio: '3:4',
          tags: ['旅行']
        },
        cover: {
          title: 'Demo Card',
          resourceUrl: 'file:///tmp/demo-cover.html',
          mimeType: 'text/html',
          ratio: '3:4'
        }
      }
    });
  });

  it('returns missing status for absent cards without reading metadata', async () => {
    const service = new CardInfoService({
      validate: async () => ({ valid: true }),
      readMetadata: async () => {
        throw new Error('should not read metadata');
      },
      renderCover: async () => {
        throw new Error('should not render cover');
      }
    });

    await expect(service.readInfo('/tmp/not-found.card', ['status', 'metadata'])).resolves.toEqual({
      cardFile: '/tmp/not-found.card',
      info: {
        status: {
          state: 'missing',
          exists: false,
          valid: false
        }
      }
    });
  });
});
