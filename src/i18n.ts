import { LEVELS, type Album } from './constants';
import { getSettings } from './settings';

const ru = {
  appTitle: 'Аниме-пазлы',
  tabHome: 'Главная',
  tabSettings: 'Настройки',
  play: 'Играть',
  continue: 'Продолжить',
  albums: 'Альбомы',
  menuCollected: 'Собрано {count} из {total}',
  settingsTitle: 'Настройки',
  sound: 'Звук',
  music: 'Музыка',
  darkTheme: 'Тёмная тема',
  language: 'Язык',
  menu: 'Меню',
  libraryTitle: 'Аниме-альбомы',
  librarySubtitle: 'Собирайте персонажей — открывайте суперпазлы',
  libraryCount: 'В коллекции: {count} из {total} картинок',
  albumCollected: 'Собрано: {count} из {total}',
  albumDone: 'Альбом собран! Можно пройти снова.',
  albumFinaleOpen: 'Суперпазл открыт! Соберите финальную картинку.',
  albumGoal: 'Соберите 5 персонажей, чтобы открыть суперпазл',
  superPuzzle: '★ Суперпазл',
  continueAssembly: 'Продолжить сборку',
  doneAgain: '✓ Собрано · собрать снова',
  lockedFinale: '{count} из 5 до открытия',
  dialogTitle: 'Начать другую картинку?',
  dialogText: 'Текущая незавершённая сборка будет заменена.\nСобранные картинки останутся в альбомах.',
  start: 'Начать',
  back: 'Назад',
  album: 'Альбом',
  sample: 'Образец',
  edgesFirst: 'Сначала края',
  hint: 'Подсказка',
  winAlbumDone: 'Альбом собран!',
  winNew: 'Новый персонаж в альбоме!',
  winAgain: 'Снова собрано!',
  winAllDone: 'Суперпазл собран! Впереди другие аниме.',
  winRemaining: 'До суперпазла: ещё {count} из 5 персонажей',
  winFinaleOpen: 'Суперпазл открыт · {pieces}!',
  winDetail: '{album} · {count} из {total}',
  toAlbum: 'В альбом',
  next: 'Дальше',
  toMenu: 'В меню',
};

type Key = keyof typeof ru;

const en: Record<Key, string> = {
  appTitle: 'Anime Puzzles',
  tabHome: 'Home',
  tabSettings: 'Settings',
  play: 'Play',
  continue: 'Continue',
  albums: 'Albums',
  menuCollected: 'Collected {count} of {total}',
  settingsTitle: 'Settings',
  sound: 'Sound',
  music: 'Music',
  darkTheme: 'Dark theme',
  language: 'Language',
  menu: 'Menu',
  libraryTitle: 'Anime albums',
  librarySubtitle: 'Collect characters, unlock super puzzles',
  libraryCount: 'In collection: {count} of {total} pictures',
  albumCollected: 'Collected: {count} of {total}',
  albumDone: 'Album complete! You can play it again.',
  albumFinaleOpen: 'Super puzzle unlocked! Complete the final picture.',
  albumGoal: 'Collect 5 characters to unlock the super puzzle',
  superPuzzle: '★ Super puzzle',
  continueAssembly: 'Continue puzzle',
  doneAgain: '✓ Done · play again',
  lockedFinale: '{count} of 5 to unlock',
  dialogTitle: 'Start another picture?',
  dialogText: 'Your unfinished puzzle will be replaced.\nCompleted pictures stay in your albums.',
  start: 'Start',
  back: 'Back',
  album: 'Album',
  sample: 'Preview',
  edgesFirst: 'Edges first',
  hint: 'Hint',
  winAlbumDone: 'Album complete!',
  winNew: 'New character in the album!',
  winAgain: 'Solved again!',
  winAllDone: 'Super puzzle complete! More anime await.',
  winRemaining: 'Super puzzle: {count} of 5 characters to go',
  winFinaleOpen: 'Super puzzle unlocked · {pieces}!',
  winDetail: '{album} · {count} of {total}',
  toAlbum: 'To album',
  next: 'Next',
  toMenu: 'Menu',
};

const PIECES = {
  ru: { one: 'деталь', few: 'детали', many: 'деталей', other: 'детали' },
  en: { one: 'piece', other: 'pieces' },
} as const;

const isEnglish = () => getSettings().language === 'en';

export function t(key: Key, params: Record<string, string | number> = {}): string {
  return (isEnglish() ? en : ru)[key].replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ''));
}

export function pieces(count: number): string {
  const language = getSettings().language;
  const forms: Partial<Record<Intl.LDMLPluralRule, string>> = PIECES[language];
  return `${count} ${forms[new Intl.PluralRules(language).select(count)] ?? forms.other}`;
}

export function albumTitle(album: Album): string {
  return isEnglish() ? album.titleEn : album.title;
}

export function albumSubtitle(album: Album): string {
  return isEnglish() ? album.subtitleEn : album.subtitle;
}

export function levelTitle(level: number): string {
  return isEnglish() ? LEVELS[level].titleEn : LEVELS[level].title;
}

export function syncDocumentLanguage(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = getSettings().language;
  document.title = t('appTitle');
}
