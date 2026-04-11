export type HostAccessEventHandler = (data: unknown) => void;

export interface HostAccessTransport {
  invoke<T = unknown>(action: string, payload: unknown): Promise<T>;
  on(event: string, handler: HostAccessEventHandler): () => void;
  once(event: string, handler: HostAccessEventHandler): void;
  emit(event: string, data?: unknown): Promise<void>;
}

export const createHostAccessTransport = (input: {
  invoke<T = unknown>(action: string, payload: unknown): Promise<T>;
  on(event: string, handler: HostAccessEventHandler): () => void;
  once(event: string, handler: HostAccessEventHandler): void;
  emit(event: string, data?: unknown): Promise<void> | void;
}): HostAccessTransport => {
  return {
    invoke: input.invoke,
    on: input.on,
    once: input.once,
    async emit(event, data) {
      await input.emit(event, data);
    }
  };
};
