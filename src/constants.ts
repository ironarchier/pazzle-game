export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 1280;
export const PRELOADER_MIN_DURATION = 1500;

export const FONT_FAMILY = 'Nunito, Arial, sans-serif';
export const FONT_NAME = 'Nunito';
export const FONT_SAMPLE = 'Аниме-пазлы Aa';

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
  secondary: number;
}

export const THEMES: Record<ThemeName, Theme> = {
  light: {
    background: 0xfff4f7,
    surface: 0xffffff,
    border: 0xf3dce5,
    track: 0xefd6e1,
    board: 0xf8e6ee,
    text: 0x2a1e2e,
    textMuted: 0x9a8295,
    accent: 0xff4f87,
    accentHover: 0xff6e9c,
    accentSoft: 0xff9dbc,
    accentText: 0xffffff,
    hoverSurface: 0xffeaf1,
    secondary: 0x8b5cf6,
  },
  dark: {
    background: 0x17121f,
    surface: 0x231b2e,
    border: 0x33283f,
    track: 0x3d3049,
    board: 0x120e18,
    text: 0xf5eef6,
    textMuted: 0x9c8ea6,
    accent: 0xff6b9a,
    accentHover: 0xff8ab0,
    accentSoft: 0xd0759a,
    accentText: 0xffffff,
    hoverSurface: 0x2e2439,
    secondary: 0xa78bfa,
  },
};

export const SETTINGS_STORAGE_KEY = 'pazzle-game:settings';

export const TAB_BAR_HEIGHT = 152;
export const TAB_MAX_WIDTH = 300;
export const TAB_BAR_MARGIN = 24;
export const TAB_BAR_MAX_WIDTH = 560;
export const TAB_ICON_SCALE = 0.7;
export const TAB_ICON_Y = 46;
export const TAB_LABEL_Y = 92;
export const TAB_LABEL_SIZE = 24;
export const TAB_HOVER_ALPHA = 0.5;
export const BUTTON_WIDTH = 360;
export const BUTTON_HEIGHT = 110;
export const BUTTON_BORDER_WIDTH = 4;
export const BUTTON_HOVER_GLOW = 0.15;
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
export const BACK_LINK_PADDING = 22;

export const GAME_ICONS = {
  back: 'icon-back',
  image: 'icon-image',
  bulb: 'icon-bulb',
  lock: 'icon-lock',
  puzzle: 'icon-puzzle',
};
export const GAME_ICON_SIZE = 56;
export const ALBUM_ROW_WIDTH = 650;
export const ALBUM_ROW_HEIGHT = 164;
export const ALBUM_COVER_SIZE = 130;
export const ALBUM_COVER_RADIUS = 20;
export const ALBUM_PROGRESS_WIDTH = 300;
export const PROGRESS_BAR_HEIGHT = 12;
export const MENU_CARD_WIDTH = 560;
export const MENU_CARD_HEIGHT = 470;
export const MENU_CARD_IMAGE_HEIGHT = 300;
export const MENU_CARD_PADDING = 32;
export const MENU_CARD_COUNT_WIDTH = 80;
export const SETTINGS_CARD_WIDTH = 640;
export const SETTINGS_CARD_HEIGHT = 400;
export const LEVEL_CARD_WIDTH = 308;
export const LEVEL_CARD_HEIGHT = 270;
export const LEVEL_CARD_IMAGE_HEIGHT = 170;
export const CARD_RADIUS = 28;
export const CARD_SHADOW_OFFSET = 6;
export const CARD_SHADOW_ALPHA = 0.12;
export const CARD_HOVER_SCALE = 1.03;
export const LOCK_BADGE_RADIUS = 40;
export const LOCK_ICON_SIZE = 44;
export const DIALOG_WIDTH = 650;
export const DIALOG_HEIGHT = 360;
export const DIALOG_BUTTON_SCALE = 0.78;
export const DIALOG_BUTTON_OFFSET = 150;
export const ALBUM_PIECES_ICON_SIZE = 26;
export const ALBUM_PIECES_ICON_GAP = 8;
export const BLUR_SAMPLE_SIZE = 10;
export const GAME_PANEL_RADIUS = 32;
export const BOARD_FRAME = 12;
export const BOARD_FRAME_RADIUS = 24;
export const COUNTER_CHIP_HEIGHT = 56;
export const COUNTER_CHIP_PADDING = 20;
export const COUNTER_ICON_SIZE = 28;
export const COUNTER_ICON_GAP = 10;
export const ICON_BUTTON_BG_RADIUS = 40;
export const ICON_BUTTON_ICON_SIZE = 40;
export const BACK_BUTTON_RADIUS = 30;
export const ICON_BUTTON_SIZE = 88;
export const ICON_BUTTON_SPACING = 120;
export const TOOLTIP_FONT_SIZE = 24;
export const TOOLTIP_PADDING_X = 16;
export const TOOLTIP_PADDING_Y = 10;
export const TOOLTIP_RADIUS = 10;
export const TOOLTIP_OFFSET = 12;

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

export const SOUND_VOLUME = 0.5;
export const SOUND_REVERB = { seconds: 1.6, decay: 3, wet: 0.18 };
export const SOUND_SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760];
export const SOUND_WIN_CHORD = [523.25, 659.25, 783.99, 1046.5, 1318.51];
export const SOUND_WIN_STEP = 0.09;

