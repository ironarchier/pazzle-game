import { LEVELS, PROGRESS_STORAGE_KEY } from './constants';

export function getCurrentLevel(): number {
  try {
    const level = Number(localStorage.getItem(PROGRESS_STORAGE_KEY));
    return Number.isInteger(level) && level >= 0 && level < LEVELS.length ? level : 0;
  } catch {
    return 0;
  }
}

export function setCurrentLevel(level: number): void {
  try {
    localStorage.setItem(PROGRESS_STORAGE_KEY, String(level));
  } catch {
    return;
  }
}
