import type { StorageLike } from '../progress';

// Playgama and Pikabu hydrate their cloud storage before the first playable scene
// and report readiness after the preloader. Yandex/VK keep the browser/SDK storage path.
export const usesHostSdk = ['playgama', 'pikabu'].includes(import.meta.env?.VITE_PLATFORM ?? '');

export function browserStorage(): StorageLike | undefined {
  if (usesHostSdk) return;
  try { return globalThis.localStorage; } catch { return; }
}
