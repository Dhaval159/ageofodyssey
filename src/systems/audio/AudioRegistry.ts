import { Logger } from "../../core/Logger";
import { AudioCategory, IAudioRegistration } from "../../constants/AudioConstants";

/**
 * AudioRegistry is the single source of truth for all audio asset metadata.
 * Audio assets must be registered here before they can be played through
 * MusicPlayer or SFXPlayer. This registry decouples audio key strings from
 * the playback logic, allowing new sounds to be added without modifying
 * any player code.
 *
 * Usage:
 *   AudioRegistry.getInstance().register({ key: "my-sound", category: AudioCategory.UI_SFX, path: "/audio/my-sound.ogg" });
 *   const config = AudioRegistry.getInstance().get("my-sound");
 */
export class AudioRegistry {
    private static instance: AudioRegistry;
    private registry: Map<string, IAudioRegistration>;

    private constructor() {
        this.registry = new Map<string, IAudioRegistration>();
    }

    public static getInstance(): AudioRegistry {
        if (!AudioRegistry.instance) {
            AudioRegistry.instance = new AudioRegistry();
        }
        return AudioRegistry.instance;
    }

    /**
     * Register a single audio asset.
     * Throws if a duplicate key is registered to prevent silent overwrites.
     */
    public register(config: IAudioRegistration): void {
        if (this.registry.has(config.key)) {
            Logger.getInstance().warn(
                `AudioRegistry: key "${config.key}" already registered. Overwriting.`
            );
        }
        this.registry.set(config.key, config);
        Logger.getInstance().log(
            `AudioRegistry: registered "${config.key}" (${config.category})`
        );
    }

    /**
     * Register multiple audio assets at once.
     */
    public registerMany(configs: IAudioRegistration[]): void {
        for (const config of configs) {
            this.register(config);
        }
    }

    /**
     * Get a registered audio configuration by key.
     * Returns undefined if the key has not been registered.
     */
    public get(key: string): IAudioRegistration | undefined {
        return this.registry.get(key);
    }

    /**
     * Check if a key has been registered.
     */
    public has(key: string): boolean {
        return this.registry.has(key);
    }

    /**
     * Get all registered audio assets for a specific category.
     * Useful for bulk operations like preloading all menu music.
     */
    public getByCategory(category: AudioCategory): IAudioRegistration[] {
        const results: IAudioRegistration[] = [];
        for (const config of this.registry.values()) {
            if (config.category === category) {
                results.push(config);
            }
        }
        return results;
    }

    /**
     * Get all registered keys.
     */
    public getAllKeys(): string[] {
        return Array.from(this.registry.keys());
    }

    /**
     * Get all registered configurations.
     */
    public getAll(): IAudioRegistration[] {
        return Array.from(this.registry.values());
    }

    /**
     * Remove a registered audio asset by key.
     */
    public unregister(key: string): boolean {
        const removed = this.registry.delete(key);
        if (removed) {
            Logger.getInstance().log(`AudioRegistry: unregistered "${key}"`);
        }
        return removed;
    }

    /**
     * Clear all registered audio assets.
     */
    public clear(): void {
        this.registry.clear();
        Logger.getInstance().log("AudioRegistry: cleared all registrations");
    }
}
