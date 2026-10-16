export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 1280;
export const PRELOADER_MIN_DURATION = 1500;

export const FONT_FAMILY = 'Arial';

export type ThemeName = 'light' | 'dark';

export interface Theme {
  background: number;
  surface: number;
  border: number;
  track: number;
  board: number;
  text: number;
  textMuted: number;
  accent: number;
  accentHover: number;
  accentSoft: number;
  accentText: number;
  hoverSurface: number;
}

export const THEMES: Record<ThemeName, Theme> = {
  light: {
    background: 0xeef1f6,
    surface: 0xffffff,
    border: 0xdfe4ec,
    track: 0xcfd6e1,
    board: 0xdde3ec,
    text: 0x1f2937,
    textMuted: 0x8a94a6,
    accent: 0x3d9be9,
    accentHover: 0x5cadf0,
    accentSoft: 0x7db9ec,
    accentText: 0xffffff,
    hoverSurface: 0xeaf3fc,
  },
  dark: {
    background: 0x1b1f27,
    surface: 0x262b35,
    border: 0x343a46,
    track: 0x3e4552,
    board: 0x14171d,
    text: 0xf1f3f7,
    textMuted: 0x8b93a3,
    accent: 0x4fa8f0,
    accentHover: 0x72bcf5,
    accentSoft: 0x6fa6d6,
    accentText: 0xffffff,
    hoverSurface: 0x2f3644,
  },
};

export const ICON_KEY = 'icon';
export const SETTINGS_STORAGE_KEY = 'pazzle-game:settings';

export const TAB_BAR_HEIGHT = 140;
export const TAB_MAX_WIDTH = 360;
export const BUTTON_WIDTH = 360;
export const BUTTON_HEIGHT = 110;
export const TOGGLE_WIDTH = 560;
export const TOGGLE_HEIGHT = 100;
export const TOGGLE_TRACK_WIDTH = 100;
export const TOGGLE_TRACK_HEIGHT = 56;
export const TOGGLE_HOVER_PADDING = 24;

export const BACK_LINK_FONT_SIZE = 32;
export const BACK_LINK_CHEVRON_SIZE = 11;
export const BACK_LINK_CHEVRON_WIDTH = 4;
export const BACK_LINK_GAP = 12;
export const BACK_LINK_HEIGHT = 64;

export const HOVER_DURATION = 200;
export const HOVER_EASE = 'Cubic.easeOut';
export const TRANSITION_DURATION = 450;
export const PAGE_TRANSITION_DURATION = 250;
export const PAGE_SLIDE_OFFSET = 24;
export const TAB_HOVER_INSET = 12;
export const BUTTON_HOVER_SCALE = 1.04;
export const BUTTON_PRESS_SCALE = 0.95;
export const PIECE_HOVER_SCALE = 1.03;
export const PIECE_DRAG_SCALE = 1.05;

export const SOUNDS = {
  click: 'click',
  place: ['place-1', 'place-2', 'place-3', 'place-4', 'place-5'],
  join: ['join-1', 'join-2', 'join-3', 'join-4'],
};
export const SOUND_DETUNE = 60;

export interface Album {
  id: string;
  title: string;
  subtitle: string;
  accent: number;
  characters: { title: string; image: string }[];
}

