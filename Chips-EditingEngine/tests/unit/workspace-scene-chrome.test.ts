import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const workspaceScenePath = fileURLToPath(new URL('../../src/scenes/WorkspaceScene.tsx', import.meta.url));
const commandDefinitionsPath = fileURLToPath(new URL('../../src/commands/editing-engine-commands.ts', import.meta.url));

describe('WorkspaceScene application chrome', () => {
  it('does not mount the application header toolbar above the workspace', async () => {
    const source = await readFile(workspaceScenePath, 'utf8');

    expect(source).not.toContain("from '../components/HeaderBar/HeaderBar'");
    expect(source).not.toContain('<HeaderBar');
  });

  it('does not publish application-level workspace toolbar placements', async () => {
    const source = await readFile(commandDefinitionsPath, 'utf8');

    expect(source).not.toContain("toolbarId: 'workspace'");
  });
});
