import { VK_STORAGE_CHUNK_SIZE, VK_STORAGE_FLUSH_DELAY_MS, VK_STORAGE_MAX_CHUNKS } from '../constants';
import type { StorageLike } from '../progress';

export interface KeyValueApi {
  get: (keys: string[]) => Promise<Record<string, string>>;
  set: (key: string, value: string) => Promise<void>;
}
export interface FlushableStorage extends StorageLike { flush: () => Promise<void> }
interface Remote { chunks: string[]; count: number }

const safeKey = (key: string) => key.replace(/[^a-zA-Z0-9_-]/g, '_');
const chunkKey = (key: string, index: number) => `${safeKey(key)}_${index}`;
const chunkCount = (value: string | undefined) => {
  const count = Number(value);
  return Number.isInteger(count) && count > 0 && count <= VK_STORAGE_MAX_CHUNKS ? count : 0;
};
// VK limits each value in bytes, so non-ASCII text gets chunks small enough for 4-byte characters.
function split(value: string): string[] {
  const size = /^[\x00-\x7f]*$/.test(value) ? VK_STORAGE_CHUNK_SIZE : VK_STORAGE_CHUNK_SIZE / 4;
  const chunks: string[] = [];
  for (let index = 0; index < value.length; index += size) chunks.push(value.slice(index, index + size));
  return chunks;
}

// Values are split into chunks under `<key>_<n>`, while `<key>` stores how many chunks are valid.
export async function createVkStorage(api: KeyValueApi, keys: string[], delay = VK_STORAGE_FLUSH_DELAY_MS): Promise<FlushableStorage> {
  const counts = await api.get(keys.map(safeKey));
  const names = keys.flatMap(key => Array.from({ length: chunkCount(counts[safeKey(key)]) }, (_, index) => chunkKey(key, index)));
  const parts = names.length ? await api.get(names) : {};
  const cache = new Map<string, string>();
  const remote = new Map<string, Remote>();
  for (const key of keys) {
    const count = chunkCount(counts[safeKey(key)]);
    const chunks = Array.from({ length: count }, (_, index) => parts[chunkKey(key, index)] ?? '');
    remote.set(key, { chunks, count });
    if (count) cache.set(key, chunks.join(''));
  }

  const dirty = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let writing = Promise.resolve();

  async function write(key: string): Promise<void> {
    const next = split(cache.get(key) ?? '');
    let state = remote.get(key);
    if (!state) remote.set(key, state = { chunks: [], count: 0 });
    for (let index = 0; index < next.length; index++) {
      if (state.chunks[index] === next[index]) continue;
      await api.set(chunkKey(key, index), next[index]);
      state.chunks[index] = next[index];
    }
    if (state.count !== next.length) {
      await api.set(safeKey(key), String(next.length));
      state.count = next.length;
    }
  }
  function flush(): Promise<void> {
    clearTimeout(timer); timer = undefined;
    const pending = [...dirty]; dirty.clear();
    writing = writing.then(async () => {
      for (const key of pending) {
        try { await write(key); } catch { dirty.add(key); }
      }
    });
    return writing;
  }

  return {
    getItem: key => cache.get(key) ?? null,
    setItem(key, value) {
      if (cache.get(key) === value) return;
      cache.set(key, value); dirty.add(key);
      timer ??= setTimeout(flush, delay);
    },
    flush,
  };
}
