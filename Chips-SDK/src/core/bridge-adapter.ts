import { createError, isStandardError, type StandardError } from "../types/errors";
import type { ClientConfig, EventsApi } from "../types/client";

export interface BridgeAdapter extends EventsApi {
  invoke<I, O>(action: string, payload: I, config: ClientConfig): Promise<O>;
}

export interface ChipsBridge {
  invoke(action: string, payload?: unknown): Promise<unknown>;
  on(event: string, handler: (payload: unknown) => void): () => void;
  once(event: string, handler: (payload: unknown) => void): void;
  emit(event: string, payload?: unknown): Promise<void>;
}

declare global {
  interface Window {
    chips?: ChipsBridge;
  }
}

export function createPluginBridgeAdapter(): BridgeAdapter {
  const bridge = (typeof window !== "undefined" ? (window as any).chips : undefined) as
    | ChipsBridge
    | undefined;

  if (!bridge) {
    throw createError(
      "BRIDGE_UNAVAILABLE",
      "window.chips is not available in the current environment.",
    );
  }

  return {
    async invoke<I, O>(action: string, payload: I): Promise<O> {
      try {
        const result = await bridge.invoke(action, payload);
        return result as O;
      } catch (err) {
        if (isStandardError(err)) {
          throw err;
        }
        const e = err as any;
        throw createError(
          e?.code ?? "INTERNAL_ERROR",
          e?.message ?? "Unknown error from Bridge API.",
          e,
        );
      }
    },
    on<T>(event: string, handler: (payload: T) => void): () => void {
      return bridge.on(event, (payload) => handler(payload as T));
    },
    once<T>(event: string, handler: (payload: T) => void): void {
      bridge.once(event, (payload) => handler(payload as T));
    },
    async emit<T>(event: string, payload: T): Promise<void> {
      await bridge.emit(event, payload);
    },
  };
}

export function createTransportAdapter(
  transport: (action: string, payload: unknown) => Promise<unknown>,
): BridgeAdapter {
  const listeners = new Map<string, Set<(payload: unknown) => void>>();

  return {
    async invoke<I, O>(action: string, payload: I): Promise<O> {
      try {
        const result = await transport(action, payload);
        return result as O;
      } catch (err) {
        if (isStandardError(err)) {
          throw err;
        }
        const e = err as any;
        throw createError(
          e?.code ?? "INTERNAL_ERROR",
          e?.message ?? "Unknown error from custom transport.",
          e,
        );
      }
    },
    on<T>(event: string, handler: (payload: T) => void): () => void {
      const set = listeners.get(event) ?? new Set();
      const wrapped = (payload: unknown) => handler(payload as T);
      set.add(wrapped);
      listeners.set(event, set);
      return () => {
        const s = listeners.get(event);
        if (!s) return;
        s.delete(wrapped);
        if (s.size === 0) listeners.delete(event);
      };
    },
    once<T>(event: string, handler: (payload: T) => void): void {
      const off = this.on<T>(event, (payload) => {
        off();
        handler(payload);
      });
    },
    async emit<T>(event: string, payload: T): Promise<void> {
      const handlers = listeners.get(event);
      if (!handlers) return;
      for (const fn of handlers) {
        fn(payload);
      }
    },
  };
}