// Order is part of the saved catalogue: append albums; do not reorder existing entries.
export const ALBUMS: Album[] = [
  { id: 'tokyo-ghoul', title: 'Токийский гуль', subtitle: 'За маской человека', accent: 0xc74062, characters: [
    { title: 'Тоука Киришима', image: 'images/anime/tg-touka.jpg' },
    { title: 'Ризэ Камисиро', image: 'images/anime/tg-rize.jpg' },
    { title: 'Хидэёси Нагачика', image: 'images/anime/tg-hide.jpg' },
    { title: 'Сю Цукияма', image: 'images/anime/tg-tsukiyama.jpg' },
    { title: 'Дзюдзо Судзуя', image: 'images/anime/tg-juuzou.jpg' },
    { title: 'Канеки · Пробуждение', image: 'images/level-1.jpg' },
  ] },
  { id: 'attack-on-titan', title: 'Атака титанов', subtitle: 'По ту сторону стен', accent: 0x59947a, characters: [
    { title: 'Эрен Йегер', image: 'images/anime/aot-eren.jpg' },
    { title: 'Микаса Аккерман', image: 'images/anime/aot-mikasa.jpg' },
    { title: 'Армин Арлерт', image: 'images/anime/aot-armin.jpg' },
    { title: 'Леви Аккерман', image: 'images/anime/aot-levi.jpg' },
    { title: 'Ханджи Зоэ', image: 'images/anime/aot-hange.jpg' },
    { title: 'Крылья свободы', image: 'images/anime/aot-finale.jpg' },
  ] },
  { id: 'death-note', title: 'Тетрадь смерти', subtitle: 'Игра двух умов', accent: 0x9c7ed0, characters: [
    { title: 'Лайт Ягами', image: 'images/anime/dn-light.jpg' },
    { title: 'L', image: 'images/anime/dn-l.jpg' },
    { title: 'Миса Аманэ', image: 'images/anime/dn-misa.jpg' },
    { title: 'Рюк', image: 'images/anime/dn-ryuk.jpg' },
    { title: 'Ниа', image: 'images/anime/dn-near.jpg' },
    { title: 'Лайт и L · Противостояние', image: 'images/anime/dn-finale.jpg' },
  ] },
  { id: 'naruto', title: 'Наруто', subtitle: 'Свой путь ниндзя', accent: 0xe49a3c, characters: [
    { title: 'Саске Учиха', image: 'images/anime/n-sasuke.jpg' },
    { title: 'Сакура Харуно', image: 'images/anime/n-sakura.jpg' },
    { title: 'Какаши Хатаке', image: 'images/anime/n-kakashi.jpg' },
    { title: 'Итачи Учиха', image: 'images/anime/n-itachi.jpg' },
    { title: 'Хината Хюга', image: 'images/anime/n-hinata.jpg' },
    { title: 'Наруто · Мечта Хокаге', image: 'images/anime/n-finale.jpg' },
  ] },
  { id: 'demon-slayer', title: 'Клинок, рассекающий демонов', subtitle: 'Свет среди тьмы', accent: 0x40a6a2, characters: [
    { title: 'Тандзиро Камадо', image: 'images/anime/ds-tanjiro.jpg' },
    { title: 'Нэдзуко Камадо', image: 'images/anime/ds-nezuko.jpg' },
    { title: 'Дзэницу Агацума', image: 'images/anime/ds-zenitsu.jpg' },
    { title: 'Иноскэ Хасибира', image: 'images/anime/ds-inosuke.jpg' },
    { title: 'Гию Томиока', image: 'images/anime/ds-giyu.jpg' },
    { title: 'Тандзиро · Танец огня', image: 'images/anime/ds-finale.jpg' },
  ] },
];
export const LEVELS = ALBUMS.flatMap(album => album.characters.map((character, slot) => ({
  ...character, albumId: album.id, finale: slot === album.characters.length - 1,
  rows: slot === album.characters.length - 1 ? 5 : 4,
  cols: slot === album.characters.length - 1 ? 5 : 4,
})));
export function getAlbumLevels(albumId: string): number[] {
  return LEVELS.flatMap((level, id) => level.albumId === albumId ? [id] : []);
}
export function getLevelAlbum(level: number): Album {
  return ALBUMS.find(album => album.id === LEVELS[level]?.albumId) ?? ALBUMS[0];
}
export const PROGRESS_STORAGE_KEY = 'pazzle-game:level';
// Keep the old journey catalogue untouched: its numeric IDs refer to different pictures.
export const SAVE_STORAGE_KEY = 'pazzle-game:anime:save:v1';
export const PUZZLE_SOURCE_KEY = 'puzzle-source';
export const PIECES_KEY = 'puzzle-pieces';
export const PIECE_SIZE = 250;
export const BOARD_PADDING = 20;
export const KNOB_SIZE = 0.25;
export const KNOB_VARIATION = {
  shift: 0.06,
  width: 0.1,
  height: 0.12,
  wave: 0.15,
};
export const PIECE_BEVEL = {
  width: 3,
  offset: 1.5,
  light: 'rgba(255, 255, 255, 0.35)',
  dark: 'rgba(0, 0, 0, 0.3)',
  outline: 'rgba(0, 0, 0, 0.18)',
};
export const PIECE_SHADOW = {
  color: 'rgba(0, 0, 0, 0.35)',
  blur: 10,
  offsetY: 4,
};
export const PIECE_HIT_ALPHA = 200;
export const PIECE_MARGIN = Math.ceil(PIECE_SIZE * KNOB_SIZE * (1 + KNOB_VARIATION.height)) + PIECE_SHADOW.blur + PIECE_SHADOW.offsetY;
export const PIECE_FRAME_SIZE = PIECE_SIZE + PIECE_MARGIN * 2;
export const SNAP_DISTANCE = 40;
export const SNAP_DURATION = 120;
export const SNAP_VIBRATION = 30;

export const SPARKLE_KEY = 'sparkle';
export const SPARKLE_TEXTURE_SIZE = 32;
export const SPARKLE = {
  count: 14,
  lifespan: { min: 450, max: 800 },
  speed: { min: 20, max: 90 },
  scale: { start: 0.9, end: 0 },
  tints: [0xffffff, 0xfff4c2, 0xffd966],
};

export const HEADER_HEIGHT = 176;
export const HEADER_PADDING = 28;

export const TRAY_HEIGHT = 220;
export const TRAY_PADDING = 24;
export const TRAY_SLOT_WIDTH = 140;
export const TRAY_PIECE_SIZE = 85;
export const TRAY_PIECE_SCALE = TRAY_PIECE_SIZE / PIECE_SIZE;
export const TRAY_ANIMATION_DURATION = 250;
export const GESTURE_THRESHOLD = 12;

export const GAME_DEPTH = {
  board: 0,
  placedPieces: 1,
  boardPieces: 2,
  sparkles: 3,
  tray: 4,
  trayPieces: 5,
  draggedPiece: 6,
  header: 7,
  overlay: 8,
};
