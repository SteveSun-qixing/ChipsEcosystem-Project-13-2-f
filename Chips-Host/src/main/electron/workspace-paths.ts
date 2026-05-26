import fs from 'node:fs';
import path from 'node:path';
import type { ElectronAppLike } from './electron-loader';

export const electronUserDataPathForWorkspace = (workspacePath: string): string =>
  path.join(workspacePath, 'electron-user-data');

export const configureElectronUserDataPath = (electronApp: ElectronAppLike | null | undefined, workspacePath: string): void => {
  if (!electronApp?.setPath) {
    return;
  }

  const userDataPath = electronUserDataPathForWorkspace(workspacePath);
  fs.mkdirSync(userDataPath, { recursive: true });
  electronApp.setPath('userData', userDataPath);
};
