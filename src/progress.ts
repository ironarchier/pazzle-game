import { LEVELS, SAVE_STORAGE_KEY, getAlbumLevels } from './constants';

export interface SavedGroup { ids: number[]; x: number; y: number }
export interface Assembly {
  level: number; rows: number; cols: number; seed: number;
  placed: number[]; tray: number[]; groups: SavedGroup[]; scroll: number;
}
export interface Progress {
  version: 1; current: number; completed: number[];
  active?: Assembly;
}
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
const validLevel = (v: unknown): v is number => Number.isInteger(v) && Number(v) >= 0 && Number(v) < LEVELS.length;
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
export function isUnlocked(level: number, completed: number[]): boolean {
  if (!validLevel(level)) return false;
  const ids = getAlbumLevels(LEVELS[level].albumId);
  const index = ids.indexOf(level);
  if (LEVELS[level].finale) return ids.slice(0, index).every(id => completed.includes(id));
  return index === 0 || completed.includes(level) || completed.includes(ids[index - 1]);
}
export function nextLevel(completed: number[], after = -1): number | undefined {
  if (validLevel(after)) {
    const album = getAlbumLevels(LEVELS[after].albumId);
    const start = album.indexOf(after);
    for (let offset = 1; offset <= album.length; offset++) {
      const id = album[(start + offset) % album.length];
      if (!completed.includes(id) && isUnlocked(id, completed)) return id;
    }
  }
  for (let offset = 1; offset <= LEVELS.length; offset++) {
    const id = (after + offset) % LEVELS.length;
    if (!completed.includes(id) && isUnlocked(id, completed)) return id;
  }
}

/** Reject assemblies with missing/duplicate pieces or groups that cannot be reproduced. */
export function validateAssembly(value: unknown, completed: number[]): Assembly | undefined {
  if (!record(value) || !validLevel(value.level) || !isUnlocked(value.level, completed)) return;
  const config = LEVELS[value.level];
  const allowedGrid = value.rows === config.rows && value.cols === config.cols;
  if (!allowedGrid || !Number.isInteger(value.seed) || Number(value.seed) < 1 || Number(value.seed) > 0xffffffff) return;
  if (!Array.isArray(value.placed) || !Array.isArray(value.tray) || !Array.isArray(value.groups) || !finite(value.scroll) || value.scroll < 0) return;
  const rows = value.rows as number, cols = value.cols as number, count = rows * cols;
  const seen = new Set<number>();
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
  const empty: Progress = { version: 1, current: 0, completed: [] };
  try {
    const raw = storage?.getItem(SAVE_STORAGE_KEY);
    if (raw) {
      const data: unknown = JSON.parse(raw);
      if (record(data) && data.version === 1) {
        const completed = Array.isArray(data.completed) ? [...new Set(data.completed.filter(validLevel))] : [];
        for (const id of [...completed]) if (!isUnlocked(id, completed)) completed.splice(completed.indexOf(id), 1);
        const active = validateAssembly(data.active, completed);
        const current = validLevel(data.current) && isUnlocked(data.current, completed) ? data.current : nextLevel(completed) ?? 0;
        return { version: 1, current, completed, active };
      }
    }
  } catch { /* Storage can be disabled or malformed. Play in memory. */ }
  return empty;
}
function browserStorage(): StorageLike | undefined {
  if (typeof window === 'undefined') return;
  try { return localStorage; } catch { return; }
}
let progress = readProgress(browserStorage());
export function getProgress(): Progress { return structuredClone(progress); }
function persist(): void {
  try { browserStorage()?.setItem(SAVE_STORAGE_KEY, JSON.stringify(progress)); } catch { /* Keep the in-memory save. */ }
}
export function getCurrentLevel(): number { return progress.active?.level ?? progress.current; }
export function saveAssembly(active: Assembly): void { progress.active = structuredClone(active); progress.current = active.level; persist(); }
export function completeLevel(level: number): boolean {
  if (!isUnlocked(level, progress.completed)) return false;
  const fresh = !progress.completed.includes(level);
  if (fresh) progress.completed.push(level);
  progress.active = undefined;
  progress.current = nextLevel(progress.completed, level) ?? level;
  persist();
  return fresh;
}
