import type { StorageLike } from '../progress';

// Playgama must hydrate Bridge Storage before the first playable scene.
// Yandex keeps the existing browser/SDK storage path.
export const usesPlaygama = import.meta.env?.VITE_PLATFORM === 'playgama';

export function browserStorage(): StorageLike | undefined {
  if (usesPlaygama) return;
  try { return globalThis.localStorage; } catch { return; }
}
