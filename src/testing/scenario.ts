import { SAVE_STORAGE_KEY } from '../constants';
import { configureProgressStorage, getProgress, readProgress } from '../progress';

export function seedDevelopmentScenario(): void {
  const parameters = new URLSearchParams(location.search);
  const balance = parameters.get('testBalance');
  const amount = Number(balance ?? 0);
  if (!Number.isSafeInteger(amount) || amount < 0) return;
  const marker = 'pazzle-game:dev-scenario:' + location.search;
  const namespace = ':dev:' + (balance ?? 'default');
  const sandbox = { getItem: (key: string) => localStorage.getItem(key + namespace), setItem: (key: string, value: string) => localStorage.setItem(key + namespace, value) };
  try {
    const real = getProgress();
    const progress = sandbox.getItem(SAVE_STORAGE_KEY) ? readProgress(sandbox) : real;
    if (!sessionStorage.getItem(marker)) progress.economy.balance = amount;
    progress.revision = Math.max(progress.revision, real.revision) + 1;
    sandbox.setItem(SAVE_STORAGE_KEY, JSON.stringify(progress));
    configureProgressStorage(sandbox);
    sessionStorage.setItem(marker, '1');
  } catch { /* Blocked test storage must not prevent the game from starting. */ }
}
