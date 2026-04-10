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
  permissions?: string[];
  launchParams?: Record<string, unknown>;
  chrome?: WindowChromeOptions;
}

export type WindowStateKind = "normal" | "minimized" | "maximized" | "fullscreen";

export interface WindowState {
  id: string;
  kind: "window";
  title: string;
  width: number;
  height: number;
  focused: boolean;
  state: WindowStateKind;
  url?: string;
  pluginId?: string;
  sessionId?: string;
  chrome?: WindowChromeOptions;
  [key: string]: unknown;
}

export interface WindowApi {
  open(config: WindowConfig): Promise<WindowState>;
  focus(id: string): Promise<void>;
  resize(id: string, size: { width: number; height: number }): Promise<void>;
  setState(id: string, state: WindowStateKind): Promise<void>;
  getState(id: string): Promise<WindowState>;
  close(id: string): Promise<void>;
}

export function createWindowApi(client: CoreClient): WindowApi {
  return {
    async open(config) {
      const result = await client.invoke<{ config: WindowConfig }, { window: WindowState }>("window.open", { config });
      return result.window;
    },
    async focus(id) {
      await client.invoke("window.focus", { windowId: id });
    },
    async resize(id, size) {
      await client.invoke("window.resize", {
        windowId: id,
        width: size.width,
        height: size.height,
      });
    },
    async setState(id, state) {
      await client.invoke("window.setState", { windowId: id, state });
    },
    async getState(id) {
      const result = await client.invoke<{ windowId: string }, { state: WindowState }>("window.getState", {
        windowId: id,
      });
      return result.state;
    },
    async close(id) {
      await client.invoke("window.close", { windowId: id });
    },
  };
}
