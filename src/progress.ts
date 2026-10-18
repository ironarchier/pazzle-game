import { ALBUMS, HINTS_PER_LEVEL, LEVELS, SAVE_STORAGE_KEY, getAlbumLevels } from './constants';
import { ECONOMY } from './economy/config';

export interface SavedGroup { ids: number[]; x: number; y: number }
export interface Assembly {
  level: number; rows: number; cols: number; seed: number;
  placed: number[]; tray: number[]; groups: SavedGroup[]; scroll: number; hints?: number;
}
export interface Wallet {
  balance: number; purchasedAlbums: string[]; rewardedLevels: number[];
  adReceipts: string[]; hintReceipts: string[];
}
export interface Progress {
  version: 1; current: number; completed: number[]; active?: Assembly;
  economy: Wallet; revision: number;
}
export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
export type ProgressEvent = { kind: 'level' | 'ad' | 'purchase' | 'hint' | 'assembly' | 'sync'; delta: number; balance: number };
export type PurchaseResult = { status: 'bought' | 'owned' | 'insufficient' | 'invalid' | 'unavailable'; balance: number };
export type HintResult = 'used' | 'insufficient' | 'duplicate' | 'not-useful';
const validLevel = (v: unknown): v is number => Number.isInteger(v) && Number(v) >= 0 && Number(v) < LEVELS.length;
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const coins = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) >= 0;
const receipt = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 160;
const receipts = (v: unknown): string[] => Array.isArray(v) ? [...new Set(v.filter(receipt))] : [];
const emptyWallet = (): Wallet => ({ balance: 0, purchasedAlbums: [], rewardedLevels: [], adReceipts: [], hintReceipts: [] });

export function ownsAlbum(albumId: string, purchased: readonly string[] = getProgress().economy.purchasedAlbums): boolean {
  const album = ALBUMS.find(item => item.id === albumId);
  return !!album && (!album.paid || purchased.includes(albumId));
}
export function isUnlocked(level: number, completed: number[], purchased: readonly string[] = []): boolean {
  if (!validLevel(level) || !ownsAlbum(LEVELS[level].albumId, purchased)) return false;
  const ids = getAlbumLevels(LEVELS[level].albumId), index = ids.indexOf(level);
  if (LEVELS[level].finale) return ids.slice(0, index).every(id => completed.includes(id));
  return index === 0 || completed.includes(level) || completed.includes(ids[index - 1]);
}
export function nextLevel(completed: number[], after = -1, purchased: readonly string[] = []): number | undefined {
  if (validLevel(after)) {
    const album = getAlbumLevels(LEVELS[after].albumId), start = album.indexOf(after);
    for (let offset = 1; offset <= album.length; offset++) {
      const id = album[(start + offset) % album.length];
      if (!completed.includes(id) && isUnlocked(id, completed, purchased)) return id;
    }
  }
  for (let offset = 1; offset <= LEVELS.length; offset++) {
    const id = (after + offset) % LEVELS.length;
    if (!completed.includes(id) && isUnlocked(id, completed, purchased)) return id;
  }
}
export function validateAssembly(value: unknown, completed: number[], purchased: readonly string[] = []): Assembly | undefined {
  if (!record(value) || !validLevel(value.level) || !isUnlocked(value.level, completed, purchased)) return;
  const config = LEVELS[value.level];
  const allowedGrid = value.rows === config.rows && value.cols === config.cols;
  if (!allowedGrid || !Number.isInteger(value.seed) || Number(value.seed) < 1 || Number(value.seed) > 0xffffffff) return;
  if (value.hints !== undefined && (!Number.isInteger(value.hints) || Number(value.hints) < 0 || Number(value.hints) > HINTS_PER_LEVEL)) return;
  if (!Array.isArray(value.placed) || !Array.isArray(value.tray) || !Array.isArray(value.groups) || !finite(value.scroll) || value.scroll < 0) return;
  const rows = value.rows as number, cols = value.cols as number, count = rows * cols, seen = new Set<number>();
  const take = (ids: unknown[]): ids is number[] => ids.every(id => {
    if (!Number.isInteger(id) || Number(id) < 0 || Number(id) >= count || seen.has(Number(id))) return false;
    seen.add(Number(id)); return true;
  });
  if (!take(value.placed) || !take(value.tray)) return;
  for (const group of value.groups) {
    if (!record(group) || !Array.isArray(group.ids) || !group.ids.length || !take(group.ids) || !finite(group.x) || !finite(group.y) || group.x < -1 || group.x > 2 || group.y < -1 || group.y > 2) return;
    const connected = new Set([group.ids[0]]);
    for (let pass = 0; pass < group.ids.length; pass++) {
      for (const id of group.ids) if ([...connected].some(other => Math.abs(Math.floor(id / cols) - Math.floor(other / cols)) + Math.abs(id % cols - other % cols) === 1)) connected.add(id);
    }
    if (connected.size !== group.ids.length) return;
  }
  if (seen.size !== count || value.placed.length === count) return;
  return structuredClone(value) as unknown as Assembly;
}
export function readProgress(storage: StorageLike | undefined): Progress {
  const empty: Progress = { version: 1, current: 0, completed: [], economy: emptyWallet(), revision: 0 };
  try {
    const raw = storage?.getItem(SAVE_STORAGE_KEY);
    if (!raw) return empty;
    const data: unknown = JSON.parse(raw);
    if (!record(data) || data.version !== 1) return empty;
    const wallet = record(data.economy) ? data.economy : {};
    const purchased = receipts(wallet.purchasedAlbums).filter(id => ALBUMS.some(album => album.id === id && album.paid));
    const completed = Array.isArray(data.completed) ? [...new Set(data.completed.filter(validLevel))] : [];
    for (const id of [...completed]) if (!isUnlocked(id, completed, purchased)) completed.splice(completed.indexOf(id), 1);
    const active = validateAssembly(data.active, completed, purchased);
    const current = validLevel(data.current) && isUnlocked(data.current, completed, purchased) ? data.current : nextLevel(completed, -1, purchased) ?? 0;
    // Old completions are marked settled without retroactive coins.
    const rewarded = Array.isArray(wallet.rewardedLevels) ? wallet.rewardedLevels.filter(validLevel).filter(id => completed.includes(id)) : [];
    const economy: Wallet = {
      balance: coins(wallet.balance) ? wallet.balance : 0, purchasedAlbums: purchased,
      rewardedLevels: [...new Set([...rewarded, ...completed])],
      adReceipts: receipts(wallet.adReceipts), hintReceipts: receipts(wallet.hintReceipts),
    };
    return { version: 1, current, completed, active, economy, revision: coins(data.revision) ? data.revision : 0 };
  } catch { return empty; }
}
function browserStorage(): StorageLike | undefined {
  if (typeof window === 'undefined') return;
  try { return localStorage; } catch { return; }
}

