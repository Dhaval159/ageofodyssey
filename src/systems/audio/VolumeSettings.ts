import { Logger } from "../../core/Logger";
import {
    AudioBus,
    DEFAULT_VOLUMES,
    IVolumeChangePayload,
    IMuteChangePayload,
} from "../../constants/AudioConstants";

/**
 * Type for volume and mute change callbacks.
 */
type VolumeChangeCallback = (payload: IVolumeChangePayload) => void;
type MuteChangeCallback = (payload: IMuteChangePayload) => void;

/**
 * VolumeSettings manages all volume levels and mute states for every audio bus.
 *
 * - Each bus (MASTER, MUSIC, SFX) has an independent volume (0.0–1.0) and mute state.
 * - Master mute overrides all other mute states.
 * - Changes are propagated immediately through registered callbacks so that
 *   MusicPlayer, SFXPlayer, and any Settings UI stay in sync.
 * - Volume levels are persisted to localStorage and restored on initialization.
 *
 * Usage:
 *   VolumeSettings.getInstance().setVolume(AudioBus.MUSIC, 0.5);
 *   VolumeSettings.getInstance().setMute(AudioBus.SFX, true);
 */
export class VolumeSettings {
    private static instance: VolumeSettings;
    private volumes: Record<AudioBus, number>;
    private mutes: Record<AudioBus, boolean>;
    private masterMuted: boolean;
    private volumeListeners: Map<AudioBus, Set<VolumeChangeCallback>>;
    private muteListeners: Map<AudioBus, Set<MuteChangeCallback>>;
    private initialized: boolean = false;

    private static readonly STORAGE_KEY = "odyssey_audio_settings";

    private constructor() {
        this.volumes = { ...DEFAULT_VOLUMES };
        this.mutes = {
            [AudioBus.MASTER]: false,
            [AudioBus.MUSIC]: false,
            [AudioBus.SFX]: false,
        };
        this.masterMuted = false;
        this.volumeListeners = new Map();
        this.muteListeners = new Map();
    }

    public static getInstance(): VolumeSettings {
        if (!VolumeSettings.instance) {
            VolumeSettings.instance = new VolumeSettings();
        }
        return VolumeSettings.instance;
    }

    /**
     * Initialize volume settings, optionally restoring saved state from localStorage.
     */
    public initialize(): void {
        if (this.initialized) return;
        this.load();
        this.initialized = true;
        Logger.getInstance().log("VolumeSettings initialized");
    }

    // ── Volume Control ────────────────────────────────────────────────────────

    /**
     * Set the volume for a specific audio bus (0.0 to 1.0).
     * Clamps the value and immediately notifies all registered listeners.
     */
    public setVolume(bus: AudioBus, value: number): void {
        const clamped = Math.max(0, Math.min(1, value));
        const previous = this.volumes[bus];
        if (Math.abs(previous - clamped) < 0.001) return;

        this.volumes[bus] = clamped;
        this.save();

        const payload: IVolumeChangePayload = { bus, previous, current: clamped };
        this.notifyVolumeListeners(bus, payload);
        Logger.getInstance().log(
            `VolumeSettings: ${bus} volume changed ${previous.toFixed(2)} -> ${clamped.toFixed(2)}`
        );
    }

    /**
     * Get the effective volume for a bus.
     * Returns 0 if the bus or master is muted.
     * Applies master volume scaling on top of the bus volume.
     */
    public getVolume(bus: AudioBus): number {
        if (this.isEffectivelyMuted(bus)) return 0;

        const masterVol = this.volumes[AudioBus.MASTER];
        const busVol = this.volumes[bus];
        return masterVol * busVol;
    }

    /**
     * Get the raw (unscaled) volume for a bus, ignoring mute state.
     */
    public getRawVolume(bus: AudioBus): number {
        return this.volumes[bus];
    }

    // ── Mute Control ──────────────────────────────────────────────────────────

    /**
     * Set the mute state for a specific audio bus.
     */
    public setMute(bus: AudioBus, muted: boolean): void {
        if (this.mutes[bus] === muted) return;

        this.mutes[bus] = muted;
        this.save();

        const payload: IMuteChangePayload = { bus, muted };
        this.notifyMuteListeners(bus, payload);
        Logger.getInstance().log(
            `VolumeSettings: ${bus} ${muted ? "muted" : "unmuted"}`
        );
    }

    /**
     * Get the mute state for a specific audio bus.
     */
    public getMute(bus: AudioBus): boolean {
        return this.mutes[bus];
    }

    /**
     * Set master mute. When master is muted, all audio output is silenced
     * regardless of individual bus mute states.
     */
    public setMasterMute(muted: boolean): void {
        if (this.masterMuted === muted) return;

        this.masterMuted = muted;
        this.save();

        // Notify all buses since master mute affects everything
        const buses = [AudioBus.MASTER, AudioBus.MUSIC, AudioBus.SFX];
        for (const bus of buses) {
            const payload: IMuteChangePayload = { bus, muted: this.masterMuted };
            this.notifyMuteListeners(bus, payload);
        }
        Logger.getInstance().log(
            `VolumeSettings: master ${muted ? "muted" : "unmuted"}`
        );
    }

