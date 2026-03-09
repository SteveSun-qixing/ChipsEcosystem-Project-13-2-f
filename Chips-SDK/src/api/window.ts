import type { CoreClient } from "../types/client";

export type WindowChromeTitleBarStyle = "default" | "hidden" | "hiddenInset" | "customButtonsOnHover";

export interface WindowChromeOverlayOptions {
  color?: string;
  symbolColor?: string;
  height?: number;
}

export interface WindowChromeOptions {
  frame?: boolean;
  transparent?: boolean;
  backgroundColor?: string;
  titleBarStyle?: WindowChromeTitleBarStyle;
  titleBarOverlay?: boolean | WindowChromeOverlayOptions;
}

export interface WindowConfig {
  title: string;
  width: number;
  height: number;
  url?: string;
  pluginId?: string;
  sessionId?: string;
  chrome?: WindowChromeOptions;
}

export interface WindowState {
  id: string;
  title: string;
  width: number;
  height: number;
  focused: boolean;
  chrome?: WindowChromeOptions;
  [key: string]: unknown;
}

export interface WindowApi {
  open(config: WindowConfig): Promise<WindowState>;
  focus(id: string): Promise<void>;
  resize(id: string, size: { width: number; height: number }): Promise<void>;
  setState(id: string, state: Partial<WindowState>): Promise<void>;
}

export function createWindowApi(client: CoreClient): WindowApi {
  return {
    async open(config) {
      return client.invoke("window.open", { config });
    },
    async focus(id) {
      return client.invoke("window.focus", { id });
    },
    async resize(id, size) {
      return client.invoke("window.resize", { id, size });
    },
    async setState(id, state) {
      return client.invoke("window.setState", { id, state });
    },
  };
}
