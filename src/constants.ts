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

export const TEXTURE_KEY = 'puzzle-image';
export const IMAGE_SIZE = 600;
export const GRID_SIZE = 4;
export const PIECE_SIZE = IMAGE_SIZE / GRID_SIZE;
export const SNAP_DISTANCE = 40;

export const BOARD_TOP = 110;
export const TRAY_TOP = 750;
export const TRAY_BOTTOM = 1250;