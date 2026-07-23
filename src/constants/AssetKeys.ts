/**
 * Single source of truth for all asset keys in the project.
 * Future assets should be added here before being referenced anywhere else.
 */
export const AssetKeys = {
  UI_BUTTON_NORMAL: "btn-normal",
  UI_BUTTON_HOVER: "btn-hover",
  UI_BUTTON_ACTIVE: "btn-active",
  UI_LOADING_BG: "loading-bg",
  UI_LOADING_FILL: "loading-fill",
  IMAGE_LOGO: "logo",
  IMAGE_PARTICLE: "particle",
  SPRITE_PLAYER: "sprite-player",
  SPRITE_CYCLOPS: "sprite-cyclops",
  TILESET_DUNGEON: "tileset-dungeon",
  TILESET_CAVE: "tileset-cave",
  MUSIC_THEME: "music-theme",
  SFX_CLICK: "sfx-click",
  FONT_GREEK: "font-greek",
  EFFECT_PARTICLE: "effect-particle",
  CUTSCENE_INTRO: "cutscene-intro",
  BOSS_CYCLOPS_SPRITE: "boss-cyclops",

  // ── Music ──────────────────────────────────────────────────────────────────
  /** Menu/home screen background music */
  MUSIC_MENU_THEME: "music-menu-theme",
  /** Standard gameplay/exploration music */
  MUSIC_GAMEPLAY: "music-gameplay",
  /** Boss encounter music */
  MUSIC_BOSS: "music-boss",

  // ── SFX ───────────────────────────────────────────────────────────────────
  /** UI button click sound */
  SFX_UI_CLICK: "sfx-ui-click",
  /** UI button hover sound */
  SFX_UI_HOVER: "sfx-ui-hover",
  /** Weapon swing sound */
  SFX_COMBAT_SWING: "sfx-combat-swing",
  /** Player footstep sound */
  SFX_FOOTSTEP: "sfx-footstep",
  /** UI confirmation sound */
  SFX_UI_CONFIRM: "sfx-ui-confirm",
  /** UI cancel/back sound */
  SFX_UI_CANCEL: "sfx-ui-cancel",
  /** Damage taken sound */
  SFX_COMBAT_HIT: "sfx-combat-hit",
  /** Enemy death sound */
  SFX_COMBAT_DEATH: "sfx-combat-death",
  /** Ambient wind/environment sound */
  SFX_AMBIENT_WIND: "sfx-ambient-wind",
  /** Menu open sound */
  SFX_UI_MENU_OPEN: "sfx-ui-menu-open",
  /** Menu close sound */
  SFX_UI_MENU_CLOSE: "sfx-ui-menu-close",
} as const;

export type AssetKey = typeof AssetKeys[keyof typeof AssetKeys];
