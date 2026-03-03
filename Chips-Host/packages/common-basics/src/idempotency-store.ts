export class IdempotencyStore {
  private readonly store = new Map<string, number>();

  public remember(requestId: string, ttlMs: number): void {
    const expiresAt = Date.now() + ttlMs;
    this.store.set(requestId, expiresAt);
    this.gc();
  }

  public has(requestId: string): boolean {
    this.gc();
    const expiresAt = this.store.get(requestId);
    if (!expiresAt) {
      return false;
    }
    return expiresAt > Date.now();
  }

  private gc(): void {
    const now = Date.now();
    for (const [requestId, expiresAt] of this.store.entries()) {
      if (expiresAt <= now) {
        this.store.delete(requestId);
      }
    }
  }
}
