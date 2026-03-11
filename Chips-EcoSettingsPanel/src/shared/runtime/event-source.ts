import type { Client } from "chips-sdk";

export interface RuntimeEventSource {
  subscribe<T>(eventName: string, handler: (payload: T) => void): () => void;
}

export function createRuntimeEventSource(client: Client): RuntimeEventSource {
  return {
    subscribe(eventName, handler) {
      return client.events.on(eventName, handler);
    },
  };
}
