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
  librarySubtitle: 'Собирайте персонажей — открывайте финалы',
  libraryCount: 'В коллекции: {count} из {total} картинок',
  albumCollected: 'Собрано: {count} из {total}',
  albumDone: 'Альбом собран! Можно пройти снова.',
  albumFinaleOpen: 'Финал открыт! Соберите последнюю картинку.',
  albumGoal: 'Соберите 5 персонажей, чтобы открыть финал',
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
  hintHelp: 'Первая бесплатно · дальше реклама',
  hintAdTitle: 'Подсказка за рекламу',
  hintAdMessage: 'Посмотрите рекламу — подходящая деталь встанет на место. Монеты не нужны.',
  hintReady: 'Подсказка уже получена. Можно установить подходящую деталь.',
  watchHintAd: 'Реклама · +1 подсказка',
  useHint: 'Использовать подсказку',
  coins: 'монет',
  shop: 'Магазин',
  shopTitle: 'Магазин альбомов',
  shopSubtitle: 'Новые истории · {price} монет за альбом',
  albumUnavailable: 'Коллекция готовится. Покупка пока недоступна.',
  ownedOpen: '✓ Куплено · Открыть',
  soon: 'Скоро',
  buyAlbum: 'Купить альбом · {price} 🪙',
  shopReward: '{count} пазлов · +{coins} монет',
  watchAd: 'Смотреть рекламу · +{coins} 🪙',
  adLoading: 'Реклама…',
  adClosed: 'Просмотр не завершён. Награда не начислена.',
  adUnavailable: 'Реклама сейчас недоступна. Попробуйте позже.',
  insufficientCoins: 'Недостаточно монет',
  openAlbum: 'Открыть альбом',
  buyHint: 'Купить подсказку · {price} 🪙',
  hintTitle: 'Купить подсказку',
  albumShortfall: 'До открытия альбома не хватает {coins} монет',
  hintShortfall: 'Для подсказки не хватает {coins} монет',
  albumAffordable: 'Теперь ты можешь открыть этот альбом!',
  hintAffordable: 'Подсказка установит подходящую деталь. Монеты спишутся только при успешном применении.',
  hintProduct: 'Автоматическая установка детали',
  yourBalance: 'Ваш баланс',
  albumCost: 'Стоимость альбома: {price} монет',
  hintCost: 'Стоимость подсказки: {price} монет',
  close: 'Закрыть',
  albumOpened: 'Альбом открыт!',
  winAlbumDone: 'Альбом собран!',
  winNew: 'Новый персонаж в альбоме!',
  winAgain: 'Снова собрано!',
  winAllDone: 'Финал альбома собран! Впереди другие аниме.',
  winRemaining: 'До финала: ещё {count} из 5 персонажей',
  winFinaleOpen: 'Финал открыт · {pieces}!',
  winDetail: '{album} · {count} из {total}',
  toAlbum: 'В альбом',
  next: 'Дальше',
  toMenu: 'В меню',
  support: 'Написать в поддержку',
  tutorialDrag: 'Перетащи деталь из лотка на картинку. На своём месте она закрепится сама.',
  tutorialTools: 'Кнопки сверху помогут: образец картинки, сначала края и подсказка — первые 3 бесплатно.',
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
  librarySubtitle: 'Collect characters, unlock album finales',
  libraryCount: 'In collection: {count} of {total} pictures',
  albumCollected: 'Collected: {count} of {total}',
  albumDone: 'Album complete! You can play it again.',
  albumFinaleOpen: 'Finale unlocked! Complete the last picture.',
  albumGoal: 'Collect 5 characters to unlock the finale',
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
  hintHelp: 'First free · then watch an ad',
  hintAdTitle: 'Hint for watching an ad',
  hintAdMessage: 'Watch an ad to place an available piece. No coins needed.',
  hintReady: 'Your hint is ready. Place an available piece.',
  watchHintAd: 'Watch ad · +1 hint',
  useHint: 'Use hint',
  coins: 'coins',
  shop: 'Shop',
  shopTitle: 'Album shop',
  shopSubtitle: 'New stories · {price} coins per album',
  albumUnavailable: 'This collection is being prepared. Please check back later.',
  ownedOpen: '✓ Owned · Open',
  soon: 'Coming soon',
  buyAlbum: 'Buy album · {price} 🪙',
  shopReward: '{count} puzzles · +{coins} coins',
  watchAd: 'Watch ad · +{coins} 🪙',
  adLoading: 'Ad loading…',
  adClosed: 'The ad was not completed. No reward was granted.',
  adUnavailable: 'Ads are unavailable right now. Please try again later.',
  insufficientCoins: 'Not enough coins',
  openAlbum: 'Unlock album',
  buyHint: 'Buy hint · {price} 🪙',
  hintTitle: 'Buy a hint',
  albumShortfall: 'You need {coins} more coins to unlock this album',
  hintShortfall: 'You need {coins} more coins for a hint',
  albumAffordable: 'You can now unlock this album!',
  hintAffordable: 'A hint will place an available piece. Coins are charged only when it succeeds.',
  hintProduct: 'Automatically place a piece',
  yourBalance: 'Your balance',
  albumCost: 'Album price: {price} coins',
  hintCost: 'Hint price: {price} coins',
  close: 'Close',
  albumOpened: 'Album unlocked!',
  winAlbumDone: 'Album complete!',
  winNew: 'New character in the album!',
  winAgain: 'Solved again!',
  winAllDone: 'Album finale complete! More anime await.',
  winRemaining: 'Finale: {count} of 5 characters to go',
  winFinaleOpen: 'Finale unlocked · {pieces}!',
  winDetail: '{album} · {count} of {total}',
  toAlbum: 'To album',
  next: 'Next',
  toMenu: 'Menu',
  support: 'Contact support',
  tutorialDrag: 'Drag a piece from the tray onto the picture. It locks in when it reaches its place.',
  tutorialTools: 'The buttons on top help: sample picture, edges first and hints — the first 3 are free.',
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
  return isEnglish() ? album.titleEn ?? album.title : album.title;
}

export function albumSubtitle(album: Album): string {
  return isEnglish() ? album.subtitleEn ?? album.subtitle : album.subtitle;
}

export function levelTitle(level: number): string {
  return isEnglish() ? LEVELS[level].titleEn ?? LEVELS[level].title : LEVELS[level].title;
}

export function syncDocumentLanguage(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = getSettings().language;
  document.title = t('appTitle');
}
