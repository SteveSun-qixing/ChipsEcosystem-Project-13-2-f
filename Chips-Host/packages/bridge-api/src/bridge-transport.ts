import { EventEmitter } from 'node:events';

export interface BridgeInvokeHandler {
  <T>(action: string, payload: unknown): Promise<T>;
}

export type BridgeEventHandler = (data: unknown) => void;

export interface ChipsBridge {
  invoke<T = unknown>(action: string, payload?: unknown): Promise<T>;
  on(event: string, handler: BridgeEventHandler): () => void;
  once(event: string, handler: BridgeEventHandler): void;
  emit(event: string, data?: unknown): void;
}

export class BridgeTransport implements ChipsBridge {
  private readonly emitter = new EventEmitter();

  public constructor(private readonly invokeHandler: BridgeInvokeHandler) {}

  public async invoke<T = unknown>(action: string, payload?: unknown): Promise<T> {
    return this.invokeHandler<T>(action, payload);
  }

  public on(event: string, handler: BridgeEventHandler): () => void {
    this.emitter.on(event, handler);
    return () => {
      this.emitter.off(event, handler);
    };
  }

  public once(event: string, handler: BridgeEventHandler): void {
    this.emitter.once(event, handler);
  }

  public emit(event: string, data?: unknown): void {
    this.emitter.emit(event, data);
  }

  public pushFromHost(event: string, payload: unknown): void {
    this.emitter.emit(event, payload);
  }
}
