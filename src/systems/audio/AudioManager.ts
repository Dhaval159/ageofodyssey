import Phaser from "phaser";
import { Logger } from "../../core/Logger";
import { VolumeSettings } from "./VolumeSettings";
import { AudioRegistry } from "./AudioRegistry";
import { MusicPlayer } from "./MusicPlayer";
import { SFXPlayer } from "./SFXPlayer";
import { AudioBus } from "../../constants/AudioConstants";

/**
 * AudioManager is the single entry point for all audio operations.
 *
 * Scenes and systems must NEVER directly call Phaser's sound API.
 * All audio playback, volume control, and mute management goes through
 * this manager.
 *
 * Architecture:
 *   AudioManager (Facade)
 *     ├── VolumeSettings (volume/mute state + persistence)
 *     ├── AudioRegistry (audio asset metadata)
 *     ├── MusicPlayer (music track playback)
 *     └── SFXPlayer (sound effect playback)
 *
 * Usage:
 *   const audio = AudioManager.getInstance();
 *   audio.initialize(scene);
 *   audio.setMusicVolume(0.5);
 *   audio.toggleMasterMute();
 *   audio.getMusicPlayer().play("music-menu-theme", { loop: true });
 *   audio.getSFXPlayer().play("sfx-ui-click");
 */
export class AudioManager {
    private static instance: AudioManager;
    private scene: Phaser.Scene | null = null;
    private volumeSettings: VolumeSettings;
    private audioRegistry: AudioRegistry;
    private musicPlayer: MusicPlayer | null = null;
    private sfxPlayer: SFXPlayer | null = null;
    private initialized: boolean = false;

    private constructor() {
        this.volumeSettings = VolumeSettings.getInstance();
        this.audioRegistry = AudioRegistry.getInstance();
    }

    public static getInstance(): AudioManager {
        if (!AudioManager.instance) {
            AudioManager.instance = new AudioManager();
        }
        return AudioManager.instance;
    }

    /**
     * Initialize the AudioManager with a Phaser scene.
     * This must be called before any playback operations.
     * Safe to call multiple times - subsequent calls will reinitialize
     * with the new scene reference.
     */
    public initialize(scene: Phaser.Scene): void {
        this.scene = scene;
        this.volumeSettings.initialize();
        this.musicPlayer = new MusicPlayer(scene);
        this.sfxPlayer = new SFXPlayer(scene);
        this.initialized = true;
        Logger.getInstance().log("AudioManager initialized");
    }

    // ── Subsystem Access ──────────────────────────────────────────────────────

    /**
     * Get the VolumeSettings instance for direct volume/mute management.
     */
    public getVolumeSettings(): VolumeSettings {
        return this.volumeSettings;
    }

    /**
     * Get the AudioRegistry instance for registering audio assets.
     */
    public getAudioRegistry(): AudioRegistry {
        return this.audioRegistry;
    }

    /**
     * Get the MusicPlayer instance for music track playback.
     */
    public getMusicPlayer(): MusicPlayer {
        this.ensureInitialized();
        return this.musicPlayer!;
    }

    /**
     * Get the SFXPlayer instance for sound effect playback.
     */
    public getSFXPlayer(): SFXPlayer {
        this.ensureInitialized();
        return this.sfxPlayer!;
    }

    // ── Convenience Volume Methods ────────────────────────────────────────────

    /**
     * Set the master volume (0.0 to 1.0).
     * Affects all audio buses proportionally.
     */
    public setMasterVolume(volume: number): void {
        this.volumeSettings.setVolume(AudioBus.MASTER, volume);
    }

    /**
     * Set the music volume (0.0 to 1.0).
     */
    public setMusicVolume(volume: number): void {
        this.volumeSettings.setVolume(AudioBus.MUSIC, volume);
    }

    /**
     * Set the SFX volume (0.0 to 1.0).
     */
    public setSFXVolume(volume: number): void {
        this.volumeSettings.setVolume(AudioBus.SFX, volume);
    }

    /**
     * Get the effective master volume.
     */
    public getMasterVolume(): number {
        return this.volumeSettings.getRawVolume(AudioBus.MASTER);
    }

    /**
     * Get the effective music volume.
     */
    public getMusicVolume(): number {
        return this.volumeSettings.getRawVolume(AudioBus.MUSIC);
    }

    /**
     * Get the effective SFX volume.
     */
    public getSFXVolume(): number {
        return this.volumeSettings.getRawVolume(AudioBus.SFX);
    }

    // ── Convenience Mute Methods ──────────────────────────────────────────────

    /**
     * Toggle master mute on/off.
     * When master is muted, all audio output is silenced.
     */
    public toggleMasterMute(): void {
        this.volumeSettings.toggleMasterMute();
    }

    /**
     * Toggle music mute on/off.
     */
    public toggleMusicMute(): void {
        this.volumeSettings.toggleMute(AudioBus.MUSIC);
    }

    /**
     * Toggle SFX mute on/off.
     */
    public toggleSFXMute(): void {
        this.volumeSettings.toggleMute(AudioBus.SFX);
    }

    /**
     * Check if master is muted.
     */
    public isMasterMuted(): boolean {
        return this.volumeSettings.isMasterMuted();
    }

    /**
     * Check if music is muted (or effectively silenced by master mute).
     */
    public isMusicMuted(): boolean {
        return this.volumeSettings.isEffectivelyMuted(AudioBus.MUSIC);
    }

    /**
     * Check if SFX is muted (or effectively silenced by master mute).
     */
    public isSFXMuted(): boolean {
        return this.volumeSettings.isEffectivelyMuted(AudioBus.SFX);
    }

    /**
     * Mute all audio (master mute).
     */
    public muteAll(): void {
        this.volumeSettings.setMasterMute(true);
    }

    /**
     * Unmute all audio (master unmute).
     */
    public unmuteAll(): void {
        this.volumeSettings.setMasterMute(false);
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    /**
     * Check if the AudioManager has been initialized.
     */
    public isInitialized(): boolean {
        return this.initialized;
    }

    /**
     * Update method called from a scene's update loop.
     * Currently reserved for future audio state management.
     */
    public update(_dt: number): void {
        // Reserved for future use:
        // - Music progress tracking
        // - Automatic crossfade scheduling
        // - Audio analysis
    }

    /**
     * Clean up all audio resources and unsubscribe from all events.
     */
    public destroy(): void {
        if (this.musicPlayer) {
            this.musicPlayer.destroy();
            this.musicPlayer = null;
        }
        if (this.sfxPlayer) {
            this.sfxPlayer.destroy();
            this.sfxPlayer = null;
        }
        this.initialized = false;
        this.scene = null;
        Logger.getInstance().log("AudioManager destroyed");
    }

    // ── Private Helpers ───────────────────────────────────────────────────────

    private ensureInitialized(): void {
        if (!this.initialized || !this.scene) {
            Logger.getInstance().warn(
                "AudioManager not initialized. Call initialize(scene) first."
            );
        }
    }
}