export const MUSIC = {
  key: 'background-music',
  path: 'music/quiet-pages.mp3',
  volume: 0.22,
};

export interface Album {
  id: string;
  title: string;
  subtitle: string;
  accent: number;
  characters: { title: string; image: string }[];
}

// Order is part of the saved catalogue: append albums; do not reorder existing entries.
export const ALBUMS: Album[] = [
  { id: 'tokyo-ghoul', title: 'Токийский гуль', subtitle: 'За маской человека', accent: 0xe5395b, characters: [
    { title: 'Тоука Киришима', image: 'images/anime/tg-touka.jpg' },
    { title: 'Ризэ Камисиро', image: 'images/anime/tg-rize.jpg' },
    { title: 'Хидэёси Нагачика', image: 'images/anime/tg-hide.jpg' },
    { title: 'Сю Цукияма', image: 'images/anime/tg-tsukiyama.jpg' },
    { title: 'Дзюдзо Судзуя', image: 'images/anime/tg-juuzou.jpg' },
    { title: 'Канеки · Пробуждение', image: 'images/level-1.jpg' },
  ] },
  { id: 'attack-on-titan', title: 'Атака титанов', subtitle: 'По ту сторону стен', accent: 0x22a06b, characters: [
    { title: 'Эрен Йегер', image: 'images/anime/aot-eren.jpg' },
    { title: 'Микаса Аккерман', image: 'images/anime/aot-mikasa.jpg' },
    { title: 'Армин Арлерт', image: 'images/anime/aot-armin.jpg' },
    { title: 'Леви Аккерман', image: 'images/anime/aot-levi.jpg' },
    { title: 'Ханджи Зоэ', image: 'images/anime/aot-hange.jpg' },
    { title: 'Крылья свободы', image: 'images/anime/aot-finale.jpg' },
  ] },
  { id: 'death-note', title: 'Тетрадь смерти', subtitle: 'Игра двух умов', accent: 0x6c63ff, characters: [
    { title: 'Лайт Ягами', image: 'images/anime/dn-light.jpg' },
    { title: 'L', image: 'images/anime/dn-l.jpg' },
    { title: 'Миса Аманэ', image: 'images/anime/dn-misa.jpg' },
    { title: 'Рюк', image: 'images/anime/dn-ryuk.jpg' },
    { title: 'Ниа', image: 'images/anime/dn-near.jpg' },
    { title: 'Лайт и L · Противостояние', image: 'images/anime/dn-finale.jpg' },
  ] },
  { id: 'naruto', title: 'Наруто', subtitle: 'Свой путь ниндзя', accent: 0xff8a3d, characters: [
    { title: 'Саске Учиха', image: 'images/anime/n-sasuke.jpg' },
    { title: 'Сакура Харуно', image: 'images/anime/n-sakura.jpg' },
    { title: 'Какаши Хатаке', image: 'images/anime/n-kakashi.jpg' },
    { title: 'Итачи Учиха', image: 'images/anime/n-itachi.jpg' },
    { title: 'Хината Хюга', image: 'images/anime/n-hinata.jpg' },
    { title: 'Наруто · Мечта Хокаге', image: 'images/anime/n-finale.jpg' },
  ] },
  { id: 'demon-slayer', title: 'Клинок, рассекающий демонов', subtitle: 'Свет среди тьмы', accent: 0x0ea5a4, characters: [
    { title: 'Тандзиро Камадо', image: 'images/anime/ds-tanjiro.jpg' },
    { title: 'Нэдзуко Камадо', image: 'images/anime/ds-nezuko.jpg' },
    { title: 'Дзэницу Агацума', image: 'images/anime/ds-zenitsu.jpg' },
    { title: 'Иноскэ Хасибира', image: 'images/anime/ds-inosuke.jpg' },
    { title: 'Гию Томиока', image: 'images/anime/ds-giyu.jpg' },
    { title: 'Тандзиро · Танец огня', image: 'images/anime/ds-finale.jpg' },
  ] },
];
export const LEVEL_GRIDS = [[3, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 8]];
export const LEVELS = ALBUMS.flatMap(album => album.characters.map((character, slot) => ({
  ...character, albumId: album.id, finale: slot === album.characters.length - 1,
  rows: LEVEL_GRIDS[slot][0],
  cols: LEVEL_GRIDS[slot][1],
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
export const PREVIEW_FADE_DURATION = 200;
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
export const HEADER_TOP_ROW_Y = 50;
export const HEADER_BOTTOM_ROW_Y = 126;
export const HEADER_TITLE_FONT_SIZE = 30;
export const HEADER_TITLE_MIN_FONT_SIZE = 22;
export const HEADER_TITLE_GAP = 24;

export const TRAY_HEIGHT = 220;
export const TRAY_PADDING = 24;
export const TRAY_SHELF_INSET = 16;
export const TRAY_SHELF_RADIUS = 24;
export const WIN_PANEL = {
  height: 280,
  titleY: 50,
  detailY: 94,
  goalY: 128,
  buttonX: 170,
  buttonY: 208,
  duration: 450,
};
export const CONFETTI = {
  count: 70,
  width: 14,
  height: 8,
  drift: 120,
  spin: 720,
  delay: 300,
  duration: { min: 1400, max: 2400 },
  gold: 0xffc94d,
};
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
  preview: 3.5,
  tray: 4,
  trayPieces: 5,
  draggedPiece: 6,
  header: 7,
  headerControls: 7.5,
  overlay: 8,
};
