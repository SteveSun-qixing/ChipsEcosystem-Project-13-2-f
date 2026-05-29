export const ELECTRON_APP_CLI_REQUEST_PREFIX = '--chips-cli-app-request=';
export const ELECTRON_APP_CLI_RESULT_PREFIX = '__CHIPS_CLI_APP_RESULT__ ';
export const ELECTRON_APP_CLI_ERROR_PREFIX = '__CHIPS_CLI_APP_ERROR__ ';

export interface ElectronAppCliCommandRequest {
  workspacePath: string;
  command: unknown;
  payload: Record<string, unknown>;
}

export const encodeElectronAppCliPayload = (value: unknown): string => {
  return Buffer.from(JSON.stringify(value), 'utf-8').toString('base64url');
};

export const decodeElectronAppCliPayload = <T = unknown>(value: string): T => {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf-8')) as T;
};
