/**
 * AudioConstants defines all enums, types, and default values for the
 * Audio Management System. Audio buses control independent volume/mute,
 * and categories organize tracks for future registration.
 */

/**
 * Audio buses for independent volume and mute control.
 * Each bus can have its own volume level and mute state.
 */
export enum AudioBus {
    MASTER = "MASTER",
    MUSIC = "MUSIC",
    SFX = "SFX",
}

/**
 * Audio categories for organizing tracks by their gameplay context.
 * Used in AudioRegistry to group and retrieve related audio assets.
 */
export enum AudioCategory {
    MENU_MUSIC = "MENU_MUSIC",
    GAMEPLAY_MUSIC = "GAMEPLAY_MUSIC",
    BOSS_MUSIC = "BOSS_MUSIC",
    AMBIENT = "AMBIENT",
    UI_SFX = "UI_SFX",
    COMBAT_SFX = "COMBAT_SFX",
    FOOTSTEPS = "FOOTSTEPS",
    VOICE = "VOICE",
}

/**
 * Default volume levels for each audio bus (0.0 to 1.0).
 */
export const DEFAULT_VOLUMES: Record<AudioBus, number> = {
    [AudioBus.MASTER]: 0.8,
    [AudioBus.MUSIC]: 0.7,
    [AudioBus.SFX]: 1.0,
};

/**
 * Duration in ms for standard fade transitions.
 */
export const DEFAULT_FADE_DURATION = 500;

/**
 * Duration in ms for crossfade transitions between music tracks.
 */
export const CROSSFADE_DURATION = 1000;

/**
 * Interface for registered audio metadata.
 */
export interface IAudioRegistration {
    key: string;
    category: AudioCategory;
    path: string;
    defaultVolume?: number;
    loop?: boolean;
}

/**
 * Interface for playback options passed to MusicPlayer or SFXPlayer.
 */
export interface IPlaybackOptions {
    volume?: number;
    loop?: boolean;
    detune?: number;
    rate?: number;
    delay?: number;
    seek?: number;
}

/**
 * Interface for spatial playback options.
 */
export interface ISpatialPlaybackOptions extends IPlaybackOptions {
    x: number;
    y: number;
    pan?: number;
}

/**
 * Volume change event payload.
 */
export interface IVolumeChangePayload {
    bus: AudioBus;
    previous: number;
    current: number;
}

/**
 * Mute change event payload.
 */
export interface IMuteChangePayload {
    bus: AudioBus;
    muted: boolean;
}
