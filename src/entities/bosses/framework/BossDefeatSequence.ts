import Phaser from "phaser";
import { DialogueManager } from "../../../systems/dialogue/DialogueManager";
import { AudioManager } from "../../../systems/audio/AudioManager";
import { GameStateManager, GameState } from "../../../core/GameStateManager";
import { Logger } from "../../../core/Logger";

export interface BossDefeatSequenceConfig {
  slowMoDuration?: number;
  slowMoScale?: number;
  deathDialogueLines: Array<{ speaker: string; text: string }>;
  cameraTargetX: number;
  cameraTargetY: number;
  cameraPanDuration?: number;
  cameraZoom?: number;
  onClearExit: () => void;
  onComplete: () => void;
}

export class BossDefeatSequence {
  private scene: Phaser.Scene;
  private isRunning: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public start(config: BossDefeatSequenceConfig): void {
    if (this.isRunning) return;
    this.isRunning = true;

    Logger.getInstance().log("[BossDefeatSequence] Boss defeated sequence started");

    // Lock controls
    GameStateManager.getInstance().setState(GameState.CUTSCENE);

    // Apply slow-mo effect
    const originalPhysicsTimeScale = this.scene.physics.world.timeScale;
    const slowMoScale = config.slowMoScale ?? 3.0; // 3.0 means physics runs 3x slower
    this.scene.physics.world.timeScale = slowMoScale;

    // Slow down scene tweens
    const originalTweensTimeScale = this.scene.tweens.timeScale;
    this.scene.tweens.timeScale = 1.0 / slowMoScale;

    // White flash / slow-mo visual transition (screen shake)
    this.scene.cameras.main.shake(300, 0.008);
    this.scene.cameras.main.flash(500, 255, 255, 255);

    // Fade out music
    try {
      const audioManager = AudioManager.getInstance();
      if (audioManager.isInitialized()) {
        audioManager.getMusicPlayer().stop(2000);
      }
    } catch {}

    // End slow-mo after a short delay (in real-world time)
    const slowMoDuration = config.slowMoDuration ?? 1500;
    this.scene.time.delayedCall(slowMoDuration, () => {
      // Restore normal speed
      this.scene.physics.world.timeScale = originalPhysicsTimeScale;
      this.scene.tweens.timeScale = originalTweensTimeScale;

      // Pan to exit boulder/gateway
      this.scene.cameras.main.pan(
        config.cameraTargetX,
        config.cameraTargetY,
        config.cameraPanDuration ?? 2000,
        "Sine.easeInOut",
        false,
        (_cam: any, progress: number) => {
          if (progress === 1) {
            // Trigger death dialogue
            DialogueManager.getInstance().start({
              lines: config.deathDialogueLines,
              onEnd: () => {
                // Clear exit boulder
                config.onClearExit();

                // Wait a moment and then complete
                this.scene.time.delayedCall(1500, () => {
                  this.complete(config.onComplete);
                });
              }
            });
          }
        }
      );

      if (config.cameraZoom) {
        this.scene.cameras.main.zoomTo(config.cameraZoom, config.cameraPanDuration ?? 2000, "Sine.easeInOut");
      }
    });
  }

  private complete(onComplete: () => void): void {
    this.isRunning = false;
    Logger.getInstance().log("[BossDefeatSequence] Defeat sequence complete");
    
    // Restore gameplay state
    GameStateManager.getInstance().setState(GameState.PLAYING);
    onComplete();
  }
}
