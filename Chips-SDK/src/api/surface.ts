import type { CoreClient } from "../types/client";
import type { WindowChromeOptions } from "./window";

export type SurfaceKind = "window" | "tab" | "route" | "modal" | "sheet" | "fullscreen";
export type SurfaceStateKind = "normal" | "minimized" | "maximized" | "fullscreen" | "hidden";

export interface SurfacePresentation {
  title?: string;
  width?: number;
  height?: number;
  resizable?: boolean;
  alwaysOnTop?: boolean;
  chrome?: WindowChromeOptions;
}

export type SurfaceTarget =
  | {
      type: "plugin";
      pluginId: string;
      url?: string;
      sessionId?: string;
      permissions?: string[];
      launchParams?: Record<string, unknown>;
    }
  | {
      type: "url";
      url: string;
    }
  | {
      type: "document";
      documentId: string;
      title?: string;
      url?: string;
    };

export interface SurfaceOpenRequest {
  kind?: SurfaceKind;
  target: SurfaceTarget;
  presentation?: SurfacePresentation;
}

export interface SurfaceState {
  id: string;
  kind: SurfaceKind;
  title?: string;
  width?: number;
  height?: number;
  focused: boolean;
  state: SurfaceStateKind;
  url?: string;
  pluginId?: string;
  sessionId?: string;
  chrome?: WindowChromeOptions;
  metadata?: Record<string, unknown>;
}

export interface SurfaceApi {
  open(request: SurfaceOpenRequest): Promise<SurfaceState>;
  focus(surfaceId: string): Promise<void>;
  resize(surfaceId: string, size: { width: number; height: number }): Promise<void>;
  setState(surfaceId: string, state: SurfaceStateKind): Promise<void>;
  getState(surfaceId: string): Promise<SurfaceState>;
  close(surfaceId: string): Promise<void>;
  list(): Promise<SurfaceState[]>;
}

export function createSurfaceApi(client: CoreClient): SurfaceApi {
  return {
    async open(request) {
      const result = await client.invoke<{ request: SurfaceOpenRequest }, { surface: SurfaceState }>("surface.open", {
        request,
      });
      return result.surface;
    },
    async focus(surfaceId) {
      await client.invoke("surface.focus", { surfaceId });
    },
    async resize(surfaceId, size) {
      await client.invoke("surface.resize", {
        surfaceId,
        width: size.width,
        height: size.height,
      });
    },
    async setState(surfaceId, state) {
      await client.invoke("surface.setState", { surfaceId, state });
    },
    async getState(surfaceId) {
      const result = await client.invoke<{ surfaceId: string }, { state: SurfaceState }>("surface.getState", {
        surfaceId,
      });
      return result.state;
    },
    async close(surfaceId) {
      await client.invoke("surface.close", { surfaceId });
    },
    async list() {
      const result = await client.invoke<Record<string, never>, { surfaces: SurfaceState[] }>("surface.list", {});
      return result.surfaces;
    },
  };
}
