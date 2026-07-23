import { AssetKeys } from "./AssetKeys";

export const GAME_CONFIG = {
  WIDTH: 1280,
  HEIGHT: 720,
  FPS: 60,
  PHYSICS_STEPS_PER_FRAME: 1,
  NAME: "Odyssey: The Cyclops",
  VERSION: "0.1.0",
  DEBUG_MODE: true,
  STRICT_COLLISION: true,
  GRAVITY_FORCE: 0.5,
  BACKGROUND_COLOR: "#0f0f23",
} as const;

export const UI = {
  BUTTON: {
    WIDTH: 280,
    HEIGHT: 50,
    FONT_SIZE: "22px",
    NORMAL_KEY: AssetKeys.UI_BUTTON_NORMAL,
    HOVER_KEY: AssetKeys.UI_BUTTON_HOVER,
    ACTIVE_KEY: AssetKeys.UI_BUTTON_ACTIVE,
    TEXT_COLOR: "#ffffff",
    HOVER_TEXT_COLOR: "#00ff00",
    ACTIVE_TEXT_COLOR: "#aaffaa",
    BORDER_RADIUS: 8,
    HOVER_SCALE: 1.05,
    CLICK_SCALE: 0.95,
  },
  MAIN_MENU: {
    TITLE_FONT_SIZE: "56px",
    TITLE_COLOR: "#ffd700",
    TITLE_STROKE: "#000000",
    TITLE_STROKE_THICKNESS: 6,
    BUTTON_GAP: 18,
    SUBTITLE_FONT_SIZE: "18px",
    SUBTITLE_COLOR: "#888888",
  },
  LOADING: {
    BAR_WIDTH: 400,
    BAR_HEIGHT: 24,
    FONT_SIZE: "24px",
    TEXT_COLOR: "#ffffff",
    BG_COLOR: 0x222222,
    FILL_COLOR: 0x00c800,
    PERCENT_OFFSET_Y: -40,
  },
  QUIT_BUTTON_Y_OFFSET: 40,
} as const;
