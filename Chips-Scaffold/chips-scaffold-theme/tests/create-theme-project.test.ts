import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createThemeProject, listThemeTemplates } from '../src';

const readFile = (filePath: string): string => fs.readFileSync(filePath, 'utf-8');

describe('chips-scaffold-theme', () => {
  it('lists available theme templates', () => {
    const templates = listThemeTemplates();
    const ids = templates.map((t) => t.id);
    expect(ids).toContain('theme-standard');
    const standard = templates.find((t) => t.id === 'theme-standard');
    expect(standard?.recommended).toBe(true);
  });

  it('creates a theme project from theme-standard template', async () => {
    const workspace = await fsp.mkdtemp(path.join(os.tmpdir(), 'chips-theme-scaffold-test-'));
    const projectDir = path.join(workspace, 'my-theme');

    await createThemeProject({
      targetDir: projectDir,
      themeId: 'chips-official:default-theme',
      displayName: '薯片官方 · 默认主题',
      description: 'Default theme for Chips ecosystem'
    });

    const manifestPath = path.join(projectDir, 'manifest.yaml');
    const packageJsonPath = path.join(projectDir, 'package.json');
    const tokensDir = path.join(projectDir, 'tokens');

    expect(fs.existsSync(manifestPath)).toBe(true);
    expect(fs.existsSync(packageJsonPath)).toBe(true);
    expect(fs.existsSync(tokensDir)).toBe(true);

    const manifestContent = readFile(manifestPath);
    expect(manifestContent).toContain('type: theme');
    expect(manifestContent).toContain('themeId: chips-official:default-theme');
    expect(manifestContent).toContain('薯片官方 · 默认主题');

    const packageJson = JSON.parse(readFile(packageJsonPath)) as { name: string; scripts?: Record<string, string> };
    expect(typeof packageJson.name).toBe('string');
    expect(packageJson.scripts?.build).toBeDefined();
    expect(packageJson.scripts?.['validate:theme']).toBeDefined();

    const globalTokensPath = path.join(tokensDir, 'global.json');
    expect(fs.existsSync(globalTokensPath)).toBe(true);
  });
});

