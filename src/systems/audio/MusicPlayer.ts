import Phaser from "phaser";
import { Logger } from "../../core/Logger";
import { VolumeSettings } from "./VolumeSettings";
import { AudioRegistry } from "./AudioRegistry";
import {
    AudioBus,
    DEFAULT_FADE_DURATION,
    CROSSFADE_DURATION,
    IPlaybackOptions,
} from "../../constants/AudioConstants";

/**
 * Interface for the current music track state.
 */
interface ICurrentTrack {
    key: string;
    sound: Phaser.Sound.BaseSound;
    config: Phaser.Types.Sound.SoundConfig;
}

/**
 * MusicPlayer handles all music track playback.
 *
 * Features:
 * - Play, stop, pause, resume music tracks
 * - Fade in / fade out transitions
 * - Crossfade between tracks
 * - Looping support
 * - Automatic volume updates when VolumeSettings changes
 *
 * Usage:
 *   const musicPlayer = new MusicPlayer(scene);
 *   musicPlayer.play("music-menu-theme", { loop: true });
 *   musicPlayer.crossfade("music-gameplay", 1000);
 */
export class MusicPlayer {
    private scene: Phaser.Scene;
    private volumeSettings: VolumeSettings;
    private audioRegistry: AudioRegistry;
    private currentTrack: ICurrentTrack | null = null;
    private isPaused: boolean = false;
    private unsubscribers: Array<() => void> = [];

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.volumeSettings = VolumeSettings.getInstance();
        this.audioRegistry = AudioRegistry.getInstance();
        this.subscribeToVolumeChanges();
    }

    /**
     * Play a music track by its registered audio key.
     * If another track is currently playing, it will be stopped first.
     */
    public play(key: string, options: IPlaybackOptions = {}): void {
        const registration = this.audioRegistry.get(key);
        if (!registration) {
            Logger.getInstance().warn(`MusicPlayer: "${key}" not found in AudioRegistry`);
            return;
        }

        // Stop current track if playing
        if (this.currentTrack) {
            this.stopCurrentTrack();
        }

        const effectiveVolume = this.calculateVolume(options.volume);
        const soundConfig: Phaser.Types.Sound.SoundConfig = {
            volume: effectiveVolume,
            loop: options.loop ?? registration.loop ?? true,
            rate: options.rate ?? 1,
            detune: options.detune ?? 0,
            seek: options.seek ?? 0,
            delay: options.delay ?? 0,
        };

        const sound = this.scene.sound.add(key, soundConfig);
        sound.play();

        this.currentTrack = {
            key,
            sound,
            config: soundConfig,
        };

        this.isPaused = false;
        Logger.getInstance().log(`MusicPlayer: playing "${key}"`);
    }

    /**
     * Stop the currently playing music track with an optional fade-out.
     */
    public stop(fadeDuration: number = DEFAULT_FADE_DURATION): void {
        if (!this.currentTrack) return;

        if (fadeDuration > 0) {
            this.fadeOut(fadeDuration).then(() => {
                this.stopCurrentTrack();
            });
        } else {
            this.stopCurrentTrack();
        }
    }

    /**
     * Pause the currently playing music track.
     */
    public pause(): void {
        if (!this.currentTrack || this.isPaused) return;

        this.currentTrack.sound.pause();
        this.isPaused = true;
        Logger.getInstance().log("MusicPlayer: paused");
    }

    /**
     * Resume the paused music track.
     */
    public resume(): void {
        if (!this.currentTrack || !this.isPaused) return;

        this.currentTrack.sound.resume();
        this.isPaused = false;
        Logger.getInstance().log("MusicPlayer: resumed");
    }

    /**
     * Fade in the current track from volume 0 to its target volume.
     */
    public async fadeIn(duration: number = DEFAULT_FADE_DURATION): Promise<void> {
        if (!this.currentTrack) return;

        const targetVolume = this.calculateVolume();
        const sound = this.currentTrack.sound as Phaser.Sound.WebAudioSound;

        sound.setVolume(0);
        return new Promise((resolve) => {
            this.scene.tweens.add({
                targets: sound,
                volume: targetVolume,
                duration,
                ease: "Linear",
                onComplete: () => {
                    resolve();
                },
            });
        });
    }

    /**
     * Fade out the current track from its current volume to 0.
     */
    public async fadeOut(duration: number = DEFAULT_FADE_DURATION): Promise<void> {
        if (!this.currentTrack) return;

        const sound = this.currentTrack.sound as Phaser.Sound.WebAudioSound;

        return new Promise((resolve) => {
            this.scene.tweens.add({
                targets: sound,
                volume: 0,
                duration,
                ease: "Linear",
                onComplete: () => {
                    resolve();
                },
            });
        });
    }

    /**
     * Crossfade from the current track to a new track.
     * Fades out the current track while fading in the new one.
     */
    public async crossfade(
        key: string,
        duration: number = CROSSFADE_DURATION
    ): Promise<void> {
        if (!this.currentTrack) {
            // No current track, just play the new one
            this.play(key);
            return;
        }

        const oldTrack = this.currentTrack;
        const oldSound = oldTrack.sound as Phaser.Sound.WebAudioSound;

        // Start the new track at volume 0
        const registration = this.audioRegistry.get(key);
        if (!registration) {
            Logger.getInstance().warn(`MusicPlayer: "${key}" not found in AudioRegistry`);
            return;
        }

        const targetVolume = this.calculateVolume();
        const newSound = this.scene.sound.add(key, {
            volume: 0,
            loop: registration.loop ?? true,
        });
        newSound.play();

        // Fade out old, fade in new simultaneously
        const halfDuration = duration / 2;

        return new Promise((resolve) => {
            this.scene.tweens.add({
                targets: oldSound,
                volume: 0,
                duration: halfDuration,
                ease: "Linear",
                onComplete: () => {
                    oldSound.stop();
                    oldSound.destroy();
                },
            });

            this.scene.tweens.add({
                targets: newSound,
                volume: targetVolume,
                duration: halfDuration,
                ease: "Linear",
                delay: halfDuration / 2,
                onComplete: () => {
                    this.currentTrack = {
                        key,
                        sound: newSound,
                        config: { volume: targetVolume, loop: registration.loop ?? true },
                    };
                    this.isPaused = false;
                    Logger.getInstance().log(
                        `MusicPlayer: crossfade complete to "${key}"`
                    );
                    resolve();
                },
            });
        });
    }

    /**
     * Set whether the current track should loop.
     */
    public setLoop(loop: boolean): void {
        if (!this.currentTrack) return;

        this.currentTrack.config.loop = loop;
        if (this.currentTrack.sound instanceof Phaser.Sound.WebAudioSound) {
            this.currentTrack.sound.setLoop(loop);
        }
    }

    /**
     * Check if a music track is currently playing.
     */
    public isPlaying(): boolean {
        return this.currentTrack !== null && !this.isPaused;
    }

    /**
     * Get the key of the currently playing track, or null if none.
     */
    public getCurrentTrackKey(): string | null {
        return this.currentTrack?.key ?? null;
    }

    /**
     * Clean up all resources and unsubscribers.
     */
    public destroy(): void {
        this.stopCurrentTrack();
        this.unsubscribeAll();
        Logger.getInstance().log("MusicPlayer: destroyed");
    }

    // ── Private Helpers ───────────────────────────────────────────────────────

    private stopCurrentTrack(): void {
        if (!this.currentTrack) return;

        try {
            this.currentTrack.sound.stop();
            this.currentTrack.sound.destroy();
        } catch {
            // Sound may already be destroyed
        }

        this.currentTrack = null;
        this.isPaused = false;
    }

    private calculateVolume(overrideVolume?: number): number {
        const busVolume = this.volumeSettings.getVolume(AudioBus.MUSIC);
        if (overrideVolume !== undefined) {
            return busVolume * overrideVolume;
        }
        return busVolume;
    }

    private subscribeToVolumeChanges(): void {
        const unsubVolume = this.volumeSettings.onVolumeChanged(
            AudioBus.MUSIC,
            () => {
                this.applyVolumeUpdate();
            }
        );
        this.unsubscribers.push(unsubVolume);

        const unsubMute = this.volumeSettings.onMuteChanged(
            AudioBus.MUSIC,
            () => {
                this.applyVolumeUpdate();
            }
        );
        this.unsubscribers.push(unsubMute);

        // Also listen to master volume/mute changes
        const unsubMasterVolume = this.volumeSettings.onVolumeChanged(
            AudioBus.MASTER,
            () => {
                this.applyVolumeUpdate();
            }
        );
        this.unsubscribers.push(unsubMasterVolume);

        const unsubMasterMute = this.volumeSettings.onMuteChanged(
            AudioBus.MASTER,
            () => {
                this.applyVolumeUpdate();
            }
        );
        this.unsubscribers.push(unsubMasterMute);
    }

    private applyVolumeUpdate(): void {
        if (!this.currentTrack) return;

        const effectiveVolume = this.calculateVolume();
        const sound = this.currentTrack.sound as Phaser.Sound.WebAudioSound;

        sound.setVolume(effectiveVolume);
    }

    private unsubscribeAll(): void {
        for (const unsub of this.unsubscribers) {
            unsub();
        }
        this.unsubscribers = [];
    }
}
