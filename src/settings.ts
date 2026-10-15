import { SETTINGS_STORAGE_KEY, type ThemeName } from './constants';

export interface Settings {
  sound: boolean;
  music: boolean;
  theme: ThemeName;
}

const DEFAULT_SETTINGS: Settings = { sound: true, music: true, theme: 'light' };

let current = loadSettings();

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function getSettings(): Readonly<Settings> {
  return current;
}

export function updateSettings(patch: Partial<Settings>): void {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(current));
  } catch {
    return;
  }
}