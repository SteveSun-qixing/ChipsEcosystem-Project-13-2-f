import type { LifecycleState } from '../../../src/shared/types';

const allowedTransitions: Record<LifecycleState, LifecycleState[]> = {
  unloaded: ['loading'],
  loading: ['ready', 'stopped', 'error'],
  ready: ['running', 'stopped', 'error'],
  running: ['stopping', 'error'],
  stopping: ['stopped', 'error'],
  stopped: ['loading'],
  error: ['unloaded', 'loading']
};

export class LifecycleManager {
  private readonly stateByComponent = new Map<string, LifecycleState>();

  public getState(component: string): LifecycleState {
    return this.stateByComponent.get(component) ?? 'unloaded';
  }

  public transition(component: string, nextState: LifecycleState): void {
    const currentState = this.getState(component);
    const candidates = allowedTransitions[currentState];

    if (!candidates.includes(nextState)) {
      throw new Error(`Invalid lifecycle transition: ${component} ${currentState} -> ${nextState}`);
    }

    this.stateByComponent.set(component, nextState);
  }

  public snapshot(): Record<string, LifecycleState> {
    return Object.fromEntries(this.stateByComponent.entries());
  }
}
