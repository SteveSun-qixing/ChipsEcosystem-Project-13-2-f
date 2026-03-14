export type BasecardConfigRecord = Record<string, unknown>;

export interface EditorValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export interface BasecardRenderContext {
  container: HTMLElement;
  config: BasecardConfigRecord;
  themeCssText?: string;
}

export interface BasecardEditorContext {
  container: HTMLElement;
  initialConfig: BasecardConfigRecord;
  onChange: (next: BasecardConfigRecord) => void;
}

export interface BasecardDescriptor {
  pluginId: string;
  cardType: string;
  displayName: string;
  aliases?: string[];
  commitDebounceMs?: number;
  createInitialConfig: (baseCardId: string) => BasecardConfigRecord;
  normalizeConfig: (input: BasecardConfigRecord, baseCardId: string) => BasecardConfigRecord;
  validateConfig: (config: BasecardConfigRecord) => EditorValidationResult;
  renderView: (ctx: BasecardRenderContext) => (() => void) | void;
  renderEditor?: (ctx: BasecardEditorContext) => (() => void) | void;
}

