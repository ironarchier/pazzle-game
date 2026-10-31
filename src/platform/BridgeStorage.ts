import type { PlaygamaBridge } from '@playgama/bridge';
import type { StorageLike } from '../progress';
import { withTimeout } from './withTimeout';

/** Synchronous game state over Bridge's asynchronous storage, with ordered writes. */
export class BridgeStorage implements StorageLike {
  private values = new Map<string, string>();
  private pending = new Map<string, string>();
  private writing?: Promise<void>;
  private retry?: ReturnType<typeof setTimeout>;
  private disposed = false;
  private api: PlaygamaBridge['storage'];
  private report: (error: unknown) => void;
  constructor(api: PlaygamaBridge['storage'], report: (error: unknown) => void = console.warn) { this.api = api; this.report = report; }

  async load(keys: string[]): Promise<void> {
    const data = await withTimeout(this.api.get(keys, false), 15000);
    if (!Array.isArray(data) || data.length !== keys.length) throw new Error('Invalid Bridge Storage response');
    data.forEach((value: unknown, index: number) => {
      if (value === null || value === undefined) return;
      if (typeof value !== 'string') throw new Error('Invalid saved data');
      this.values.set(keys[index], value);
    });
  }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void {
    if (this.disposed) return;
    this.values.set(key, value);
    this.pending.set(key, value);
    this.schedule();
  }
  private schedule(): void {
    void this.flush().catch(error => {
      this.report(error);
      if (!this.retry && !this.disposed) this.retry = setTimeout(() => {
        this.retry = undefined;
        this.schedule();
      }, 2000);
    });
  }
  flush(): Promise<void> {
    if (this.writing) return this.writing;
    if (this.disposed || !this.pending.size) return Promise.resolve();
    this.writing = (async () => {
      while (this.pending.size && !this.disposed) {
        const batch = [...this.pending];
        // Do not race writes with a timeout: an uncancelled older request could
        // otherwise finish after a retry and overwrite a newer balance.
        await this.api.set(batch.map(([key]) => key), batch.map(([, value]) => value));
        for (const [key, value] of batch) if (this.pending.get(key) === value) this.pending.delete(key);
      }
    })().finally(() => { this.writing = undefined; });
    return this.writing;
  }
  dispose(): void { this.disposed = true; clearTimeout(this.retry); }
}
