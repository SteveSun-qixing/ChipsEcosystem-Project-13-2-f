import type { Client, PlatformLaunchContext, SurfaceContext } from 'chips-sdk';

export interface EditingEngineLaunchSnapshot {
  launchContext: PlatformLaunchContext | null;
  surfaceContext: SurfaceContext | null;
  sceneId: string;
  surfaceId?: string;
  launchParams: Record<string, unknown>;
  workspacePath?: string;
}

const DEFAULT_SCENE_ID = 'editing-engine.workspace';

function getStringRecordValue(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function resolveWorkspacePath(launchParams: Record<string, unknown>): string | undefined {
  return getStringRecordValue(launchParams, 'workspacePath') ?? getStringRecordValue(launchParams, 'workspace');
}

export function readLaunchContext(client: Client): EditingEngineLaunchSnapshot {
  const launchContext = client.platform?.getLaunchContext?.() ?? null;
  const surfaceContext = launchContext?.surfaceContext ?? null;
  const launchParams = {
    ...surfaceContext?.launchParams,
    ...launchContext?.launchParams,
  };
  const sceneId = surfaceContext?.sceneId ?? launchContext?.sceneId ?? DEFAULT_SCENE_ID;

  return {
    launchContext,
    surfaceContext,
    sceneId,
    surfaceId: surfaceContext?.surfaceId ?? launchContext?.surfaceId,
    launchParams,
    workspacePath: resolveWorkspacePath(launchParams),
  };
}
