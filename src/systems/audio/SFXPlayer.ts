import Phaser from "phaser";
import { Logger } from "../../core/Logger";
import { VolumeSettings } from "./VolumeSettings";
import { AudioRegistry } from "./AudioRegistry";
import {
    AudioBus,
    IPlaybackOptions,
    ISpatialPlaybackOptions,
} from "../../constants/AudioConstants";

/**
 * SFXPlayer handles all sound effect playback.
 *
 * Features:
 * - One-shot sound effects
 * - Spatial (positional) audio playback
 * - Volume, detune, and rate overrides
 * - Stop individual or all SFX
 * - Automatic volume updates when VolumeSettings changes
 *
 * Usage:
 *   const sfxPlayer = new SFXPlayer(scene);
 *   sfxPlayer.play("sfx-ui-click");
 *   sfxPlayer.playAt("sfx-footstep", 100, 200);
 */
export class SFXPlayer {
    private scene: Phaser.Scene;
    private volumeSettings: VolumeSettings;
    private audioRegistry: AudioRegistry;
    private activeSounds: Map<string, Phaser.Sound.BaseSound[]>;
    private unsubscribers: Array<() => void> = [];

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.volumeSettings = VolumeSettings.getInstance();
        this.audioRegistry = AudioRegistry.getInstance();
        this.activeSounds = new Map();
        this.subscribeToVolumeChanges();
    }

    /**
     * Play a one-shot sound effect by its registered audio key.
     * Returns the sound instance if successful, or undefined if the key
     * is not registered or the SFX bus is muted.
     */
    public play(key: string, options: IPlaybackOptions = {}): Phaser.Sound.BaseSound | undefined {
        if (this.volumeSettings.isEffectivelyMuted(AudioBus.SFX) && !options.volume) {
            return undefined;
        }

        const registration = this.audioRegistry.get(key);
        if (!registration) {
            Logger.getInstance().warn(`SFXPlayer: "${key}" not found in AudioRegistry`);
            return undefined;
        }

        const effectiveVolume = this.calculateVolume(options.volume);
        const soundConfig: Phaser.Types.Sound.SoundConfig = {
            volume: effectiveVolume,
            rate: options.rate ?? 1,
            detune: options.detune ?? 0,
            delay: options.delay ?? 0,
            seek: options.seek ?? 0,
            loop: options.loop ?? false,
        };

        const sound = this.scene.sound.add(key, soundConfig);
        sound.play();

        // Track active sound for potential early stopping
        this.trackSound(key, sound);

        // Auto-remove from tracking when sound completes
        sound.once("complete", () => {
            this.removeSound(key, sound);
        });

        return sound;
    }

    /**
     * Play a sound effect at a specific world position (spatial audio).
     * Uses Phaser's spatial audio features with pan/volume adjustments
     * based on distance from camera center.
     */
    public playAt(
        key: string,
        x: number,
        y: number,
        options: ISpatialPlaybackOptions = {} as ISpatialPlaybackOptions
    ): Phaser.Sound.BaseSound | undefined {
        if (this.volumeSettings.isEffectivelyMuted(AudioBus.SFX)) {
            return undefined;
        }

        const registration = this.audioRegistry.get(key);
        if (!registration) {
            Logger.getInstance().warn(`SFXPlayer: "${key}" not found in AudioRegistry`);
            return undefined;
        }

        // Calculate spatial volume based on distance from camera
        const camera = this.scene.cameras.main;
        const camCenterX = camera.scrollX + camera.width / 2;
        const camCenterY = camera.scrollY + camera.height / 2;
        const dx = x - camCenterX;
        const dy = y - camCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Volume drops off with distance (adjustable falloff)
        const maxDistance = Math.max(camera.width, camera.height) * 0.8;
        const distanceFactor = Math.max(0, 1 - distance / maxDistance);
        const distanceVolume = distanceFactor * distanceFactor; // Quadratic falloff

        const spatialOptions: IPlaybackOptions = {
            ...options,
            volume: (options.volume ?? 1) * distanceVolume,
        };

        return this.play(key, spatialOptions);
    }

    /**
     * Stop all currently playing sound effects.
     */
    public stopAll(): void {
        for (const [, sounds] of this.activeSounds) {
            for (const sound of sounds) {
                try {
                    sound.stop();
                    sound.destroy();
                } catch {
                    // Sound may already be stopped/destroyed
                }
            }
        }
        this.activeSounds.clear();
        Logger.getInstance().log("SFXPlayer: stopped all sounds");
    }

    /**
     * Stop all sound effects for a specific key.
     */
    public stopByKey(key: string): void {
        const sounds = this.activeSounds.get(key);
        if (!sounds) return;

        for (const sound of sounds) {
            try {
                sound.stop();
                sound.destroy();
            } catch {
                // Sound may already be stopped/destroyed
            }
        }
        this.activeSounds.delete(key);
        Logger.getInstance().log(`SFXPlayer: stopped all "${key}" sounds`);
    }

    /**
     * Pre-warm a sound effect by creating and immediately stopping it,
     * which forces the audio buffer to decode and reduces first-play latency.
     */
    public prewarm(key: string): void {
        if (!this.scene.cache.audio.exists(key)) {
            Logger.getInstance().warn(`SFXPlayer: cannot prewarm "${key}" - not in audio cache`);
            return;
        }

        try {
            const sound = this.scene.sound.add(key, { volume: 0, mute: true });
            sound.play();
            // Stop immediately after a very short delay
            this.scene.time.delayedCall(16, () => {
                try {
                    sound.stop();
                    sound.destroy();
                } catch {
                    // Ignore errors during cleanup
                }
            });
            Logger.getInstance().log(`SFXPlayer: prewarmed "${key}"`);
        } catch {
            Logger.getInstance().warn(`SFXPlayer: failed to prewarm "${key}"`);
        }
    }

    /**
     * Check if any sound effect for the given key is currently playing.
     */
    public isPlaying(key: string): boolean {
        const sounds = this.activeSounds.get(key);
        return sounds !== undefined && sounds.length > 0;
    }

    /**
     * Get the number of currently active sound effects.
     */
    public getActiveCount(): number {
        let count = 0;
        for (const [, sounds] of this.activeSounds) {
            count += sounds.length;
        }
        return count;
    }

    /**
     * Clean up all resources and unsubscribers.
     */
    public destroy(): void {
        this.stopAll();
        this.unsubscribeAll();
        Logger.getInstance().log("SFXPlayer: destroyed");
    }

    // ── Private Helpers ───────────────────────────────────────────────────────

    private calculateVolume(overrideVolume?: number): number {
        const busVolume = this.volumeSettings.getVolume(AudioBus.SFX);
        if (overrideVolume !== undefined) {
            return busVolume * overrideVolume;
        }
        return busVolume;
    }

    private trackSound(key: string, sound: Phaser.Sound.BaseSound): void {
        if (!this.activeSounds.has(key)) {
            this.activeSounds.set(key, []);
        }
        this.activeSounds.get(key)!.push(sound);
    }

    private removeSound(key: string, sound: Phaser.Sound.BaseSound): void {
        const sounds = this.activeSounds.get(key);
        if (!sounds) return;

        const index = sounds.indexOf(sound);
        if (index !== -1) {
            sounds.splice(index, 1);
        }

        if (sounds.length === 0) {
            this.activeSounds.delete(key);
        }
    }

    private subscribeToVolumeChanges(): void {
        const unsubVolume = this.volumeSettings.onVolumeChanged(
            AudioBus.SFX,
            () => {
                // SFX already playing will keep original volume;
                // only new SFX will use updated volume.
                // This is standard behavior for one-shot sounds.
            }
        );
        this.unsubscribers.push(unsubVolume);

        const unsubMute = this.volumeSettings.onMuteChanged(
            AudioBus.SFX,
            () => {
                // When SFX is muted, stop all active SFX
                if (this.volumeSettings.isEffectivelyMuted(AudioBus.SFX)) {
                    this.stopAll();
                }
            }
        );
        this.unsubscribers.push(unsubMute);

        const unsubMasterVolume = this.volumeSettings.onVolumeChanged(
            AudioBus.MASTER,
            () => {
                // Same as SFX bus - new sounds pick up master changes
            }
        );
        this.unsubscribers.push(unsubMasterVolume);

        const unsubMasterMute = this.volumeSettings.onMuteChanged(
            AudioBus.MASTER,
            () => {
                if (this.volumeSettings.isEffectivelyMuted(AudioBus.SFX)) {
                    this.stopAll();
                }
            }
        );
        this.unsubscribers.push(unsubMasterMute);
    }

    private unsubscribeAll(): void {
        for (const unsub of this.unsubscribers) {
            unsub();
        }
        this.unsubscribers = [];
    }
}
