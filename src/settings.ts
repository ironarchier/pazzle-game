import { LANGUAGES, SETTINGS_STORAGE_KEY, type LanguageName, type ThemeName } from './constants';

export interface Settings {
  sound: boolean;
  music: boolean;
  theme: ThemeName;
  language: LanguageName;
}

const browserLanguage = (): LanguageName =>
  typeof navigator === 'undefined' || navigator.language?.toLowerCase().startsWith('ru') ? 'ru' : 'en';

const DEFAULT_SETTINGS: Settings = { sound: true, music: true, theme: 'light', language: browserLanguage() };

let current = loadSettings();
const listeners = new Set<() => void>();

export function subscribeSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    const settings: Settings = raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
    if (!LANGUAGES.some(({ id }) => id === settings.language)) settings.language = DEFAULT_SETTINGS.language;
    return settings;
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
    // Apply settings in memory even when persistent storage is unavailable.
  }
  for (const listener of listeners) listener();
}
