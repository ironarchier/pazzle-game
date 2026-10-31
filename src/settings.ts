import { LANGUAGES, SETTINGS_STORAGE_KEY, type LanguageName, type ThemeName } from './constants';
import { browserStorage } from './platform/persistence';
import type { StorageLike } from './progress';

export interface Settings {
  sound: boolean;
  music: boolean;
  theme: ThemeName;
  language: LanguageName;
  tutorialDone: boolean;
}

const vkLanguage = (): string | null =>
  typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('vk_language');

const browserLanguage = (): LanguageName => {
  const vk = vkLanguage();
  if (vk) return vk.toLowerCase().startsWith('ru') ? 'ru' : 'en';
  return typeof navigator === 'undefined' || navigator.language?.toLowerCase().startsWith('ru') ? 'ru' : 'en';
};

const DEFAULT_SETTINGS: Settings = { sound: true, music: true, theme: 'light', language: browserLanguage(), tutorialDone: false };

let storage: StorageLike | undefined;
let current = loadSettings();
const listeners = new Set<() => void>();

export function subscribeSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function loadSettings(): Settings {
  try {
    const raw = (storage ?? browserStorage())?.getItem(SETTINGS_STORAGE_KEY);
    const settings: Settings = raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
    if (!LANGUAGES.some(({ id }) => id === settings.language)) settings.language = DEFAULT_SETTINGS.language;
    if (settings.theme !== 'light' && settings.theme !== 'dark') settings.theme = DEFAULT_SETTINGS.theme;
    if (typeof settings.sound !== 'boolean') settings.sound = true;
    if (typeof settings.music !== 'boolean') settings.music = true;
    if (typeof settings.tutorialDone !== 'boolean') settings.tutorialDone = false;
    return settings;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function configureSettingsStorage(provider: StorageLike, platformLanguage: string): void {
  storage = provider;
  current = loadSettings();
  const raw = provider.getItem(SETTINGS_STORAGE_KEY);
  let language: unknown;
  try { language = raw ? JSON.parse(raw)?.language : undefined; } catch { /* Use platform language. */ }
  if (!LANGUAGES.some(({ id }) => id === language)) {
    current.language = platformLanguage.toLowerCase().startsWith('ru') ? 'ru' : 'en';
  }
  for (const listener of listeners) listener();
}

export function getSettings(): Readonly<Settings> {
  return current;
}

export function updateSettings(patch: Partial<Settings>): void {
  current = { ...current, ...patch };
  try {
    (storage ?? browserStorage())?.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Apply settings in memory even when persistent storage is unavailable.
  }
  for (const listener of listeners) listener();
}
