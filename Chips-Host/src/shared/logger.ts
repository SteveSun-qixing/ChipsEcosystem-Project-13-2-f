import type { LogEntry } from './types';
import { createId, now } from './utils';

export class StructuredLogger {
  private readonly entries: LogEntry[] = [];

  public write(entry: Omit<LogEntry, 'timestamp' | 'traceId'> & { traceId?: string }): LogEntry {
    const normalized: LogEntry = {
      ...entry,
      traceId: entry.traceId ?? createId(),
      timestamp: now()
    };
    this.entries.push(normalized);
    return normalized;
  }

  public query(filter: Partial<Pick<LogEntry, 'level' | 'requestId' | 'pluginId' | 'result' | 'errorCode'>> = {}): LogEntry[] {
    return this.entries.filter((entry) => {
      if (filter.level && entry.level !== filter.level) {
        return false;
      }
      if (filter.requestId && entry.requestId !== filter.requestId) {
        return false;
      }
      if (filter.pluginId && entry.pluginId !== filter.pluginId) {
        return false;
      }
      if (filter.result && entry.result !== filter.result) {
        return false;
      }
      if (filter.errorCode && entry.errorCode !== filter.errorCode) {
        return false;
      }
      return true;
    });
  }

  public export(): string {
    return JSON.stringify(this.entries, null, 2);
  }

  public clear(): void {
    this.entries.length = 0;
  }
}
