import Phaser from "phaser";
import { AudioManager } from "../../../systems/audio/AudioManager";
import { Logger } from "../../../core/Logger";

export class BossMusicController {
  private scene: Phaser.Scene;
  private currentKey: string | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public playMusic(key: string, loop: boolean = true): void {
    try {
      const audioManager = AudioManager.getInstance();
      if (!audioManager.isInitialized()) {
        Logger.getInstance().warn("BossMusicController: AudioManager not initialized. Music skipped.");
        return;
      }

      // Check if key exists in Phaser sound cache
      if (!this.scene.cache.audio.has(key)) {
        Logger.getInstance().warn(`BossMusicController: Audio key "${key}" not found in cache. Skipping music.`);
        return;
      }

      // Register with AudioRegistry if not already present, just in case
      const registry = audioManager.getAudioRegistry();
      if (!registry.has(key)) {
        registry.register({
          key,
          category: "music" as any, // fallback category
          path: "",
          loop
        });
      }

      this.currentKey = key;
      audioManager.getMusicPlayer().play(key, { loop });
      Logger.getInstance().log(`BossMusicController: Started music track "${key}"`);
    } catch (e) {
      Logger.getInstance().error(`BossMusicController: Error playing music "${key}":`, e);
    }
  }

  public changeMusicForPhase(key: string, crossfadeDuration: number = 1500): void {
    if (this.currentKey === key) return;

    try {
      const audioManager = AudioManager.getInstance();
      if (!audioManager.isInitialized() || !this.scene.cache.audio.has(key)) {
        Logger.getInstance().warn(`BossMusicController: Cannot transition to "${key}". Skipping transition.`);
        return;
      }

      // Register with AudioRegistry if not present
      const registry = audioManager.getAudioRegistry();
      if (!registry.has(key)) {
        registry.register({
          key,
          category: "music" as any,
          path: "",
          loop: true
        });
      }

      this.currentKey = key;
      audioManager.getMusicPlayer().crossfade(key, crossfadeDuration);
      Logger.getInstance().log(`BossMusicController: Transitioned music to "${key}"`);
    } catch (e) {
      Logger.getInstance().error(`BossMusicController: Error crossfading to music "${key}":`, e);
    }
  }

  public stopMusic(fadeDuration: number = 1000): void {
    try {
      const audioManager = AudioManager.getInstance();
      if (audioManager.isInitialized()) {
        audioManager.getMusicPlayer().stop(fadeDuration);
        Logger.getInstance().log("BossMusicController: Stopped music");
      }
      this.currentKey = null;
    } catch (e) {
      Logger.getInstance().error("BossMusicController: Error stopping music:", e);
    }
  }
}
