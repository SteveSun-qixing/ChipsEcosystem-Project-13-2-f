import { createError, isStandardError, type StandardError } from "../types/errors";
import type { ClientConfig, EventsApi } from "../types/client";

export interface BridgeAdapter extends EventsApi {
  invoke<I, O>(action: string, payload: I, config: ClientConfig): Promise<O>;
}

export interface ChipsBridge {
  invoke(action: string, payload?: unknown): Promise<unknown>;
  invokeScoped?(action: string, payload: unknown, scope: { token: string }): Promise<unknown>;
  on(event: string, handler: (payload: unknown) => void): () => void;
  once(event: string, handler: (payload: unknown) => void): void;
  emit(event: string, payload?: unknown): Promise<void>;
  emitScoped?(event: string, payload: unknown, scope: { token: string }): Promise<void>;
  platform?: {
    getPathForFile?(file: unknown): string;
  };
}

declare global {
  interface Window {
    chips?: ChipsBridge;
  }
}

const CHIPS_IPC_ERROR_PREFIX = "__chips_ipc_error__:";

function unwrapBridgeError(error: unknown, fallbackMessage: string): StandardError {
  if (isStandardError(error)) {
    return error;
  }

  const candidate = error as { code?: unknown; message?: unknown; details?: unknown; retryable?: unknown } | null;
  if (typeof candidate?.code === "string" && typeof candidate.message === "string") {
    return createError(candidate.code, candidate.message, candidate.details, candidate.retryable === true);
  }

  if (typeof candidate?.message === "string" && candidate.message.startsWith(CHIPS_IPC_ERROR_PREFIX)) {
    const encoded = candidate.message.slice(CHIPS_IPC_ERROR_PREFIX.length);
    try {
      const decoded = JSON.parse(encoded) as StandardError;
      if (isStandardError(decoded)) {
        return decoded;
      }
    } catch {
      return createError("INTERNAL_ERROR", fallbackMessage, error);
    }
  }

  return createError(
    typeof candidate?.code === "string" ? candidate.code : "INTERNAL_ERROR",
    typeof candidate?.message === "string" ? candidate.message : fallbackMessage,
    error,
  );
}

export function createPluginBridgeAdapter(scope?: { token: string }): BridgeAdapter {
  const bridge = (typeof window !== "undefined" ? (window as any).chips : undefined) as
    | ChipsBridge
    | undefined;

  if (!bridge) {
    throw createError(
      "BRIDGE_UNAVAILABLE",
      "window.chips is not available in the current environment.",
    );
  }

  if (scope && typeof bridge.invokeScoped !== "function") {
    throw createError(
      "BRIDGE_SCOPE_UNAVAILABLE",
      "Scoped Bridge API is not available in the current environment.",
    );
  }

  return {
    async invoke<I, O>(action: string, payload: I): Promise<O> {
      try {
        const result =
          scope && typeof bridge.invokeScoped === "function"
            ? await bridge.invokeScoped(action, payload, scope)
            : await bridge.invoke(action, payload);
        return result as O;
      } catch (err) {
        throw unwrapBridgeError(err, "Unknown error from Bridge API.");
      }
    },
    on<T>(event: string, handler: (payload: T) => void): () => void {
      return bridge.on(event, (payload) => handler(payload as T));
    },
    once<T>(event: string, handler: (payload: T) => void): void {
      bridge.once(event, (payload) => handler(payload as T));
    },
    async emit<T>(event: string, payload: T): Promise<void> {
      if (scope) {
        if (typeof bridge.emitScoped !== "function") {
          throw createError(
            "BRIDGE_SCOPE_UNAVAILABLE",
            "Scoped Bridge event API is not available in the current environment.",
          );
        }
        await bridge.emitScoped(event, payload, scope);
        return;
      }
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
        throw unwrapBridgeError(err, "Unknown error from custom transport.");
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