export class ProgressStore {
  private state: Progress;
  private provider: () => StorageLike | undefined;
  private serialized?: string;
  private mutating = false;
  private listeners = new Set<(event: ProgressEvent) => void>();
  constructor(storage: StorageLike | (() => StorageLike | undefined)) {
    this.provider = typeof storage === 'function' ? storage : () => storage;
    this.state = readProgress(this.provider());
  }
  get(): Progress { this.refresh(); return structuredClone(this.state); }
  subscribe(listener: (event: ProgressEvent) => void): () => void {
    this.listeners.add(listener); return () => { this.listeners.delete(listener); };
  }
  setStorage(storage: StorageLike): void {
    const raw = storage.getItem(SAVE_STORAGE_KEY);
    if (raw) {
      try {
        const data: unknown = JSON.parse(raw);
        if (record(data) && data.version === 1) {
          const saved = readProgress(storage);
          if (saved.revision >= this.state.revision) this.state = saved;
        }
      } catch { /* Preserve the valid local state if SDK storage contains invalid data. */ }
    }
    this.provider = () => storage;
    this.persist();
    this.notify('sync', 0);
  }
  private refresh(): void {
    if (this.mutating) return;
    try {
      const storage = this.provider(), raw = storage?.getItem(SAVE_STORAGE_KEY);
      if (!raw || raw === this.serialized) return;
      const candidate = readProgress(storage);
      if (candidate.revision >= this.state.revision) {
        this.state = candidate; this.serialized = raw;
      }
    } catch { /* Continue with the current in-memory state. */ }
  }
  private persist(): void {
    const raw = JSON.stringify(this.state);
    try { this.provider()?.setItem(SAVE_STORAGE_KEY, raw); this.serialized = raw; } catch { /* Keep changes in memory. */ }
  }
  private notify(kind: ProgressEvent['kind'], delta: number): void {
    for (const listener of this.listeners) {
      try { listener({ kind, delta, balance: this.state.economy.balance }); } catch { /* A view must not roll back a committed transaction. */ }
    }
  }
  private transact(kind: ProgressEvent['kind'], change: (draft: Progress) => boolean): boolean {
    if (this.mutating) return false;
    this.refresh();
    const draft = structuredClone(this.state), before = draft.economy.balance;
    this.mutating = true;
    let accepted = false;
    try { accepted = change(draft); } finally { this.mutating = false; }
    if (!accepted) return false;
    draft.revision++;
    this.state = draft; this.persist(); this.notify(kind, draft.economy.balance - before);
    return true;
  }
  save(active: Assembly): void {
    this.transact('assembly', draft => { draft.active = structuredClone(active); draft.current = active.level; return true; });
  }
  complete(level: number): boolean {
    let fresh = false;
    const accepted = this.transact('level', draft => {
      if (!isUnlocked(level, draft.completed, draft.economy.purchasedAlbums)) return false;
      fresh = !draft.completed.includes(level);
      if (fresh) {
        draft.completed.push(level);
        if (!draft.economy.rewardedLevels.includes(level)) {
          const slot = getAlbumLevels(LEVELS[level].albumId).indexOf(level);
          const amount = ECONOMY.firstCompletionRewards[slot] ?? 0;
          if (!Number.isSafeInteger(draft.economy.balance + amount)) return false;
          draft.economy.balance += amount; draft.economy.rewardedLevels.push(level);
        }
      }
      draft.active = undefined;
      draft.current = nextLevel(draft.completed, level, draft.economy.purchasedAlbums) ?? level;
      return true;
    });
    return accepted && fresh;
  }
  rewardAd(id: string): boolean {
    if (!receipt(id)) return false;
    return this.transact('ad', draft => {
      if (draft.economy.adReceipts.includes(id) || !Number.isSafeInteger(draft.economy.balance + ECONOMY.rewardedVideoCoins)) return false;
      draft.economy.balance += ECONOMY.rewardedVideoCoins; draft.economy.adReceipts.push(id); return true;
    });
  }
  buyAlbum(id: string): PurchaseResult {
    const album = ALBUMS.find(item => item.id === id);
    let status: PurchaseResult['status'] = 'invalid';
    this.transact('purchase', draft => {
      if (!album?.paid) return false;
      if (draft.economy.purchasedAlbums.includes(id)) { status = 'owned'; return false; }
      if (album.ready === false) { status = 'unavailable'; return false; }
      if (draft.economy.balance < ECONOMY.albumPrice) { status = 'insufficient'; return false; }
      draft.economy.balance -= ECONOMY.albumPrice; draft.economy.purchasedAlbums.push(id); status = 'bought'; return true;
    });
    return { status, balance: this.state.economy.balance };
  }
  useHint(id: string, apply: () => boolean): HintResult {
    let result: HintResult = 'not-useful';
    this.transact('hint', draft => {
      if (!receipt(id) || draft.economy.hintReceipts.includes(id)) { result = 'duplicate'; return false; }
      if (draft.economy.balance < ECONOMY.hintPrice) { result = 'insufficient'; return false; }
      try { if (!apply()) return false; } catch { return false; }
      draft.economy.balance -= ECONOMY.hintPrice; draft.economy.hintReceipts.push(id); result = 'used'; return true;
    });
    return result;
  }
}
const store = new ProgressStore(browserStorage);
export function getProgress(): Progress { return store.get(); }
export function subscribeProgress(listener: (event: ProgressEvent) => void): () => void { return store.subscribe(listener); }
export function configureProgressStorage(storage: StorageLike): void { store.setStorage(storage); }
export function getCurrentLevel(): number { const value = store.get(); return value.active?.level ?? value.current; }
export function saveAssembly(active: Assembly): void { store.save(active); }
export function completeLevel(level: number): boolean { return store.complete(level); }
export function rewardAd(id: string): boolean { return store.rewardAd(id); }
export function buyAlbum(id: string): PurchaseResult { return store.buyAlbum(id); }
export function useHint(id: string, apply: () => boolean): HintResult { return store.useHint(id, apply); }