    /**
     * Check if master mute is active.
     */
    public isMasterMuted(): boolean {
        return this.masterMuted;
    }

    /**
     * Toggle the master mute state.
     */
    public toggleMasterMute(): void {
        this.setMasterMute(!this.masterMuted);
    }

    /**
     * Toggle the mute state for a specific audio bus.
     */
    public toggleMute(bus: AudioBus): void {
        this.setMute(bus, !this.mutes[bus]);
    }

    /**
     * Check whether a bus is effectively muted (either by its own mute,
     * by master mute, or because volume is 0).
     */
    public isEffectivelyMuted(bus: AudioBus): boolean {
        return this.masterMuted || this.mutes[bus] || this.volumes[bus] <= 0;
    }

    // ── Event Subscriptions ───────────────────────────────────────────────────

    /**
     * Register a callback that fires whenever the volume for a bus changes.
     * Returns an unsubscribe function.
     */
    public onVolumeChanged(
        bus: AudioBus,
        callback: VolumeChangeCallback
    ): () => void {
        if (!this.volumeListeners.has(bus)) {
            this.volumeListeners.set(bus, new Set());
        }
        this.volumeListeners.get(bus)!.add(callback);

        return () => {
            this.volumeListeners.get(bus)?.delete(callback);
        };
    }

    /**
     * Register a callback that fires whenever the mute state for a bus changes.
     * Returns an unsubscribe function.
     */
    public onMuteChanged(
        bus: AudioBus,
        callback: MuteChangeCallback
    ): () => void {
        if (!this.muteListeners.has(bus)) {
            this.muteListeners.set(bus, new Set());
        }
        this.muteListeners.get(bus)!.add(callback);

        return () => {
            this.muteListeners.get(bus)?.delete(callback);
        };
    }

    // ── Persistence ────────────────────────────────────────────────────────────

    /**
     * Save the current volume and mute settings to localStorage.
     */
    public save(): void {
        try {
            const data = {
                volumes: this.volumes,
                mutes: this.mutes,
                masterMuted: this.masterMuted,
            };
            localStorage.setItem(VolumeSettings.STORAGE_KEY, JSON.stringify(data));
        } catch {
            Logger.getInstance().warn("VolumeSettings: failed to save to localStorage");
        }
    }

    /**
     * Load volume and mute settings from localStorage.
     */
    public load(): void {
        try {
            const raw = localStorage.getItem(VolumeSettings.STORAGE_KEY);
            if (!raw) return;

            const data = JSON.parse(raw) as {
                volumes?: Record<AudioBus, number>;
                mutes?: Record<AudioBus, boolean>;
                masterMuted?: boolean;
            };

            if (data.volumes) {
                for (const bus of Object.values(AudioBus)) {
                    if (typeof data.volumes[bus] === "number") {
                        this.volumes[bus] = Math.max(0, Math.min(1, data.volumes[bus]));
                    }
                }
            }

            if (data.mutes) {
                for (const bus of Object.values(AudioBus)) {
                    if (typeof data.mutes[bus] === "boolean") {
                        this.mutes[bus] = data.mutes[bus];
                    }
                }
            }

            if (typeof data.masterMuted === "boolean") {
                this.masterMuted = data.masterMuted;
            }

            Logger.getInstance().log("VolumeSettings: loaded from localStorage");
        } catch {
            Logger.getInstance().warn("VolumeSettings: failed to load from localStorage");
        }
    }

    /**
     * Reset all volumes to defaults, unmute everything, and clear saved settings.
     */
    public reset(): void {
        this.volumes = { ...DEFAULT_VOLUMES };
        this.mutes = {
            [AudioBus.MASTER]: false,
            [AudioBus.MUSIC]: false,
            [AudioBus.SFX]: false,
        };
        this.masterMuted = false;
        this.save();

        // Notify all buses
        for (const bus of Object.values(AudioBus)) {
            const volPayload: IVolumeChangePayload = {
                bus,
                previous: -1,
                current: this.volumes[bus],
            };
            this.notifyVolumeListeners(bus, volPayload);

            const mutePayload: IMuteChangePayload = { bus, muted: false };
            this.notifyMuteListeners(bus, mutePayload);
        }

        Logger.getInstance().log("VolumeSettings: reset to defaults");
    }

    // ── Internal Helpers ──────────────────────────────────────────────────────

    private notifyVolumeListeners(bus: AudioBus, payload: IVolumeChangePayload): void {
        const listeners = this.volumeListeners.get(bus);
        if (listeners) {
            listeners.forEach((cb) => {
                try {
                    cb(payload);
                } catch (error) {
                    Logger.getInstance().error(
                        `VolumeSettings: volume listener error for ${bus}:`,
                        error
                    );
                }
            });
        }
    }

    private notifyMuteListeners(bus: AudioBus, payload: IMuteChangePayload): void {
        const listeners = this.muteListeners.get(bus);
        if (listeners) {
            listeners.forEach((cb) => {
                try {
                    cb(payload);
                } catch (error) {
                    Logger.getInstance().error(
                        `VolumeSettings: mute listener error for ${bus}:`,
                        error
                    );
                }
            });
        }
    }
}
